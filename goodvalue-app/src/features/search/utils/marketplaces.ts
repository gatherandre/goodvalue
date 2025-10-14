import { Oferta } from "../../../shared/types";
import {
  CURATED_MARKETPLACES,
  EXCLUDED_MARKETPLACES,
} from "../config";

const EXCLUDED_MARKETPLACE_KEYS = new Set(EXCLUDED_MARKETPLACES.map((value) => normalizeKey(value)));

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function dedupeByNormalizedValue(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const key = normalizeKey(value);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  });

  return result;
}

export function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const key = normalizeKey(value);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  });

  return result;
}

export function normalizeMarketplaceValue(value: string): string {
  return normalizeKey(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

export function matchesNormalizedText(candidate: string, target: string): boolean {
  if (!candidate || !target) {
    return false;
  }

  if (candidate === target) {
    return true;
  }

  if (candidate.includes(target) || target.includes(candidate)) {
    return true;
  }

  const tokens = target.split(" ").filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => candidate.includes(token));
}

export function buildMarketplaceList(values: unknown[]): string[] {
  const sanitizedValues = values
    .filter((market): market is string => typeof market === "string")
    .map((market) => market.trim())
    .filter((market) => market.length > 0)
    .map((market) => market.replace(/\s+/g, " "))
    .filter((market) => !EXCLUDED_MARKETPLACE_KEYS.has(normalizeKey(market)));

  const uniqueSanitized = dedupeByNormalizedValue(sanitizedValues);
  const normalizedSanitizedMap = new Map<string, string>();
  uniqueSanitized.forEach((market) => normalizedSanitizedMap.set(normalizeKey(market), market));

  const ordered: string[] = [];
  const seen = new Set<string>();

  CURATED_MARKETPLACES.forEach((market) => {
    const key = normalizeKey(market);
    if (seen.has(key) || EXCLUDED_MARKETPLACE_KEYS.has(key)) {
      return;
    }

    const label = normalizedSanitizedMap.get(key) ?? market;
    ordered.push(label);
    seen.add(key);
  });

  uniqueSanitized.forEach((market) => {
    const key = normalizeKey(market);
    if (seen.has(key) || EXCLUDED_MARKETPLACE_KEYS.has(key)) {
      return;
    }
    ordered.push(market);
    seen.add(key);
  });

  return ordered;
}

export function getComparablePrice(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function extractMarketplaceCandidates(offer: Oferta): string[] {
  const candidates: string[] = [];

  if (offer.mercado && offer.mercado.trim()) {
    candidates.push(offer.mercado.trim());
  }

  if (offer.loja && offer.loja.trim()) {
    candidates.push(offer.loja.trim());
  }

  if (offer.link) {
    try {
      const parsed = new URL(offer.link);
      const hostname = parsed.hostname.replace(/^www\./i, "");
      if (hostname) {
        candidates.push(hostname);

        const segments = hostname
          .split(".")
          .filter((segment) => segment && !/^(com|br|app|www)$/i.test(segment));
        if (segments.length > 0) {
          const longestSegment = segments.reduce(
            (longest, segment) => (segment.length > longest.length ? segment : longest),
            segments[0],
          );
          if (longestSegment) {
            candidates.push(longestSegment.replace(/[-_]+/g, " "));
          }
        }
      }
    } catch (err) {
      // Ignora links inválidos ao determinar o nome da loja.
    }
  }

  return dedupeCaseInsensitive(candidates);
}

export function matchesMarketplace(offer: Oferta, marketplace: string): boolean {
  const target = normalizeMarketplaceValue(marketplace);
  if (!target) {
    return false;
  }

  return extractMarketplaceCandidates(offer)
    .map((candidate) => normalizeMarketplaceValue(candidate))
    .filter((candidate) => candidate.length > 0)
    .some(
      (candidate) =>
        matchesNormalizedText(candidate, target) || matchesNormalizedText(target, candidate),
    );
}

export function getBestOffersByMarketplace(
  offers: Oferta[],
): { key: string; label: string; offer: Oferta }[] {
  const bestByMarket = new Map<string, { key: string; label: string; offer: Oferta }>();

  offers.forEach((offer) => {
    const comparablePrice = getComparablePrice(offer.preco);
    const candidates = extractMarketplaceCandidates(offer);
    if (candidates.length === 0) {
      return;
    }

    const primaryLabel = (offer.mercado && offer.mercado.trim())
      || (offer.loja && offer.loja.trim())
      || candidates[0];

    const seenKeys = new Set<string>();
    candidates.forEach((candidate) => {
      const key = normalizeMarketplaceValue(candidate);
      if (!key || seenKeys.has(key)) {
        return;
      }
      seenKeys.add(key);

      const label = primaryLabel && primaryLabel.trim().length > 0 ? primaryLabel.trim() : candidate;
      const existing = bestByMarket.get(key);
      if (!existing) {
        bestByMarket.set(key, { key, label, offer });
        return;
      }

      const existingComparable = getComparablePrice(existing.offer.preco);
      const shouldReplace = Number.isFinite(comparablePrice)
        ? !Number.isFinite(existingComparable) || comparablePrice <= existingComparable
        : !Number.isFinite(existingComparable) && comparablePrice < existingComparable;

      if (shouldReplace) {
        bestByMarket.set(key, { key, label, offer });
      }
    });
  });

  return Array.from(bestByMarket.values()).sort(
    (a, b) => getComparablePrice(a.offer.preco) - getComparablePrice(b.offer.preco),
  );
}

export function findBestOfferForMarketplace(
  groupedOffers: { key: string; label: string; offer: Oferta }[],
  marketplace: string,
): { key: string; label: string; offer: Oferta } | null {
  const normalizedTarget = normalizeMarketplaceValue(marketplace);
  if (!normalizedTarget) {
    return null;
  }

  const directMatch = groupedOffers.find((entry) => entry.key === normalizedTarget);
  if (directMatch) {
    return directMatch;
  }

  const fallbackMatch = groupedOffers.find(
    (entry) =>
      matchesNormalizedText(entry.key, normalizedTarget) ||
      matchesNormalizedText(normalizedTarget, entry.key) ||
      matchesMarketplace(entry.offer, marketplace),
  );

  return fallbackMatch ?? null;
}
