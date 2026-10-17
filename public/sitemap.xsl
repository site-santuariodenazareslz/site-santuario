<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  <xsl:template match="/">
    <html lang="pt-BR">
      <head>
        <title>Sitemap XML - Santuário Nossa Senhora de Nazaré</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1f2937;
            background-color: #f9fafb;
            padding: 2rem 1rem;
          }
          .container {
            max-width: 1024px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            border: 1px solid #e5e7eb;
          }
          h1 {
            font-size: 1.75rem;
            color: #111827;
            margin-bottom: 0.5rem;
            font-weight: 700;
          }
          p.desc {
            color: #6b7280;
            font-size: 0.95rem;
            margin-bottom: 1.5rem;
            line-height: 1.5;
          }
          .stats {
            display: inline-block;
            background: #f3f4f6;
            color: #374151;
            padding: 0.4rem 0.8rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 1.5rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            font-size: 0.9rem;
          }
          thead th {
            background-color: #f9fafb;
            color: #4b5563;
            font-weight: 600;
            padding: 0.75rem 1rem;
            border-bottom: 2px solid #e5e7eb;
          }
          tbody tr {
            border-bottom: 1px solid #e5e7eb;
            transition: background-color 0.15s ease;
          }
          tbody tr:hover {
            background-color: #f8fafc;
          }
          tbody td {
            padding: 0.75rem 1rem;
            vertical-align: middle;
            word-break: break-all;
          }
          a {
            color: #2563eb;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .badge {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            font-size: 0.75rem;
            background: #eff6ff;
            color: #1d4ed8;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <xsl:choose>
            <!-- SITEMAP INDEX -->
            <xsl:when test="sitemap:sitemapindex">
              <h1>Índice de Sitemaps (Sitemap Index)</h1>
              <p class="desc">Este arquivo é um índice que agrupa os sitemaps XML gerados para o <strong>Santuário Nossa Senhora de Nazaré</strong>.</p>
              <div class="stats">
                Total de sitemaps: <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Sitemap</th>
                    <xsl:if test="sitemap:sitemapindex/sitemap:sitemap/sitemap:lastmod">
                      <th>Última modificação</th>
                    </xsl:if>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                    <tr>
                      <td>
                        <xsl:variable name="sitemapUrl"><xsl:value-of select="sitemap:loc"/></xsl:variable>
                        <a href="{$sitemapUrl}"><xsl:value-of select="sitemap:loc"/></a>
                      </td>
                      <xsl:if test="../sitemap:sitemap/sitemap:lastmod">
                        <td><xsl:value-of select="sitemap:lastmod"/></td>
                      </xsl:if>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:when>
            <!-- URLSET (SITEMAP COM AS PÁGINAS) -->
            <xsl:otherwise>
              <h1>Mapa do Site (XML Sitemap)</h1>
              <p class="desc">Lista de páginas públicas indexáveis do <strong>Santuário Nossa Senhora de Nazaré</strong>.</p>
              <div class="stats">
                Total de URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>URL</th>
                    <xsl:if test="sitemap:urlset/sitemap:url/sitemap:lastmod">
                      <th>Última modificação</th>
                    </xsl:if>
                    <xsl:if test="sitemap:urlset/sitemap:url/sitemap:changefreq">
                      <th>Frequência</th>
                    </xsl:if>
                    <xsl:if test="sitemap:urlset/sitemap:url/sitemap:priority">
                      <th>Prioridade</th>
                    </xsl:if>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sitemap:urlset/sitemap:url">
                    <tr>
                      <td>
                        <xsl:variable name="itemUrl"><xsl:value-of select="sitemap:loc"/></xsl:variable>
                        <a href="{$itemUrl}"><xsl:value-of select="sitemap:loc"/></a>
                      </td>
                      <xsl:if test="../sitemap:url/sitemap:lastmod">
                        <td><xsl:value-of select="sitemap:lastmod"/></td>
                      </xsl:if>
                      <xsl:if test="../sitemap:url/sitemap:changefreq">
                        <td><span class="badge"><xsl:value-of select="sitemap:changefreq"/></span></td>
                      </xsl:if>
                      <xsl:if test="../sitemap:url/sitemap:priority">
                        <td><xsl:value-of select="sitemap:priority"/></td>
                      </xsl:if>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:otherwise>
          </xsl:choose>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

