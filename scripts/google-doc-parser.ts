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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

type ParsedCell = { text: string; html: string; image?: string };

function cellFromContent(
  content: StructuralElement[] | null | undefined,
  inlineObjects: GoogleDocument["inlineObjects"],
): ParsedCell {
  let text = "";
  let html = "";
  let image: string | undefined;
  for (const element of content ?? []) {
    const parts = element.paragraph?.elements ?? [];
    for (const part of parts) {
      const value = part.textRun?.content ?? "";
      text += value;
      if (value) {
        const style = part.textRun?.textStyle;
        const formatted = escapeHtml(value);
        html +=
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
  }
  return { text: clean(text), html, image };
}

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

function blockFromRows(rows: ParsedCell[][]): Block | null {
  const blockName = firstValue(rows[0]).toLowerCase();
  const body = rows.slice(1).filter((row) => row.some(Boolean));

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
    const links = body
      .slice(1)
      .map(([labelCell, hrefCell]) => ({
        label: labelCell?.text ?? "",
        href: hrefCell?.text ?? "#",
      }))
      .filter((link) => link.label);
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
        footer.contacts.push({ icon: value, text: hrefCell?.text ?? "" });
      if (kind === "office") {
        footer.officeLabel = value;
        footer.officeHours = hrefCell?.text ?? "";
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
        href: hrefCell?.text ?? "#",
      }))
      .filter((slide) => slide.image || slide.title);

    if (!slides.length || slides.some((slide) => !slide.image || !slide.title)) {
      throw new Error(
        "O block banner-carousel precisa informar imagem e título para cada slide.",
      );
    }
    return { type: "banner-carousel", slides };
  }

  if (blockName === "donation" || blockName === "doacao" || blockName === "doação") {
    const [
      eyebrowCell,
      titleCell,
      quoteCell,
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

    if (!titleCell?.text || !pixKeyCell?.text || !qrCode) {
      throw new Error(
        "O block donation precisa informar título, chave Pix e a imagem do QR Code.",
      );
    }
    return {
      type: "donation",
      eyebrow: eyebrowCell?.text ?? "Colabore",
      title: titleCell.text,
      quote: quoteCell?.text ?? "",
      pixKey: pixKeyCell.text,
      qrCode,
      qrCodeAlt: qrCodeAltCell?.text ?? "QR Code Pix",
      qrInstruction:
        qrInstructionCell?.text ?? "Aponte a câmera do celular para o QR Code acima.",
      inPersonNote: inPersonNoteCell?.text ?? "",
      bankDetails,
    };
  }

  if (blockName === "mass-schedule" || blockName === "missas") {
    const [titleCell, descriptionCell, noteCell] = body[0] ?? [];
    const entries = body
      .slice(1)
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
    if (!titleCell?.text || !entries.length) {
      throw new Error(
        "O block mass-schedule precisa informar título e pelo menos um horário.",
      );
    }
    return {
      type: "mass-schedule",
      title: titleCell.text,
      description: descriptionCell?.text ?? "",
      note: noteCell?.text ?? "",
      groups,
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

  if (blockName === "text") {
    const [titleCell, textCell] = body[0] ?? [];
    if (!titleCell?.text && !textCell?.text) return null;
    return {
      type: "news-text",
      title: titleCell?.text ?? "",
      titleHtml: titleCell?.html ?? "",
      text: textCell?.html ?? "",
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

  if (blockName === "news" || blockName === "all-news") {
    const [eyebrowCell, titleCell, descriptionCell, allLabelCell, allHrefCell] =
      body[0] ?? [];
    if (!titleCell?.text)
      throw new Error(`O block ${blockName} precisa informar um título.`);
    return {
      type: blockName,
      eyebrow: eyebrowCell?.text ?? "Comunicados",
      title: titleCell.text,
      description: descriptionCell?.text ?? "",
      allLabel: allLabelCell?.text ?? "Ver todas",
      allHref: allHrefCell?.text ?? "/noticias/",
    };
  }

  if (blockName === "fragment" || blockName === "experience-fragment") {
    const name = firstValue(body[0]);
    if (!name)
      throw new Error(
        "A referência de fragmento precisa informar o nome do fragmento.",
      );
    return { type: "fragment", name };
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
        "Cada block precisa ser uma tabela do Google Docs cuja primeira linha tenha o nome do block: header, footer, hero, banner-carousel, donation, mass-schedule, news, all-news, banner, text, image ou fragment.",
    );
  }

  return {
    title: document.title || "Site sem título",
    description: "Página gerada automaticamente a partir de um Google Doc.",
    blocks,
  };
}
