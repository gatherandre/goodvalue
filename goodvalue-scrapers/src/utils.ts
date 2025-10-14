import type { Page } from "puppeteer";

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function parsePriceToNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const sanitized = raw
    .replace(/\s/g, "")
    .replace(/[^0-9.,-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, ".");

  const value = Number.parseFloat(sanitized);
  return Number.isFinite(value) ? value : null;
}

export function normalizeText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : undefined;
}

export function dedupeByLink<T extends { link: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = item.link?.trim();
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return Array.from(map.values());
}

export async function setupPageAntiBot(page: Page): Promise<void> {
  await page.setUserAgent(DEFAULT_USER_AGENT);
  await page.setViewport({ width: 1280, height: 720 });
  await page.setExtraHTTPHeaders({
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "User-Agent": DEFAULT_USER_AGENT,
  });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // @ts-expect-error augment window during runtime to mimic Chrome
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, "languages", {
      get: () => ["pt-BR", "pt", "en-US", "en"],
    });
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3],
    });
  });
}
