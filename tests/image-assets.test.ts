import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeImageSource,
  isSafeImageResponse,
} from "../scripts/image-assets";

test("aceita URLs HTTPS de imagens públicas", () => {
  assert.equal(isSafeImageSource("https://example.com/image.png"), true);
  assert.equal(
    isSafeImageSource("https://lh.googleusercontent.com/image.png"),
    true,
  );
});

test("bloqueia URLs não seguras ou malformadas", () => {
  assert.equal(isSafeImageSource("javascript:alert(1)"), false);
  assert.equal(isSafeImageSource("data:image/png;base64,abc"), false);
  assert.equal(isSafeImageSource("http://example.com/image.png"), false);
  assert.equal(isSafeImageSource("https://example.com\nmalicious"), false);
  assert.equal(isSafeImageSource("https://[invalid"), false);
});

test("aceita somente respostas com tipo e tamanho válidos", () => {
  assert.equal(
    isSafeImageResponse({
      status: 200,
      headers: new Headers({
        "content-type": "image/png",
        "content-length": "1048576",
      }),
      arrayBuffer: async () => new ArrayBuffer(1024),
    } satisfies Pick<Response, "status" | "headers" | "arrayBuffer">),
    true,
  );

  assert.equal(
    isSafeImageResponse({
      status: 200,
      headers: new Headers({ "content-type": "text/html" }),
      arrayBuffer: async () => new ArrayBuffer(1024),
    } satisfies Pick<Response, "status" | "headers" | "arrayBuffer">),
    false,
  );

  assert.equal(
    isSafeImageResponse({
      status: 200,
      headers: new Headers({ "content-type": "image/png" }),
      arrayBuffer: async () => new ArrayBuffer(1024),
    } satisfies Pick<Response, "status" | "headers" | "arrayBuffer">),
    true,
  );

  assert.equal(
    isSafeImageResponse({
      status: 200,
      headers: new Headers({
        "content-type": "image/png",
        "content-length": "10485761",
      }),
      arrayBuffer: async () => new ArrayBuffer(1024),
    } satisfies Pick<Response, "status" | "headers" | "arrayBuffer">),
    false,
  );
});
