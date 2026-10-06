import type { Block, Page } from "../src/lib/types";

export type GoogleDocument = {
  title?: string | null;
  body?: { content?: StructuralElement[] | null } | null;
  inlineObjects?: Record<string, InlineObject> | null;
};

type InlineObject = {
  inlineObjectProperties?: {
    embeddedObject?: {
      imageProperties?: { contentUri?: string | null } | null;
    } | null;
  } | null;
};

export type StructuralElement = {
  paragraph?: {
    elements?: Array<{
      textRun?: {
        content?: string | null;
        textStyle?: { bold?: boolean | null; italic?: boolean | null } | null;
      } | null;
      inlineObjectElement?: { inlineObjectId?: string | null } | null;
    }> | null;
    bullet?: unknown;
  } | null;
  inlineObjectElement?: { inlineObjectId?: string | null } | null;
  table?: {
    tableRows?: Array<{
      tableCells?: Array<{ content?: StructuralElement[] | null }> | null;
    }> | null;
  } | null;
};

const clean = (value = "") =>
  value.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const categoriesFrom = (value: string) => [
  ...new Set(
    value
      .split(/[,;|\n]/)
      .map((category) => category.replace(/^[•*-]\s*/, "").trim())
      .filter(Boolean),
  ),
];

const normalizeEventTime = (value: string): string | undefined => {
  const match = value.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  if (hour > 23) return undefined;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type ParsedCell = {
  text: string;
  rawText: string;
  html: string;
  image?: string;
};

function cellFromContent(
  content: StructuralElement[] | null | undefined,
  inlineObjects: GoogleDocument["inlineObjects"],
): ParsedCell {
  let text = "";
  let rawText = "";
  let html = "";
  let image: string | undefined;
  let isInList = false;
  for (const element of content ?? []) {
    const parts = element.paragraph?.elements ?? [];
    const isBullet = Boolean(element.paragraph?.bullet);
    if (isBullet) {
      rawText += "• ";
      if (!isInList) html += "<ul>";
      isInList = true;
    } else if (isInList) {
      html += "</ul>";
      isInList = false;
    }
    let paragraphHtml = "";
    for (const part of parts) {
      const value = part.textRun?.content ?? "";
      text += value;
      rawText += value;
      if (value) {
        const style = part.textRun?.textStyle;
        const formatted = escapeHtml(
          isBullet ? value.replace(/\n+$/, "") : value,
        );
        paragraphHtml +=
          style?.bold && style?.italic
            ? `<strong><em>${formatted}</em></strong>`
            : style?.bold
              ? `<strong>${formatted}</strong>`
              : style?.italic
                ? `<em>${formatted}</em>`
                : formatted;
      }
    }
    const objectId = parts.find((part) => part.inlineObjectElement)
      ?.inlineObjectElement?.inlineObjectId;
    const contentUri = objectId
      ? inlineObjects?.[objectId]?.inlineObjectProperties?.embeddedObject
          ?.imageProperties?.contentUri
      : undefined;
    if (contentUri) image = contentUri;
    html += isBullet
      ? `<li>${paragraphHtml.replace(/\n+$/, "")}</li>`
      : paragraphHtml;
  }
  if (isInList) html += "</ul>";
  return { text: clean(text), rawText: cleanMultiline(rawText), html, image };
}

const cleanMultiline = (value = "") =>
  value
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

function rowsFromTable(
  element: StructuralElement,
  document: GoogleDocument,
): ParsedCell[][] {
  return (element.table?.tableRows ?? []).map((row) =>
    (row.tableCells ?? []).map((cell) =>
      cellFromContent(cell.content, document.inlineObjects),
    ),
  );
}

function firstValue(row: ParsedCell[] | undefined): string {
  return row?.find((cell) => cell.text)?.text ?? "";
}

/** Linhas iniciadas com # servem como cabeçalhos/anotações no Google Docs. */
function isEditorialNote(row: ParsedCell[] | undefined): boolean {
  return row?.[0]?.text.trimStart().startsWith("#") ?? false;
}

function blockFromRows(rows: ParsedCell[][]): Block | null {
  const blockName = firstValue(rows[0]).toLowerCase();
  const body = rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.text || cell.image))
    .filter((row) => !isEditorialNote(row));

  if (blockName === "header") {
    const settings = body[0] ?? [];
    const hasLogoCell = Boolean(
      settings[0]?.image || /^https?:\/\//i.test(settings[0]?.text ?? ""),
    );
    const logo =
      settings[0]?.image ?? (hasLogoCell ? settings[0]?.text : undefined);
    const [eyebrow = "", brand = "", ctaLabel = "", ctaHref = "#"] = (
      hasLogoCell ? settings.slice(1) : settings
    ).map((cell) => cell.text);
    const links: Array<{
      label: string;
      href: string;
      children?: Array<{ label: string; href: string }>;
    }> = [];
    for (const [kindCell, labelCell, hrefCell, childHrefCell] of body.slice(
      1,
    )) {
      const kind = kindCell?.text.toLowerCase();
      // Compatibilidade: a tabela antiga usa apenas "rótulo | URL".
      if (kind !== "link" && kind !== "dropdown" && kind !== "submenu") {
        if (kindCell?.text)
          links.push({ label: kindCell.text, href: labelCell?.text ?? "#" });
        continue;
      }
      if (kind === "link" && labelCell?.text) {
        links.push({ label: labelCell.text, href: hrefCell?.text ?? "#" });
        continue;
      }
      if (kind === "dropdown" && labelCell?.text) {
        links.push({
          label: labelCell.text,
          href: hrefCell?.text ?? "#",
          children: [],
        });
        continue;
      }
      if (kind === "submenu" && labelCell?.text && hrefCell?.text) {
        const parent = links.find((link) => link.label === labelCell.text);
        if (!parent?.children)
          throw new Error(
            `O submenu "${hrefCell.text}" precisa vir depois do dropdown "${labelCell.text}".`,
          );
        parent.children.push({
          label: hrefCell.text,
          href: childHrefCell?.text ?? "#",
        });
      }
    }
    if (!brand)
      throw new Error("O block header precisa informar o nome da marca.");
    return {
      type: "header",
      logo,
      eyebrow,
      brand,
      cta: { label: ctaLabel, href: ctaHref },
      links,
    };
  }

  if (blockName === "footer") {
    const settings = body[0] ?? [];
    const hasLogoCell = Boolean(
      settings[0]?.image || /^https?:\/\//i.test(settings[0]?.text ?? ""),
    );
    const logo =
      settings[0]?.image ?? (hasLogoCell ? settings[0]?.text : undefined);
    const [
      eyebrowCell,
      brandCell,
      descriptionCell,
      copyrightCell,
      dioceseCell,
    ] = hasLogoCell ? settings.slice(1) : settings;
    const footer = {
      type: "footer" as const,
      logo,
      eyebrow: eyebrowCell?.text ?? "",
      brand: brandCell?.text ?? "",
      description: descriptionCell?.text ?? "",
      copyright: copyrightCell?.text ?? "",
      diocese: dioceseCell?.text ?? "",
      quickLinks: [] as Array<{ label: string; href: string }>,
      services: [] as Array<{ label: string; href: string }>,
      contacts: [] as Array<{ icon: string; text: string }>,
      officeLabel: "",
      officeHours: "",
    };
    for (const [kindCell, valueCell, hrefCell] of body.slice(1)) {
      const kind = kindCell?.text.toLowerCase();
      const value = valueCell?.text ?? "";
      if (kind === "quick")
        footer.quickLinks.push({ label: value, href: hrefCell?.text ?? "#" });
      if (kind === "service")
        footer.services.push({ label: value, href: hrefCell?.text ?? "#" });
      if (kind === "contact")
        footer.contacts.push({
          icon: value,
          text: hrefCell?.rawText ?? hrefCell?.text ?? "",
        });
      if (kind === "office") {
        footer.officeLabel = value;
        footer.officeHours = hrefCell?.rawText ?? hrefCell?.text ?? "";
      }
    }
    if (!footer.brand)
      throw new Error("O block footer precisa informar o nome da marca.");
    return footer;
  }

  if (blockName === "hero") {
    const [
      eyebrowCell,
      titleCell,
      highlightCell,
      titleAfterCell,
      descriptionCell,
      imageCell,
      imageAltCell,
      captionCell,
    ] = body[0] ?? [];
    const eyebrow = eyebrowCell?.text ?? "";
    const title = titleCell?.text ?? "";
    const highlight = highlightCell?.text ?? "";
    const titleAfter = titleAfterCell?.text ?? "";
    const description = descriptionCell?.text ?? "";
    const image = imageCell?.image ?? imageCell?.text ?? "";
    if (!title || !description || !image) {
      throw new Error(
        "O block hero precisa informar título, descrição e imagem.",
      );
    }
    return {
      type: "hero",
      eyebrow,
      title,
      highlight,
      titleAfter,
      description,
      image,
      imageAlt: imageAltCell?.text ?? "",
      caption: captionCell?.text ?? "",
    };
  }

  if (blockName === "banner-carousel" || blockName === "carousel") {
    const slides = body
      .map(([imageCell, imageAltCell, categoryCell, titleCell, hrefCell]) => ({
        image: imageCell?.image ?? imageCell?.text ?? "",
        imageAlt: imageAltCell?.text ?? "",
        category: categoryCell?.text ?? "",
        title: titleCell?.text ?? "",
        href: hrefCell?.text.trim() || undefined,
      }))
      .filter((slide) => slide.image || slide.title);

    if (
      !slides.length ||
      slides.some((slide) => !slide.image || !slide.title)
    ) {
      throw new Error(
        "O block banner-carousel precisa informar imagem e título para cada slide.",
      );
    }
    return { type: "banner-carousel", slides };
  }

  if (
    blockName === "sponsors" ||
    blockName === "supporters" ||
    blockName === "apoiadores"
  ) {
    const firstRow = body[0] ?? [];
    const hasIdRow = Boolean(
      firstRow[0]?.text &&
      firstRow.slice(1).every((cell) => !cell?.text && !cell?.image),
    );
    const id = hasIdRow ? firstRow[0].text : undefined;
    const sponsorRows = hasIdRow ? body.slice(1) : body;
    const sponsors = sponsorRows.map(
      ([categoryCell, imageCell, nameCell, hrefCell]) => ({
        category: categoryCell?.text ?? "",
        image: imageCell?.image ?? imageCell?.text ?? "",
        name: nameCell?.text ?? "",
        href: hrefCell?.text.trim() || undefined,
      }),
    );

    if (
      !sponsors.length ||
      sponsors.some(
        (sponsor) => !sponsor.category || !sponsor.image || !sponsor.name,
      )
    ) {
      throw new Error(
        "O block sponsors precisa informar categoria, logo e nome para cada apoiador.",
      );
    }
    return { type: "sponsors", id, sponsors };
  }

  if (
    blockName === "donation" ||
    blockName === "doacao" ||
    blockName === "doação"
  ) {
    const [
      pixKeyCell,
      qrCodeCell,
      qrCodeAltCell,
      qrInstructionCell,
      inPersonNoteCell,
    ] = body[0] ?? [];
    const qrCode = qrCodeCell?.image ?? qrCodeCell?.text ?? "";
    const bankDetails = body
      .slice(1)
      .map(([labelCell, valueCell]) => ({
        label: labelCell?.text ?? "",
        value: valueCell?.text ?? "",
      }))
      .filter((detail) => detail.label && detail.value);

    if (!pixKeyCell?.text || !qrCode) {
      throw new Error(
        "O block donation precisa informar chave Pix e a imagem do QR Code.",
      );
    }
    return {
      type: "donation",
      pixKey: pixKeyCell.text,
      qrCode,
      qrCodeAlt: qrCodeAltCell?.text ?? "QR Code Pix",
      qrInstruction:
        qrInstructionCell?.text ??
        "Aponte a câmera do celular para o QR Code acima.",
      inPersonNote: inPersonNoteCell?.text ?? "",
      bankDetails,
    };
  }

  if (blockName === "mass-schedule" || blockName === "missas") {
    const entries = body
      .map(([groupCell, dayCell, timeCell]) => ({
        group: groupCell?.text ?? "",
        day: dayCell?.text ?? "",
        time: timeCell?.text ?? "",
      }))
      .filter((entry) => entry.group && entry.day && entry.time);
    const groups = entries.reduce<
      Array<{ name: string; entries: Array<{ day: string; time: string }> }>
    >((result, entry) => {
      const group = result.find((item) => item.name === entry.group);
      if (group) group.entries.push({ day: entry.day, time: entry.time });
      else
        result.push({
          name: entry.group,
          entries: [{ day: entry.day, time: entry.time }],
        });
      return result;
    }, []);
    if (!entries.length) {
      throw new Error(
        "O block mass-schedule precisa informar pelo menos um horário.",
      );
    }
    return {
      type: "mass-schedule",
      groups,
    };
  }

  if (blockName === "banner-text") {
    const [
      firstCell,
      secondCell,
      thirdCell,
      fourthCell,
      fifthCell,
      backgroundImageCell,
    ] = body[0] ?? [];
    if (!secondCell?.text)
      throw new Error(
        "O block banner-text precisa informar pelo menos um título.",
      );
    return {
      type: "banner-text",
      eyebrow: firstCell?.text ?? "",
      title: secondCell.text,
      highlight: thirdCell?.text ?? "",
      subtitle: fourthCell?.text ?? "",
      date: fifthCell?.text ?? "",
      backgroundImage:
        backgroundImageCell?.image ?? backgroundImageCell?.text ?? undefined,
    };
  }

  if (blockName === "card-event" || blockName === "event-card") {
    if (body.length > 1) {
      throw new Error(
        "O block card-event agora seleciona eventos por categoria. Mova a programação para um block events-list.",
      );
    }
    const [idCell, categoriesCell, titleCell, textCell] = body[0] ?? [];
    const categories = categoriesFrom(
      categoriesCell?.rawText ?? categoriesCell?.text ?? "",
    );
    if (!categories.length)
      throw new Error(
        "O block card-event precisa informar ao menos uma categoria.",
      );
    return {
      type: "card-event",
      id: idCell?.text || undefined,
      categories,
      title: titleCell?.text || undefined,
      text: textCell?.html.trim() || undefined,
    };
  }

  if (blockName === "upcoming-events" || blockName === "next-events") {
    const [allLabelCell, allHrefCell, idCell, categoriesCell] = body[0] ?? [];
    const categories = categoriesFrom(
      categoriesCell?.rawText ?? categoriesCell?.text ?? "",
    );
    return {
      type: "upcoming-events",
      id: idCell?.text || undefined,
      allLabel: allLabelCell?.text ?? "Ver todos",
      allHref: allHrefCell?.text ?? "/eventos/",
      categories: categories.length ? categories : undefined,
    };
  }

  if (blockName === "events-list" || blockName === "events") {
    const [idCell] = body[0] ?? [];
    const events = body
      .slice(1)
      .map(
        ([
          imageCell,
          imageAltCell,
          categoryCell,
          eventTitleCell,
          eventDescriptionCell,
          locationCell,
          startDateCell,
          startTimeCell,
          endTimeCell,
        ]) => {
          const title = eventTitleCell?.text ?? "";
          const startDate = startDateCell?.text ?? "";
          const rawStartTime = startTimeCell?.text ?? "";
          const rawEndTime = endTimeCell?.text ?? "";
          const startTime = normalizeEventTime(rawStartTime);
          const endTime = rawEndTime
            ? normalizeEventTime(rawEndTime)
            : undefined;
          return {
            id: slugify(`${startDate}-${startTime ?? rawStartTime}-${title}`),
            image: imageCell?.image ?? imageCell?.text ?? "",
            imageAlt: imageAltCell?.text ?? "",
            categories: categoriesFrom(
              categoryCell?.rawText ?? categoryCell?.text ?? "",
            ),
            title,
            description: eventDescriptionCell?.rawText ?? "",
            location: locationCell?.rawText ?? "",
            startDate,
            startTime: startTime ?? "",
            endTime,
            hasValidEndTime: !rawEndTime || Boolean(endTime),
          };
        },
      )
      .filter(
        (event) =>
          event.image &&
          event.title &&
          event.description &&
          event.location &&
          event.hasValidEndTime &&
          /^\d{4}-\d{2}-\d{2}$/.test(event.startDate) &&
          Boolean(event.startTime),
      )
      .map(({ hasValidEndTime: _hasValidEndTime, ...event }) => event);
    return {
      type: "events-list",
      id: idCell?.text || undefined,
      events,
    };
  }

  if (
    blockName === "quote" ||
    blockName === "citation" ||
    blockName === "citacao"
  ) {
    const [textCell, authorCell] = body[0] ?? [];
    if (!textCell?.text)
      throw new Error("O block quote precisa informar o texto da citação.");
    return {
      type: "quote",
      text: textCell.html || textCell.text,
      author: authorCell?.text || undefined,
    };
  }

  if (blockName === "not-found" || blockName === "404") {
    const [
      eyebrowCell,
      titleCell,
      descriptionCell,
      actionLabelCell,
      actionHrefCell,
    ] = body[0] ?? [];
    if (!titleCell?.text || !descriptionCell?.text) {
      throw new Error("O block not-found precisa informar título e descrição.");
    }
    return {
      type: "not-found",
      eyebrow: eyebrowCell?.text ?? "Página não encontrada",
      title: titleCell.text,
      description: descriptionCell.text,
      actionLabel: actionLabelCell?.text ?? "Voltar para o início",
      actionHref: actionHrefCell?.text ?? "/",
    };
  }

  if (blockName === "banner") {
    const [imageCell, imageAltCell, categoryCell] = body[0] ?? [];
    const image = imageCell?.image ?? imageCell?.text ?? "";
    if (!image) throw new Error("O block banner precisa informar uma imagem.");
    return {
      type: "news-banner",
      image,
      imageAlt: imageAltCell?.text ?? "",
      category: categoryCell?.text ?? "",
    };
  }

  if (blockName === "title") {
    const [titleCell] = body[0] ?? [];
    if (!titleCell?.text) return null;
    return {
      type: "news-title",
      title: titleCell.text,
      titleHtml: titleCell.html || titleCell.text,
    };
  }

  if (blockName === "text") {
    const [textCell] = body[0] ?? [];
    if (!textCell?.text) return null;
    return {
      type: "news-text",
      text: textCell.html || textCell.text,
    };
  }

  if (blockName === "image") {
    const [imageCell, titleCell, imageAltCell] = body[0] ?? [];
    const image = imageCell?.image ?? imageCell?.text ?? "";
    if (!image) throw new Error("O block image precisa informar uma imagem.");
    return {
      type: "news-image",
      image,
      title: titleCell?.text ?? "",
      imageAlt: imageAltCell?.text ?? "",
    };
  }

  if (blockName === "teaser-image" || blockName === "teaser image") {
    const [imageCell, imageAltCell, titleCell, textCell, positionCell] =
      body[0] ?? [];
    const image = imageCell?.image ?? imageCell?.text ?? "";
    if (!image || !titleCell?.text || !textCell?.text) {
      throw new Error(
        "O block teaser-image precisa informar imagem, título e texto.",
      );
    }
    return {
      type: "teaser-image",
      image,
      imageAlt: imageAltCell?.text ?? "",
      title: titleCell.text,
      text: textCell.html || textCell.text,
      imagePosition: ["right", "direita"].includes(
        positionCell?.text.trim().toLowerCase() ?? "",
      )
        ? "right"
        : "left",
    };
  }

  if (blockName === "news") {
    const [allLabelCell, allHrefCell, idCell] = body[0] ?? [];
    return {
      type: "news",
      id: idCell?.text || undefined,
      allLabel: allLabelCell?.text || undefined,
      allHref: allHrefCell?.text || undefined,
    };
  }

  if (blockName === "all-news") {
    const [idCell] = body[0] ?? [];
    return { type: "all-news", id: idCell?.text || undefined };
  }

  if (blockName === "fragment" || blockName === "experience-fragment") {
    const name = firstValue(body[0]);
    if (!name)
      throw new Error(
        "A referência de fragmento precisa informar o nome do fragmento.",
      );
    return { type: "fragment", name };
  }

  if (blockName === "section-header" || blockName === "section-title") {
    const [eyebrowCell, titleCell, descriptionCell] = body[0] ?? [];
    if (!titleCell?.text)
      throw new Error("O block section-header precisa informar um título.");
    return {
      type: "section-header",
      eyebrow: eyebrowCell?.text || undefined,
      title: titleCell.text,
      description: descriptionCell?.rawText || undefined,
    };
  }

  if (blockName)
    console.warn(
      `Block "${blockName}" ignorado: ele não está cadastrado no parser.`,
    );
  return null;
}

export function parseGoogleDocument(document: GoogleDocument): Page {
  const content = document.body?.content ?? [];
  const tables = content.filter((element) => element.table);
  const blocks = tables
    .map((table) => rowsFromTable(table, document))
    .map(blockFromRows)
    .filter((block): block is Block => block !== null);

  if (!blocks.length) {
    const paragraphs = content.filter((element) => element.paragraph).length;
    throw new Error(
      `Nenhum block válido foi encontrado. A API recebeu ${tables.length} tabela(s) e ${paragraphs} parágrafo(s). ` +
        "Cada block precisa ser uma tabela do Google Docs cuja primeira linha tenha o nome do block: header, footer, hero, banner-text, banner-carousel, sponsors, card-event, section-header, upcoming-events, events-list, quote, not-found, donation, mass-schedule, news, all-news, banner, title, text, image, teaser-image ou fragment.",
    );
  }

  return {
    title: document.title || "Site sem título",
    description: "Página gerada automaticamente a partir de um Google Doc.",
    blocks,
  };
}
