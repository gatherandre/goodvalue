import { Oferta } from "../types.js";
import { fetchVtexOffers } from "../clients/vtex.js";

export async function scrapeZonaSul(query: string): Promise<Oferta[]> {
  try {
    const ofertas = await fetchVtexOffers({
      marketplace: "Zona Sul",
      hostname: "www.zonasul.com.br",
      query,
      defaultSellerName: "Zona Sul",
      salesChannel: "1",
    });

    console.log(
      `✅ (Scraper) Encontradas ${ofertas.length} ofertas para "${query}" no Zona Sul (via VTEX).`,
    );

    return ofertas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Zona Sul para a busca "${query}":`, errorMessage);
    return [];
  }
}
