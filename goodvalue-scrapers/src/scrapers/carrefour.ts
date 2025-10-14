import { Oferta } from "../types.js";
import { fetchVtexOffers } from "../clients/vtex.js";

export async function scrapeCarrefour(query: string): Promise<Oferta[]> {
  try {
    const ofertas = await fetchVtexOffers({
      marketplace: "Carrefour",
      hostname: "mercado.carrefour.com.br",
      query,
      defaultSellerName: "Carrefour",
    });

    console.log(
      `✅ (Scraper) Encontradas ${ofertas.length} ofertas para "${query}" no Carrefour (via VTEX).`,
    );

    return ofertas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Carrefour para a busca "${query}":`, errorMessage);
    return [];
  }
}
