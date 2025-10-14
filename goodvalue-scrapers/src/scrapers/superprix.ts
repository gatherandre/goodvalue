import { Oferta } from "../types.js";
import { fetchVtexOffers } from "../clients/vtex.js";

export async function scrapeSuperprix(query: string): Promise<Oferta[]> {
  try {
    const ofertas = await fetchVtexOffers({
      marketplace: "Superprix",
      hostname: "www.superprix.com.br",
      query,
      defaultSellerName: "Superprix",
      salesChannel: "5",
    });

    console.log(
      `✅ (Scraper) Encontradas ${ofertas.length} ofertas para "${query}" no Superprix (via VTEX).`,
    );

    return ofertas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Superprix para a busca "${query}":`, errorMessage);
    return [];
  }
}
