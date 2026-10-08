import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtml } from "../scripts/sanitization";

test("preserva HTML legítimo gerado pelo parser", () => {
  const result = sanitizeHtml(
    "<p><strong>Texto</strong> com <em>ênfase</em>.</p><ul><li>Item</li></ul>",
  );

  assert.equal(
    result,
    "<p><strong>Texto</strong> com <em>ênfase</em>.</p><ul><li>Item</li></ul>",
  );
});

test("remove scripts e event handlers", () => {
  const result = sanitizeHtml(
    '<script>alert("x")</script><p onclick="alert(1)">Texto</p>',
  );

  assert.equal(result, "<p>Texto</p>");
});

test("remove event handlers em qualquer tag", () => {
  const result = sanitizeHtml(
    '<img src="/ok.webp" onerror="alert(1)" alt="Ok" />',
  );

  assert.equal(result, '<img src="/ok.webp" alt="Ok">');
});

test("bloqueia URLs javascript e vbscript", () => {
  assert.equal(
    sanitizeHtml('<a href="javascript:alert(1)">link</a>'),
    "<a>link</a>",
  );
  assert.equal(
    sanitizeHtml('<a href="vbscript:msgbox(1)">link</a>'),
    "<a>link</a>",
  );
});

test("preserva links externos legítimos e remove outros atributos", () => {
  const result = sanitizeHtml(
    '<a href="https://example.com" target="_blank" data-role="admin">Visitar</a>',
  );

  assert.equal(
    result,
    '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Visitar</a>',
  );
});

test("preserva imagens legítimas e remove atributos não permitidos", () => {
  const result = sanitizeHtml(
    '<img src="/images/ok.webp" alt="Imagem segura" width="320" height="200" onload="alert(1)" />',
  );

  assert.equal(
    result,
    '<img src="/images/ok.webp" alt="Imagem segura" width="320" height="200">',
  );
});

test("remove HTML inesperado", () => {
  const result = sanitizeHtml(
    '<div><svg><script>alert(1)</script></svg><iframe src="https://evil.test"></iframe><p>OK</p></div>',
  );

  assert.equal(result, "<p>OK</p>");
});
