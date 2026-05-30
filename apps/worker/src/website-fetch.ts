const FETCH_TIMEOUT_MS = 30_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "RecipePlannerBot/1.0 (+https://github.com/anushkamathur14-cloud/Recipe-Planner-)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`Could not fetch page (HTTP ${res.status})`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      throw new Error(
        `Page is not HTML (${contentType.split(";")[0]}). Try a screenshot instead.`
      );
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      throw new Error("Page is too large to import (over 2 MB)");
    }

    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const text = htmlToText(html);
    if (text.length < 80) {
      throw new Error(
        "Page had very little readable text — the site may block bots or require JavaScript. Try uploading a screenshot."
      );
    }

    return text.slice(0, 120_000);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timed out fetching the website (30s)");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
