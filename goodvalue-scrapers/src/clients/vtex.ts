import axios from "axios";
import { Oferta } from "../types.js";
import { DEFAULT_USER_AGENT } from "../utils.js";

interface VtexItemSeller {
  sellerName?: string;
  commertialOffer?: {
    Price?: number | null;
    AvailableQuantity?: number | null;
  } | null;
}

interface VtexItem {
  name?: string;
  sellers?: VtexItemSeller[] | null;
}

interface VtexProduct {
  productName?: string;
  link?: string;
  items?: VtexItem[] | null;
}

export interface FetchVtexOffersOptions {
  marketplace: string;
  hostname: string;
  query: string;
  defaultSellerName?: string;
  salesChannel?: string;
  protocol?: "https" | "http";
}

export async function fetchVtexOffers({
  marketplace,
  hostname,
  query,
  defaultSellerName,
  salesChannel,
  protocol = "https",
}: FetchVtexOffersOptions): Promise<Oferta[]> {
  const trimmedHost = hostname.trim().replace(/^https?:\/\//, "");
  if (!trimmedHost) {
    throw new Error(`Hostname inválido para ${marketplace}`);
  }

  const baseUrl = `${protocol}://${trimmedHost.replace(/\/$/, "")}`;
  const endpoint = `${baseUrl}/api/catalog_system/pub/products/search/`;

  const candidates = buildQueryCandidates(query.trim());
  let data: VtexProduct[] | undefined;
  let lastClientError: unknown = null;

  for (const candidate of candidates) {
    try {
      const params: Record<string, string> = { ft: candidate };
      if (salesChannel) {
        params.sc = salesChannel;
      }

      const response = await axios.get<VtexProduct[]>(endpoint, {
        params,
        timeout: 20000,
        headers: {
          Accept: "application/json",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "User-Agent": DEFAULT_USER_AGENT,
        },
      });

      if (Array.isArray(response.data)) {
        data = response.data;
        break;
      }
    } catch (error) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const status = axiosError?.response?.status;
      if (status === 400 || status === 404) {
        lastClientError = error;
        continue;
      }
      throw error;
    }
  }

  if (!Array.isArray(data)) {
    if (lastClientError) {
      return [];
    }
    return [];
  }

  const offers: Oferta[] = [];

  data.forEach((product) => {
    if (!product?.items?.length) return;

    const productLink = buildAbsoluteLink(baseUrl, product.link);

    product.items.forEach((item) => {
      const sellers = item?.sellers ?? [];
      sellers.forEach((seller) => {
        const offer = seller?.commertialOffer;
        if (!offer) return;

        const price = offer.Price ?? null;
        const available = offer.AvailableQuantity;

        if (price === null || price <= 0) return;
        if (typeof available === "number" && available <= 0) return;

        offers.push({
          nome: item?.name || product.productName || "Produto sem título",
          preco: price,
          link: productLink,
          mercado: marketplace,
          loja: seller?.sellerName || defaultSellerName || marketplace,
        });
      });
    });
  });

  return offers;
}

function buildAbsoluteLink(baseUrl: string, link?: string): string {
  if (!link) {
    return baseUrl;
  }

  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  if (link.startsWith("//")) {
    return `${new URL(baseUrl).protocol}${link}`;
  }

  if (link.startsWith("/")) {
    return `${baseUrl}${link}`;
  }

  return `${baseUrl}/${link}`;
}

function normalizeSearchQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildQueryCandidates(initialQuery: string): string[] {
  const set = new Set<string>();

  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (trimmed && !set.has(trimmed)) {
      set.add(trimmed);
    }
  };

  push(initialQuery);

  const normalized = normalizeSearchQuery(initialQuery);
  push(normalized);

  if (normalized.includes(" ")) {
    push(normalized.replace(/\s+/g, "-"));
    push(normalized.replace(/\s+/g, ""));
  }

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length > 1) {
    push(tokens[0]);
    push(tokens[tokens.length - 1]);
  }

  return Array.from(set);
}
