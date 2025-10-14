import pLimit from "p-limit";
import { Oferta } from "./types.js";
import { dedupeByLink } from "./utils.js";

import { scrapeZoom } from "./scrapers/zoom.js";
import { scrapeCarrefour } from "./scrapers/carrefour.js";
import { scrapeSuperprix } from "./scrapers/superprix.js";
import { scrapePrezunic } from "./scrapers/prezunic.js";
import { scrapeAtacadao } from "./scrapers/atacadao.js";
import { scrapeZonaSul } from "./scrapers/zonaSul.js";
import { scrapeHortifruti } from "./scrapers/hortifruti.js";
import { scrapeExtra } from "./scrapers/extra.js";

export const SCRAPERS = [
  { marketplace: "Carrefour", run: scrapeCarrefour },
  { marketplace: "Extra", run: scrapeExtra },
  { marketplace: "Zona Sul", run: scrapeZonaSul },
  { marketplace: "Hortifruti", run: scrapeHortifruti },
  { marketplace: "Superprix", run: scrapeSuperprix },
  { marketplace: "Prezunic", run: scrapePrezunic },
  { marketplace: "Atacadão", run: scrapeAtacadao },
  { marketplace: "Zoom", run: scrapeZoom },
] as const;

type ScraperDefinition = (typeof SCRAPERS)[number];

function normalizeMarketplaceName(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function selectScrapers(filter: string[] | undefined): readonly ScraperDefinition[] {
  if (!filter || filter.length === 0) {
    return SCRAPERS;
  }

  const normalizedFilter = new Set(
    filter.map(name => normalizeMarketplaceName(name)).filter(name => name.length > 0)
  );

  if (normalizedFilter.size === 0) {
    return SCRAPERS;
  }

  const filtered = SCRAPERS.filter(scraper =>
    normalizedFilter.has(normalizeMarketplaceName(scraper.marketplace))
  );

  return filtered;
}

export async function runScrapers(query: string, marketplaceFilter?: string[]): Promise<Oferta[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const scrapersToRun = selectScrapers(marketplaceFilter);
  const limit = pLimit(2);

  if (scrapersToRun.length === 0) {
    console.log(`⚠️ Nenhum scraper encontrado para os mercados selecionados: ${marketplaceFilter?.join(', ')}`);
    return [];
  }

  const settled = await Promise.allSettled(
    scrapersToRun.map((scraper) => limit(() => scraper.run(normalizedQuery))),
  );

  const collected: Oferta[] = [];

  settled.forEach((result, index) => {
    const { marketplace } = scrapersToRun[index];
    if (result.status === "fulfilled") {
      collected.push(...result.value);
    } else {
      console.error(`⚠️ Erro no scraper ${marketplace}:`, result.reason);
    }
  });

  const deduped = dedupeByLink(collected);

  return deduped.sort((a, b) => {
    const priceA = a.preco ?? Number.POSITIVE_INFINITY;
    const priceB = b.preco ?? Number.POSITIVE_INFINITY;
    return priceA - priceB;
  });
}
