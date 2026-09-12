# CODIVIO SECURITY BASELINE

## Mandatory Checks

### Secrets
- no API keys in source
- no passwords in source
- no OAuth secrets in source
- no Cloudflare tokens in source
- `.env` ignored
- `.env.example` contains placeholders only

### Code
Search for:
- eval(
- new Function(
- dangerous innerHTML
- arbitrary script injection
- unsafe redirects
- unvalidated URLs

### Dependencies
Run:
npm audit

Review new dependencies before installation.

### Build
Run:
npm run typecheck
npm test
npm run build

Only report commands as passed if actually executed.

### Backend
Verify:
- authentication
- authorization
- RBAC
- validation
- rate limiting
- CORS
- secure sessions
- SQL parameterization

### Uploads
Verify:
- file type
- size limit
- safe names
- temporary-file cleanup
- no execution of uploads

### Admin
Verify:
- protected routes
- role checks server-side
- audit logging
- sensitive actions protected

### Production
Verify:
- HTTPS
- security headers
- CSP
- no debug secrets/logs
- Cloudflare secrets
- least-privilege bindings

## Security Severity

CRITICAL — secret exposure, auth bypass, remote code execution, SQL injection
HIGH — stored XSS, privilege escalation, unsafe upload execution
MEDIUM — CSRF, missing rate limit on sensitive endpoint, information leakage
LOW — hardening/documentation issues

Critical/High issues block release.
