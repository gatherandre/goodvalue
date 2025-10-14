import axios from "axios";
import { Oferta } from "../types.js";

const EXTRA_API_URL = "https://api.vendas.gpa.digital/ex/search/search";
const EXTRA_RESULTS_PER_PAGE = 24;
const EXTRA_STORE_ID = 483; // CEP 20510-400 (Tijuca/RJ)

interface ExtraProduct {
  price?: number | null;
  urlDetails?: string;
  name?: string;
  sellerName?: string;
}

interface ExtraSearchResponse {
  products?: ExtraProduct[];
}

export async function scrapeExtra(query: string): Promise<Oferta[]> {
  try {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const { data } = await axios.post<ExtraSearchResponse>(
      EXTRA_API_URL,
      {
        terms: trimmed,
        page: 1,
        sortBy: "relevance",
        resultsPerPage: EXTRA_RESULTS_PER_PAGE,
        allowRedirect: true,
        storeId: EXTRA_STORE_ID,
        department: "ecom",
        customerPlus: true,
        partner: "linx",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Origin: "https://www.extramercado.com.br",
          Referer: "https://www.extramercado.com.br/",
        },
        timeout: 20000,
      },
    );

    const products = Array.isArray(data?.products) ? data.products! : [];

    const ofertas: Oferta[] = products
      .map((product) => {
        const preco = typeof product.price === "number" ? product.price : null;
        const nome = product.name?.trim();
        const link = product.urlDetails?.trim();

        if (!nome || !link || preco === null) {
          return null;
        }

        return {
          nome,
          preco,
          link,
          mercado: "Extra",
          loja: product.sellerName?.trim() || "Extra",
        } satisfies Oferta;
      })
      .filter((item): item is Oferta => item !== null);

    console.log(
      `✅ (Scraper) Encontradas ${ofertas.length} ofertas para "${query}" no Extra (via API GPA).`,
    );

    return ofertas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Extra para a busca "${query}":`, errorMessage);
    return [];
  }
}
