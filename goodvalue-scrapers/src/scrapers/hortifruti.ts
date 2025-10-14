import { Oferta } from "../types.js";
import { fetchVtexOffers } from "../clients/vtex.js";

export async function scrapeHortifruti(query: string): Promise<Oferta[]> {
  try {
    const ofertas = await fetchVtexOffers({
      marketplace: "Hortifruti",
      hostname: "www.hortifruti.com.br",
      query,
      defaultSellerName: "Hortifruti",
      salesChannel: "1",
    });

    console.log(
      `✅ (Scraper) Encontradas ${ofertas.length} ofertas para "${query}" no Hortifruti (via VTEX).`,
    );

    return ofertas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Hortifruti para a busca "${query}":`, errorMessage);
    return [];
  }
}
