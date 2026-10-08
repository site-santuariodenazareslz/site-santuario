import { isSafeUrl } from "../src/lib/urls";

const allowedTags = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "u",
  "ul",
]);

const allowedAttributes = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "width", "height"]),
};

const forbiddenProtocols = /^(?:javascript|vbscript):/i;

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function sanitizeHtml(value: string): string {
  return value
    .replace(/<!--.*?-->/gs, "")
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\/\s*script\s*>/gi, "")
    .replace(/<\s*style\b[^>]*>[\s\S]*?<\/\s*style\s*>/gi, "")
    .replace(/<\/?[a-z0-9]+(?:\s+[^>]*)?>/gi, (match) => {
      const tagMatch = match.match(/^<\s*\/\s*(\w+)|^<\s*(\w+)/i);
      const tagName = tagMatch?.[1] ?? tagMatch?.[2]?.toLowerCase();
      if (!tagName || !allowedTags.has(tagName.toLowerCase())) return "";

      const closingTag = match.startsWith("</");
      if (closingTag) return `</${tagName}>`;

      const attrText = match.slice(match.indexOf(tagName) + tagName.length);
      const attributes = attrText
        .match(/([\w:-]+)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi)
        ?.map((attribute) => attribute.trim())
        .filter(Boolean)
        .filter((attribute) => !/^on/i.test(attribute.split("=")[0] ?? ""));

      const sanitized = ["<" + tagName];
      for (const attribute of attributes ?? []) {
        const equalsIndex = attribute.indexOf("=");
        const rawName =
          equalsIndex >= 0 ? attribute.slice(0, equalsIndex) : attribute;
        const rawValue =
          equalsIndex >= 0 ? attribute.slice(equalsIndex + 1) : "";
        const sanitizedName = rawName.toLowerCase();
        const allowedAttributesForTag =
          allowedAttributes[
            tagName.toLowerCase() as keyof typeof allowedAttributes
          ];

        if (!allowedAttributesForTag?.has(sanitizedName)) continue;

        if (!rawValue) continue;
        const value = rawValue.replace(/^['"]|['"]$/g, "");
        if (sanitizedName === "href") {
          if (!isSafeUrl(value)) continue;
        } else if (sanitizedName === "src") {
          if (!isSafeUrl(value) || forbiddenProtocols.test(value)) continue;
        }

        const quotedValue = value.includes('"')
          ? value.replaceAll('"', "&quot;")
          : value;
        sanitized.push(
          `${sanitizedName}="${escapeHtmlAttribute(quotedValue)}"`,
        );
      }

      if (tagName.toLowerCase() === "a") {
        const hasTarget = sanitized.some((item) => item.startsWith("target="));
        if (hasTarget) {
          sanitized.push('rel="noopener noreferrer"');
        }
      }

      return sanitized.join(" ") + ">";
    });
}
