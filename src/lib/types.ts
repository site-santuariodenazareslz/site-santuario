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
  href: string;
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
};

export type EventProgramEntry = {
  date: string;
  title: string;
  time: string;
  description?: string;
};

export type CardEventBlock = {
  type: "card-event";
  id?: string;
  tag?: string;
  title: string;
  text: string;
  program: EventProgramEntry[];
};

export type DonationBankDetail = {
  label: string;
  value: string;
};

export type DonationBlock = {
  type: "donation";
  eyebrow: string;
  title: string;
  quote: string;
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
  title: string;
  description: string;
  note: string;
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
  title: string;
  titleHtml?: string;
  text: string;
};

export type NewsImageBlock = {
  type: "news-image";
  image: string;
  title: string;
  imageAlt: string;
};

export type Block =
  | FragmentBlock
  | HeaderBlock
  | FooterBlock
  | HeroBlock
  | BannerCarouselBlock
  | BannerTextBlock
  | CardEventBlock
  | DonationBlock
  | MassScheduleBlock
  | NewsBannerBlock
  | NewsTextBlock
  | NewsImageBlock
  | NewsListingBlock;

export type NewsItem = {
  slug: string;
  createdAt: string;
  page: Page;
};

export type NewsListingBlock = {
  type: "news" | "all-news";
  eyebrow: string;
  title: string;
  description: string;
  allLabel: string;
  allHref: string;
  currentPage?: number;
};

export type Page = {
  title: string;
  description: string;
  blocks: Block[];
};
