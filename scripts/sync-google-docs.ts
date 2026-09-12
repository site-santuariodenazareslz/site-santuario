import "dotenv/config";
import { google } from "googleapis";
import { parseGoogleDocument } from "./google-doc-parser";
import { createGoogleAuth, getAuthAccessToken } from "./google-auth";
import {
  materializePageImages,
  prepareImageDirectory,
  removeUnusedImages,
} from "./image-assets";
import { writeFragments, writeNews, writePages } from "./content-writer";
import type { NewsItem } from "../src/lib/types";

const documentId = process.env.GOOGLE_DOCUMENT_ID;
const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!documentId && !rootFolderId) {
  throw new Error(
    "Defina GOOGLE_DRIVE_FOLDER_ID (site multipágina) ou GOOGLE_DOCUMENT_ID no arquivo .env.",
  );
}

const auth = await createGoogleAuth();
const docs = google.docs({ version: "v1", auth });
const drive = google.drive({ version: "v3", auth });
const getAccessToken = () => getAuthAccessToken(auth);

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function pageFromDocument(id: string) {
  const response = await docs.documents.get({ documentId: id });
  return materializePageImages(
    parseGoogleDocument(response.data),
    getAccessToken,
  );
}

async function childrenOf(folderId: string) {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id,name,mimeType,createdTime)",
    orderBy: "folder,name",
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return response.data.files ?? [];
}

async function pagesInFolder(folderId: string, path: string[] = []) {
  const children = await childrenOf(folderId);
  const documents = children.filter(
    (file) => file.mimeType === "application/vnd.google-apps.document",
  );
  const folders = children.filter(
    (file) =>
      file.mimeType === "application/vnd.google-apps.folder" &&
      !(
        path.length === 0 &&
        ["fragmentos", "noticias"].includes(slugify(file.name ?? ""))
      ),
  );

  if (documents.length > 1) {
    throw new Error(
      `A pasta ${path.join("/") || "(raiz)"} precisa ter no máximo um Google Doc.`,
    );
  }

  const pages = documents.length
    ? [{ path, page: await pageFromDocument(documents[0].id!) }]
    : [];
  const slugs = new Set<string>();

  for (const folder of folders) {
    const slug = slugify(folder.name ?? "");
    if (!slug)
      throw new Error(
        `A pasta ${folder.name || "(sem nome)"} não pode virar uma URL válida.`,
      );
    if (slugs.has(slug)) {
      throw new Error(
        `Duas pastas na mesma hierarquia geram o mesmo slug: ${slug}.`,
      );
    }
    slugs.add(slug);
    pages.push(...(await pagesInFolder(folder.id!, [...path, slug])));
  }

  return pages;
}

async function fragmentsInFolder(folderId: string, path: string[] = []) {
  const children = await childrenOf(folderId);
  const documents = children.filter(
    (file) => file.mimeType === "application/vnd.google-apps.document",
  );
  const folders = children.filter(
    (file) => file.mimeType === "application/vnd.google-apps.folder",
  );
  if (documents.length > 1)
    throw new Error(
      `O fragmento ${path.join("/")} possui mais de um documento.`,
    );

  const documentSlug = slugify(documents[0]?.name ?? "");
  const fragmentPath = path.length ? path : [documentSlug];
  const fragments = documents.length
    ? [{ path: fragmentPath, page: await pageFromDocument(documents[0].id!) }]
    : [];
  if (documents.length && !slugify(documents[0].name ?? "")) {
    throw new Error(
      `O documento de fragmento dentro de ${path.join("/") || "fragmentos"} precisa ter um nome válido.`,
    );
  }
  for (const folder of folders) {
    const slug = slugify(folder.name ?? "");
    if (!slug)
      throw new Error(
        `O fragmento ${folder.name || "(sem nome)"} não pode virar uma referência válida.`,
      );
    fragments.push(...(await fragmentsInFolder(folder.id!, [...path, slug])));
  }
  return fragments;
}

async function newsInFolder(folderId: string): Promise<NewsItem[]> {
  const children = await childrenOf(folderId);
  const documents = children.filter(
    (file) => file.mimeType === "application/vnd.google-apps.document",
  );
  const folders = children.filter(
    (file) => file.mimeType === "application/vnd.google-apps.folder",
  );
  const slugs = new Set<string>();
  const newsDocuments = documents.filter(
    (file) => !["noticias", "index"].includes(slugify(file.name ?? "")),
  );
  const directNews = await Promise.all(
    newsDocuments.map(async (document) => {
      const slug = slugify(document.name ?? "");
      if (!slug)
        throw new Error(
          "Toda notícia precisa ter um nome de documento válido.",
        );
      if (slugs.has(slug))
        throw new Error(`Duas notícias geram o mesmo slug: ${slug}.`);
      slugs.add(slug);
      return {
        slug,
        createdAt: document.createdTime ?? new Date(0).toISOString(),
        page: await pageFromDocument(document.id!),
      };
    }),
  );
  const nestedNews = (
    await Promise.all(folders.map((folder) => newsInFolder(folder.id!)))
  ).flat();
  const allNews = [...directNews, ...nestedNews];
  slugs.clear();
  for (const item of allNews) {
    if (slugs.has(item.slug))
      throw new Error(`Duas notícias geram o mesmo slug: ${item.slug}.`);
    slugs.add(item.slug);
  }
  return allNews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

let pages;
let fragments: Array<{
  path: string[];
  page: Awaited<ReturnType<typeof pageFromDocument>>;
}> = [];
let news: NewsItem[] = [];
await prepareImageDirectory();
if (rootFolderId) {
  const rootChildren = await childrenOf(rootFolderId);
  if (!rootChildren.length) {
    console.warn(
      "A pasta raiz do Drive está vazia ou a conta de serviço não tem acesso. Compartilhe a pasta com o e-mail da conta de serviço (Leitor).",
    );
  }
  const fragmentFolder = rootChildren.find(
    (file) =>
      file.mimeType === "application/vnd.google-apps.folder" &&
      slugify(file.name ?? "") === "fragmentos",
  );
  const newsFolder = rootChildren.find(
    (file) =>
      file.mimeType === "application/vnd.google-apps.folder" &&
      slugify(file.name ?? "") === "noticias",
  );
  pages = await pagesInFolder(rootFolderId);
  if (fragmentFolder?.id)
    fragments = await fragmentsInFolder(fragmentFolder.id);
  if (newsFolder?.id) news = await newsInFolder(newsFolder.id);
} else {
  pages = [{ path: [], page: await pageFromDocument(documentId!) }];
}

await writePages(pages);
await writeFragments(fragments);
await writeNews(news);
await removeUnusedImages([
  ...pages.map(({ page }) => page),
  ...fragments.map(({ page }) => page),
  ...news.map(({ page }) => page),
]);
console.log(`${pages.length} página(s) sincronizada(s) em src/content/pages/.`);
console.log(
  `${fragments.length} fragmento(s) sincronizado(s) em src/content/fragments/.`,
);
console.log(`${news.length} notícia(s) sincronizada(s) em src/content/news/.`);
