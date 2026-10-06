export type Cta = { label: string; href: string };

export type HeroBlock = {
  type: "hero";
  eyebrow: string;
  title: string;
  highlight: string;
  titleAfter: string;
  description: string;
  image: string;
  imageAlt: string;
  caption: string;
};

export type BannerCarouselSlide = {
  image: string;
  imageAlt: string;
  /** Exibida apenas quando preenchida. */
  category?: string;
  title: string;
  href?: string;
};

export type BannerCarouselBlock = {
  type: "banner-carousel";
  slides: BannerCarouselSlide[];
};

export type BannerTextBlock = {
  type: "banner-text";
  eyebrow: string;
  title: string;
  highlight: string;
  subtitle: string;
  date: string;
  backgroundImage?: string;
};

/** Um evento da agenda geral. Datas usam o formato YYYY-MM-DD. */
export type EventItem = {
  id: string;
  image: string;
  imageAlt: string;
  categories?: string[];
  /** Compatibilidade com o conteúdo anterior à adoção de categorias múltiplas. */
  category?: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endTime?: string;
};

export type UpcomingEventsBlock = {
  type: "upcoming-events";
  id?: string;
  allLabel: string;
  allHref: string;
  categories?: string[];
};

/** Cabeçalho reutilizável para apresentar uma seção. */
export type SectionHeaderBlock = {
  type: "section-header";
  eyebrow?: string;
  title: string;
  description?: string;
};

export type EventsListBlock = {
  type: "events-list";
  id?: string;
  /** Eventos definidos na própria tabela events-list do Google Docs. */
  events?: EventItem[];
};

export type CardEventBlock = {
  type: "card-event";
  id?: string;
  categories: string[];
  title?: string;
  text?: string;
};

export type QuoteBlock = {
  type: "quote";
  text: string;
  author?: string;
};

export type NotFoundBlock = {
  type: "not-found";
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
};

export type DonationBankDetail = {
  label: string;
  value: string;
};

export type DonationBlock = {
  type: "donation";
  pixKey: string;
  qrCode: string;
  qrCodeAlt: string;
  qrInstruction: string;
  inPersonNote: string;
  bankDetails: DonationBankDetail[];
};

export type FragmentBlock = {
  type: "fragment";
  name: string;
};

export type HeaderBlock = {
  type: "header";
  logo?: string;
  eyebrow: string;
  brand: string;
  cta: Cta;
  links: Array<{
    label: string;
    href: string;
    children?: Array<{ label: string; href: string }>;
  }>;
};

export type FooterLink = { label: string; href: string };

export type FooterContact = { icon: string; text: string };

export type FooterBlock = {
  type: "footer";
  eyebrow: string;
  brand: string;
  description: string;
  logo?: string;
  quickLinks: FooterLink[];
  services: FooterLink[];
  contacts: FooterContact[];
  officeLabel: string;
  officeHours: string;
  copyright: string;
  diocese: string;
};

export type MassScheduleEntry = {
  day: string;
  time: string;
};

export type MassScheduleGroup = {
  name: string;
  entries: MassScheduleEntry[];
};

export type MassScheduleBlock = {
  type: "mass-schedule";
  groups: MassScheduleGroup[];
};

export type NewsBannerBlock = {
  type: "news-banner";
  image: string;
  imageAlt: string;
  category: string;
};

export type NewsTextBlock = {
  type: "news-text";
  text: string;
};

export type NewsTitleBlock = {
  type: "news-title";
  title: string;
  titleHtml?: string;
};

export type NewsImageBlock = {
  type: "news-image";
  image: string;
  title: string;
  imageAlt: string;
};

export type TeaserImageBlock = {
  type: "teaser-image";
  image: string;
  imageAlt: string;
  title: string;
  text: string;
  imagePosition?: "left" | "right";
};

export type SponsorEntry = {
  category: string;
  image: string;
  name: string;
  href?: string;
};

export type SponsorsBlock = {
  type: "sponsors";
  id?: string;
  sponsors: SponsorEntry[];
};

export type Block =
  | FragmentBlock
  | HeaderBlock
  | FooterBlock
  | HeroBlock
  | BannerCarouselBlock
  | BannerTextBlock
  | SectionHeaderBlock
  | UpcomingEventsBlock
  | EventsListBlock
  | CardEventBlock
  | QuoteBlock
  | NotFoundBlock
  | DonationBlock
  | MassScheduleBlock
  | NewsBannerBlock
  | NewsTitleBlock
  | NewsTextBlock
  | NewsImageBlock
  | TeaserImageBlock
  | SponsorsBlock
  | NewsListingBlock;

export type NewsItem = {
  slug: string;
  createdAt: string;
  page: Page;
};

export type NewsListingBlock = {
  type: "news" | "all-news";
  id?: string;
  allLabel?: string;
  allHref?: string;
  currentPage?: number;
};

export type Page = {
  title: string;
  description: string;
  blocks: Block[];
};
