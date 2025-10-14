import { Oferta } from "../types.js";
import { fetchVtexOffers } from "../clients/vtex.js";

export async function scrapeAtacadao(query: string): Promise<Oferta[]> {
  try {
    const ofertas = await fetchVtexOffers({
      marketplace: "Atacadão",
      hostname: "www.atacadao.com.br",
      query,
      defaultSellerName: "Atacadão",
      salesChannel: "1",
    });

    console.log(
      `✅ (Scraper) Encontradas ${ofertas.length} ofertas para "${query}" no Atacadão (via VTEX).`,
    );

    return ofertas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Atacadão para a busca "${query}":`, errorMessage);
    return [];
  }
}
