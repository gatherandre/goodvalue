import axios from "axios";
import { fetchVtexOffers } from "../clients/vtex.js";
import { Oferta } from "../types.js";
import { DEFAULT_USER_AGENT, dedupeByLink } from "../utils.js";

const PREZUNIC_BASE_URL = "https://www.prezunic.com.br";
const PREZUNIC_HOSTNAME = "www.prezunic.com.br";
const PREZUNIC_SALES_CHANNEL = "1";
const PREZUNIC_DEFAULT_SELLER = "Prezunic";
const PREZUNIC_POSTAL_CODE = "20510400";
const GRAPHQL_PAGE_SIZE = 60;

export async function scrapePrezunic(query: string): Promise<Oferta[]> {
  try {
    const graphqlOffers = await fetchPrezunicGraphqlOffers(query);
    const allOffers =
      graphqlOffers.length > 0
        ? graphqlOffers
        : await fetchVtexOffers({
            marketplace: "Prezunic",
            hostname: PREZUNIC_HOSTNAME,
            query,
            defaultSellerName: PREZUNIC_DEFAULT_SELLER,
            salesChannel: PREZUNIC_SALES_CHANNEL,
          });

    const topOffers = dedupeByLink(allOffers)
      .filter((oferta) => typeof oferta.preco === "number" && Number.isFinite(oferta.preco))
      .sort((a, b) => (a.preco as number) - (b.preco as number))
      .slice(0, 3);

    console.log(
      `✅ (Scraper) Encontradas ${topOffers.length} ofertas para "${query}" no Prezunic (via VTEX).`,
    );

    return topOffers;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Prezunic para a busca "${query}":`, errorMessage);
    return [];
  }
}

async function fetchPrezunicGraphqlOffers(query: string): Promise<Oferta[]> {
  try {
    const headers = buildGraphqlHeaders();
    const response = await axios.post<{
      data?: {
        productSearch?: {
          products?: Array<{
            productName?: string;
            linkText?: string;
            items?: Array<{
              itemId?: string;
              name?: string;
              sellers?: Array<{
                sellerId?: string;
                sellerName?: string;
                commertialOffer?: {
                  Price?: number | null;
                  AvailableQuantity?: number | null;
                } | null;
              }> | null;
            }> | null;
          }>;
        };
      };
    }>(
      `${PREZUNIC_BASE_URL}/_v/private/graphql/v1`,
      {
        query: `
          query ProductSearch($fullText: String, $selectedFacets: [SelectedFacetInput!]) {
            productSearch(fullText: $fullText, selectedFacets: $selectedFacets, from: 0, to: ${GRAPHQL_PAGE_SIZE}) @context(provider: "vtex.search-graphql") {
              products {
                productName
                linkText
                items {
                  itemId
                  name
                  sellers {
                    sellerId
                    sellerName
                    commertialOffer {
                      Price
                      AvailableQuantity
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          fullText: query,
          selectedFacets: [{ key: "ft", value: query }],
        },
      },
      {
        headers,
        timeout: 20000,
      },
    );

    const products = response.data?.data?.productSearch?.products;
    if (!Array.isArray(products) || products.length === 0) {
      return [];
    }

    const offers: Oferta[] = [];
    const seen = new Set<string>();

    for (const product of products) {
      const productLink = buildProductLink(product.linkText);
      if (!product?.items) continue;

      for (const item of product.items) {
        if (!item?.sellers) continue;

        for (const seller of item.sellers) {
          const offer = seller?.commertialOffer;
          const price = offer?.Price ?? null;
          const available = offer?.AvailableQuantity;

          if (price === null || price <= 0) continue;
          if (typeof available === "number" && available <= 0) continue;

          const uniqueKey = `${item.itemId ?? item.name ?? ""}|${seller?.sellerId ?? seller?.sellerName ?? ""}`;
          if (seen.has(uniqueKey)) continue;
          seen.add(uniqueKey);

          offers.push({
            nome: item?.name || product?.productName || "Produto sem título",
            preco: price,
            link: productLink,
            mercado: "Prezunic",
            loja: seller?.sellerName || PREZUNIC_DEFAULT_SELLER,
          });
        }
      }
    }

    return offers;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(
      `ℹ️ Falha na busca GraphQL do Prezunic para "${query}", tentando fallback REST: ${errorMessage}`,
    );
    return [];
  }
}

function buildGraphqlHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Content-Type": "application/json",
    "User-Agent": DEFAULT_USER_AGENT,
    "X-Vtex-Use-Https": "true",
    "X-Vtex-Segment": buildSegmentHeader(),
  };
}

function buildSegmentHeader(): string {
  const payload = {
    channel: PREZUNIC_SALES_CHANNEL,
    salesChannel: PREZUNIC_SALES_CHANNEL,
    regionId: null,
    geoCoordinates: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    currencyCode: "BRL",
    countryCode: "BRA",
    postalCode: PREZUNIC_POSTAL_CODE,
    sellerId: null,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function buildProductLink(slug?: string | null): string {
  const safeSlug = slug?.replace(/^\/+|\/+$/g, "");
  if (!safeSlug) {
    return PREZUNIC_BASE_URL;
  }

  const path = safeSlug.endsWith("/p") ? safeSlug : `${safeSlug}/p`;
  return `${PREZUNIC_BASE_URL}/${path}`;
}
