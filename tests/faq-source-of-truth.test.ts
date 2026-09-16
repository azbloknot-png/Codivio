import { describe, expect, it } from "vitest";
import { handleCreateFaq, handlePublicFaqs, handleUpdateFaq } from "../worker/faq";
import { hashPassword, hashToken } from "../worker/auth";
import { FakeD1, makeEnv } from "./helpers/fake-d1";

/**
 * FAQ Management Source-of-Truth Remediation. One appropriate test per
 * topic, per the project's testing rule — proves Admin FAQ Management is a
 * real source of truth for the public /faq page (GET /api/faqs), not a
 * separate, unused database. Admin CRUD authorization itself is already
 * covered structurally/by shared/faq.ts validation tests
 * (tests/phase3-finalization.test.ts); this file focuses on the new public
 * read path and the admin-write → public-read data flow.
 */

async function seedAdmin(env: ReturnType<typeof makeEnv>): Promise<string> {
  const fake = env.DB as FakeD1;
  const passwordHash = await hashPassword("correct-password");
  fake.users.push({ id: 1, email: "admin@codivio.online", password_hash: passwordHash, role: "admin", status: "active" });
  const token = "test-token";
  const tokenHash = await hashToken(token);
  fake.sessions.push({ id: tokenHash, user_id: 1, expires_at: new Date(Date.now() + 3_600_000).toISOString() });
  return token;
}

function publicFaqs(env: ReturnType<typeof makeEnv>, language: string): Promise<Response> {
  return handlePublicFaqs(new Request(`http://localhost/api/faqs?language=${language}`), env);
}

function createFaq(env: ReturnType<typeof makeEnv>, token: string, body: unknown): Promise<Response> {
  return handleCreateFaq(
    new Request("http://localhost/api/admin/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `codivio_session=${token}` },
      body: JSON.stringify(body),
    }),
    env
  );
}

function updateFaq(env: ReturnType<typeof makeEnv>, token: string, id: number, body: unknown): Promise<Response> {
  return handleUpdateFaq(
    new Request(`http://localhost/api/admin/faqs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: `codivio_session=${token}` },
      body: JSON.stringify(body),
    }),
    env,
    String(id)
  );
}

const BASE_FAQ = { scope: "global", language: "en", question: "Q1", answer: "A1", status: "active", sortOrder: 0 };

describe("GET /api/faqs reads only active, global records for the requested language", () => {
  it("returns an active global FAQ and excludes an inactive one", async () => {
    const env = makeEnv();
    const token = await seedAdmin(env);
    const active = await createFaq(env, token, { ...BASE_FAQ, question: "Active Q", answer: "Active A" });
    expect(active.status).toBe(201);
    const inactiveCreate = await createFaq(env, token, {
      ...BASE_FAQ,
      question: "Inactive Q",
      answer: "Inactive A",
      status: "inactive",
    });
    expect(inactiveCreate.status).toBe(201);

    const response = await publicFaqs(env, "en");
    expect(response.status).toBe(200);
    const data = (await response.json()) as { faqs: { question: string; answer: string }[] };
    const questions = data.faqs.map((f) => f.question);
    expect(questions).toContain("Active Q");
    expect(questions).not.toContain("Inactive Q");
  });
});

describe("GET /api/faqs never exposes admin-only fields", () => {
  it("a returned FAQ item has only question and answer, no id/status/audit fields", async () => {
    const env = makeEnv();
    const token = await seedAdmin(env);
    await createFaq(env, token, BASE_FAQ);

    const response = await publicFaqs(env, "en");
    const data = (await response.json()) as { faqs: Record<string, unknown>[] };
    expect(data.faqs.length).toBeGreaterThan(0);
    for (const faq of data.faqs) {
      expect(Object.keys(faq).sort()).toEqual(["answer", "question"]);
    }
  });
});

describe("GET /api/faqs filters by language", () => {
  it("an AZ-language FAQ does not appear when requesting EN, and vice versa", async () => {
    const env = makeEnv();
    const token = await seedAdmin(env);
    await createFaq(env, token, { ...BASE_FAQ, language: "en", question: "English question", answer: "A" });
    await createFaq(env, token, { ...BASE_FAQ, language: "az", question: "Azerbaijani question", answer: "A" });

    const enResponse = await publicFaqs(env, "en");
    const enData = (await enResponse.json()) as { faqs: { question: string }[] };
    expect(enData.faqs.map((f) => f.question)).toEqual(["English question"]);

    const azResponse = await publicFaqs(env, "az");
    const azData = (await azResponse.json()) as { faqs: { question: string }[] };
    expect(azData.faqs.map((f) => f.question)).toEqual(["Azerbaijani question"]);
  });
});

describe("GET /api/faqs orders by sort_order", () => {
  it("reordering two FAQs (via sortOrder) changes the returned order", async () => {
    const env = makeEnv();
    const token = await seedAdmin(env);
    const first = await createFaq(env, token, { ...BASE_FAQ, question: "First", answer: "A", sortOrder: 0 });
    const second = await createFaq(env, token, { ...BASE_FAQ, question: "Second", answer: "A", sortOrder: 1 });
    const firstId = ((await first.json()) as { faq: { id: number } }).faq.id;
    const secondId = ((await second.json()) as { faq: { id: number } }).faq.id;

    const before = (await (await publicFaqs(env, "en")).json()) as { faqs: { question: string }[] };
    expect(before.faqs.map((f) => f.question)).toEqual(["First", "Second"]);

    // Swap sort order via Admin — the same PATCH endpoint the Admin UI uses.
    await updateFaq(env, token, firstId, { sortOrder: 5 });
    await updateFaq(env, token, secondId, { sortOrder: 0 });

    const after = (await (await publicFaqs(env, "en")).json()) as { faqs: { question: string }[] };
    expect(after.faqs.map((f) => f.question)).toEqual(["Second", "First"]);
  });
});

describe("Admin changes flow through to the public data path", () => {
  it("create makes a FAQ public; edit changes its content; setting it inactive removes it", async () => {
    const env = makeEnv();
    const token = await seedAdmin(env);

    const created = await createFaq(env, token, { ...BASE_FAQ, question: "Original question", answer: "Original answer" });
    const id = ((await created.json()) as { faq: { id: number } }).faq.id;

    let publicData = (await (await publicFaqs(env, "en")).json()) as { faqs: { question: string; answer: string }[] };
    expect(publicData.faqs).toEqual([{ question: "Original question", answer: "Original answer" }]);

    await updateFaq(env, token, id, { question: "Edited question", answer: "Edited answer" });
    publicData = (await (await publicFaqs(env, "en")).json()) as { faqs: { question: string; answer: string }[] };
    expect(publicData.faqs).toEqual([{ question: "Edited question", answer: "Edited answer" }]);

    await updateFaq(env, token, id, { status: "inactive" });
    publicData = (await (await publicFaqs(env, "en")).json()) as { faqs: { question: string; answer: string }[] };
    expect(publicData.faqs).toEqual([]);
  });
});

describe("GET /api/faqs rejects a missing/invalid language rather than guessing one", () => {
  it("returns 400 with no language and with an unsupported language", async () => {
    const env = makeEnv();
    expect((await handlePublicFaqs(new Request("http://localhost/api/faqs"), env)).status).toBe(400);
    expect((await handlePublicFaqs(new Request("http://localhost/api/faqs?language=de"), env)).status).toBe(400);
  });
});
