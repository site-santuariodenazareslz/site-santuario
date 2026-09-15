import { createHash } from "node:crypto";
import { access, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { Page } from "../src/lib/types";

const imageDirectory = fileURLToPath(
  new URL("../public/images/", import.meta.url),
);
const imageUrlPattern = /^https?:\/\//i;

export async function prepareImageDirectory(): Promise<void> {
  await mkdir(imageDirectory, { recursive: true });
}

async function toWebp(
  source: string,
  getAccessToken?: () => Promise<string | null>,
): Promise<string> {
  if (!imageUrlPattern.test(source)) return source;

  const headers = new Headers();
  const token = await getAccessToken?.();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(source, { headers });
  if (!response.ok) {
    throw new Error(
      `Não foi possível baixar a imagem ${source}: ${response.status} ${response.statusText}`,
    );
  }

  const input = Buffer.from(await response.arrayBuffer());
  const output = await sharp(input).webp({ quality: 85 }).toBuffer();
  const filename = `${createHash("sha256").update(output).digest("hex").slice(0, 16)}.webp`;
  const destination = join(imageDirectory, filename);
  try {
    await access(destination);
  } catch {
    await writeFile(destination, output);
  }
  return `/images/${filename}`;
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
      block.type === "news-image"
    )
      return [block.image];
    if (block.type === "banner-carousel")
      return block.slides.map((slide) => slide.image);
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
