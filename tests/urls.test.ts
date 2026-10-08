import assert from "node:assert/strict";
import test from "node:test";
import { isSafeUrl } from "../src/lib/urls";

test("aceita URLs internas e externas públicas", () => {
  assert.equal(isSafeUrl("/noticias/"), true);
  assert.equal(isSafeUrl("https://example.com/caminho"), true);
  assert.equal(isSafeUrl("mailto:contato@example.com"), true);
  assert.equal(isSafeUrl("tel:+5511999999999"), true);
  assert.equal(isSafeUrl("#dizimo"), true);
});

test("bloqueia protocolos inseguros e URLs malformadas", () => {
  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("vbscript:msgbox(1)"), false);
  assert.equal(isSafeUrl("data:text/html,<script>"), false);
  assert.equal(isSafeUrl("http://example.com"), false);
  assert.equal(isSafeUrl("https://example.com\njavascript:alert(1)"), false);
  assert.equal(isSafeUrl("https://example.com\u0000"), false);
  assert.equal(isSafeUrl("https://[invalid"), false);
});

test("bloqueia URLs com host privado ou não resolvido", () => {
  assert.equal(isSafeUrl("http://localhost/"), false);
  assert.equal(isSafeUrl("http://127.0.0.1/"), false);
  assert.equal(isSafeUrl("http://[::1]/"), false);
  assert.equal(isSafeUrl("https://10.0.0.1/"), false);
  assert.equal(isSafeUrl("https://192.168.1.10/"), false);
  assert.equal(isSafeUrl("https://172.16.0.1/"), false);
});
