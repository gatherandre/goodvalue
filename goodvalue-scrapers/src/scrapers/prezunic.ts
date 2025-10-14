import { Oferta } from "../types.js";
import { fetchVtexOffers } from "../clients/vtex.js";

export async function scrapePrezunic(query: string): Promise<Oferta[]> {
  try {
    const ofertas = await fetchVtexOffers({
      marketplace: "Prezunic",
      hostname: "www.prezunic.com.br",
      query,
      defaultSellerName: "Prezunic",
      salesChannel: "1",
    });

    console.log(
      `✅ (Scraper) Encontradas ${ofertas.length} ofertas para "${query}" no Prezunic (via VTEX).`,
    );

    return ofertas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Prezunic para a busca "${query}":`, errorMessage);
    return [];
  }
}
