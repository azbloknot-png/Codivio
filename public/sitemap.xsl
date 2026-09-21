<?xml version="1.0" encoding="UTF-8"?>
<!--
  Codivio sitemap.xsl — Phase 3.18 follow-up (XSLT visual layer).

  Purely a presentational transform, applied client-side by a browser that
  opens https://codivio.online/sitemap.xml directly. It does not change what
  search engines see: crawlers read the underlying urlset/url XML exactly
  as before (see public/sitemap.xml's own header comment) and ignore the
  <?xml-stylesheet?> processing instruction entirely — this is the same
  technique major CMS sitemap generators (e.g. Yoast) already use, and it
  does not turn sitemap.xml into an HTML file: the served resource is still
  the same valid XML document, this file only tells a browser how to render
  it visually.

  CSS lives in a separate local file (public/sitemap.css), referenced below
  via a link tag, deliberately not an inline style block:
  worker/security-headers.ts's site-wide CSP sets `style-src 'self'` with no
  `'unsafe-inline'`, and every response (including this one) goes through
  that same policy. An inline style element would be silently blocked by
  it; a same-origin stylesheet link tag is already permitted by
  `style-src 'self'`, so this renders correctly with no CSP change at all —
  per CLAUDE.md's Change Control rule, security is never weakened for a
  single feature's convenience.

  No JavaScript, no external CDN — matches CLAUDE.md's "no arbitrary remote
  scripts" rule and this project's local-processing-first default.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes" omit-xml-declaration="yes"/>

  <xsl:template match="/">
    <xsl:text disable-output-escaping="yes">&lt;!DOCTYPE html&gt;</xsl:text>
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Codivio XML Sitemap</title>
        <link rel="stylesheet" href="/sitemap.css"/>
      </head>
      <body>
        <a class="xsl-skip-link" href="#xsl-main">Skip to sitemap URLs</a>
        <header class="xsl-header">
          <div class="xsl-wrap">
            <span class="xsl-badge">XML Sitemap</span>
            <h1>Codivio XML Sitemap</h1>
            <p>
              This is the machine-readable sitemap Codivio publishes for search
              engines. You are viewing a human-friendly rendering of the exact
              same file crawlers read.
            </p>
            <div class="xsl-stats">
              <div class="xsl-stat">
                <span class="xsl-stat-n"><xsl:value-of select="count(/sm:urlset/sm:url)"/></span>
                <span class="xsl-stat-l">Total URLs</span>
              </div>
            </div>
          </div>
        </header>
        <main id="xsl-main">
          <div class="xsl-wrap">
            <p class="xsl-note">
              Looking for a browsable directory instead? Visit the
              <a href="https://codivio.online/sitemap">Codivio Site Map</a> page.
              This file follows the
              <a href="https://www.sitemaps.org/protocol.html">sitemaps.org protocol</a>
              and is referenced from
              <a href="https://codivio.online/robots.txt">robots.txt</a>.
            </p>
            <div class="xsl-table-wrap">
              <table>
                <caption class="xsl-visually-hidden">All URLs listed in Codivio's XML sitemap</caption>
                <thead>
                  <tr>
                    <th scope="col">URL</th>
                    <th scope="col">Change Frequency</th>
                    <th scope="col">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="/sm:urlset/sm:url">
                    <tr>
                      <td class="xsl-loc" data-label="URL">
                        <a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a>
                      </td>
                      <td data-label="Change Frequency">
                        <span class="xsl-pill"><xsl:value-of select="sm:changefreq"/></span>
                      </td>
                      <td class="xsl-priority" data-label="Priority">
                        <xsl:value-of select="sm:priority"/>
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </div>
          </div>
        </main>
        <footer>
          <div class="xsl-wrap">
            <p>Codivio — <a href="https://codivio.online/">codivio.online</a></p>
          </div>
        </footer>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
