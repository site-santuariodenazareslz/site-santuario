import type {
  NewsBannerBlock,
  NewsItem,
  NewsTextBlock,
  NewsTitleBlock,
} from "./types";

export type NewsSummary = {
  slug: string;
  createdAt: string;
  image: string;
  imageAlt: string;
  category: string;
  title: string;
  excerpt: string;
};

export function getAdjacentNews(
  items: NewsSummary[],
  currentSlug: string,
): { previous?: NewsSummary; next?: NewsSummary } {
  const ordered = [...items].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const currentIndex = ordered.findIndex((item) => item.slug === currentSlug);

  if (currentIndex < 0) return {};
  const previous = ordered[currentIndex + 1];
  const next = currentIndex > 0 ? ordered[currentIndex - 1] : undefined;
  return {
    ...(previous ? { previous } : {}),
    ...(next ? { next } : {}),
  };
}

export function summarizeNews(item: NewsItem): NewsSummary {
  const banner = item.page.blocks.find(
    (block): block is NewsBannerBlock => block.type === "news-banner",
  );
  const text = item.page.blocks.find(
    (block): block is NewsTextBlock => block.type === "news-text",
  );
  const title = item.page.blocks.find(
    (block): block is NewsTitleBlock => block.type === "news-title",
  );
  // Compatibilidade para notícias geradas antes da separação dos blocks.
  const legacyText = text as (NewsTextBlock & { title?: string }) | undefined;
  const newsTitle = title?.title ?? legacyText?.title ?? "";
  if (!banner || !newsTitle)
    throw new Error(
      `A notícia "${item.slug}" precisa de um banner e um title.`,
    );
  return {
    slug: item.slug,
    createdAt: item.createdAt,
    image: banner.image,
    imageAlt: banner.imageAlt || newsTitle,
    category: banner.category,
    title: newsTitle,
    excerpt: (text?.text ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

export function formatNewsDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(value))
    .replace(".", "");
}
