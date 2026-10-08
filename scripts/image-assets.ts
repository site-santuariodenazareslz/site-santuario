import { createHash } from "node:crypto";
import { access, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { Page } from "../src/lib/types";
import { isSafeUrl } from "../src/lib/urls";

const imageDirectory = fileURLToPath(
  new URL("../public/images/", import.meta.url),
);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const maxImageBytes = 10 * 1024 * 1024;
const timeoutMs = 15_000;

export function isSafeImageSource(value: string): boolean {
  if (!isSafeUrl(value) || !value.startsWith("https://")) return false;
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.pathname.includes("\n");
  } catch {
    return false;
  }
}

export function isSafeImageResponse(
  response: Pick<Response, "status" | "headers" | "arrayBuffer">,
): boolean {
  if (response.status !== 200) return false;

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!allowedMimeTypes.has(contentType.split(";", 1)[0]?.trim() ?? "")) {
    return false;
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > maxImageBytes) {
    return false;
  }

  return true;
}

export async function prepareImageDirectory(): Promise<void> {
  await mkdir(imageDirectory, { recursive: true });
}

async function toWebp(
  source: string,
  getAccessToken?: () => Promise<string | null>,
): Promise<string> {
  if (!isSafeImageSource(source)) return source;

  const headers = new Headers();
  const token = await getAccessToken?.();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(source, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    if (!isSafeImageResponse(response)) {
      throw new Error(
        `A imagem ${source} não possui um tipo ou tamanho seguro para download.`,
      );
    }

    const input = Buffer.from(await response.arrayBuffer());
    if (input.length > maxImageBytes) {
      throw new Error(`A imagem ${source} excedeu o tamanho máximo permitido.`);
    }

    const metadata = await sharp(input).metadata();
    if (
      !metadata.format ||
      !["jpeg", "png", "webp", "gif"].includes(metadata.format)
    ) {
      throw new Error(
        `A imagem ${source} não contém um formato de imagem válido.`,
      );
    }

    const output = await sharp(input).webp({ quality: 85 }).toBuffer();
    const filename = `${createHash("sha256").update(output).digest("hex").slice(0, 16)}.webp`;
    const destination = join(imageDirectory, filename);
    try {
      await access(destination);
    } catch {
      await writeFile(destination, output);
    }
    return `/images/${filename}`;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Tempo limite excedido ao baixar a imagem ${source}.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function materializePageImages(
  page: Page,
  getAccessToken?: () => Promise<string | null>,
): Promise<Page> {
  const blocks = await Promise.all(
    page.blocks.map(async (block) => {
      if (block.type === "header" && block.logo) {
        return { ...block, logo: await toWebp(block.logo, getAccessToken) };
      }
      if (block.type === "footer" && block.logo) {
        return { ...block, logo: await toWebp(block.logo, getAccessToken) };
      }
      if (block.type === "hero" && block.image) {
        return { ...block, image: await toWebp(block.image, getAccessToken) };
      }
      if (block.type === "banner-text" && block.backgroundImage) {
        return {
          ...block,
          backgroundImage: await toWebp(block.backgroundImage, getAccessToken),
        };
      }
      if (block.type === "banner-carousel") {
        return {
          ...block,
          slides: await Promise.all(
            block.slides.map(async (slide) => ({
              ...slide,
              image: await toWebp(slide.image, getAccessToken),
            })),
          ),
        };
      }
      if (block.type === "sponsors") {
        return {
          ...block,
          sponsors: await Promise.all(
            block.sponsors.map(async (sponsor) => ({
              ...sponsor,
              image: await toWebp(sponsor.image, getAccessToken),
            })),
          ),
        };
      }
      if (block.type === "events-list") {
        return {
          ...block,
          events: await Promise.all(
            (block.events ?? []).map(async (event) => ({
              ...event,
              image: await toWebp(event.image, getAccessToken),
            })),
          ),
        };
      }
      if (block.type === "donation") {
        return {
          ...block,
          qrCode: await toWebp(block.qrCode, getAccessToken),
        };
      }
      if (block.type === "news-banner" && block.image) {
        return {
          ...block,
          image: await toWebp(block.image, getAccessToken),
        };
      }
      if (block.type === "news-image" && block.image) {
        return {
          ...block,
          image: await toWebp(block.image, getAccessToken),
        };
      }
      if (block.type === "teaser-image" && block.image) {
        return {
          ...block,
          image: await toWebp(block.image, getAccessToken),
        };
      }
      return block;
    }),
  );
  return { ...page, blocks };
}

function imagePathsFromPage(page: Page): string[] {
  return page.blocks.flatMap((block) => {
    if (block.type === "header" || block.type === "footer")
      return block.logo ? [block.logo] : [];
    if (
      block.type === "hero" ||
      block.type === "news-banner" ||
      block.type === "news-image" ||
      block.type === "teaser-image"
    )
      return [block.image];
    if (block.type === "banner-text")
      return block.backgroundImage ? [block.backgroundImage] : [];
    if (block.type === "banner-carousel")
      return block.slides.map((slide) => slide.image);
    if (block.type === "sponsors")
      return block.sponsors.map((sponsor) => sponsor.image);
    if (block.type === "events-list")
      return (block.events ?? []).map((event) => event.image);
    if (block.type === "donation") return [block.qrCode];
    return [];
  });
}

/** Remove apenas WebPs gerados pelo sincronizador que não aparecem mais no conteúdo. */
export async function removeUnusedImages(pages: Page[]): Promise<void> {
  const referenced = new Set(
    pages
      .flatMap(imagePathsFromPage)
      .map((image) => image.match(/^\/images\/([a-f0-9]{16}\.webp)$/)?.[1])
      .filter((filename): filename is string => Boolean(filename)),
  );
  const files = await readdir(imageDirectory);
  await Promise.all(
    files
      .filter(
        (filename) =>
          /^[a-f0-9]{16}\.webp$/.test(filename) && !referenced.has(filename),
      )
      .map((filename) => unlink(join(imageDirectory, filename))),
  );
}
