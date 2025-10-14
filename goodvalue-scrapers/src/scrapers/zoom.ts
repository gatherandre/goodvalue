import axios from "axios";
import * as cheerio from "cheerio";
import { Oferta } from "../types.js";
import { normalizeText } from "../utils.js";

// Simular um navegador para evitar bloqueios simples.
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Tipagem simplificada para o objeto de produto dentro do JSON do Zoom
interface ZoomProductHit {
  name: string;
  price: number;
  url: string;
  bestOffer: {
    merchantName: string;
  }
}

/**
 * Realiza o scraping de ofertas no site do Zoom.
 * O site usa um JSON embutido na tag __NEXT_DATA__ que contém os produtos.
 * @param query O termo de busca.
 * @returns Uma Promise que resolve em um array de objetos Oferta.
 */
export async function scrapeZoom(query: string): Promise<Oferta[]> {
  try {
    const url = `https://www.zoom.com.br/busca/${encodeURIComponent(query)}`;

    const { data: html } = await axios.get(url, {
      headers: { 'User-Agent': BROWSER_USER_AGENT }
    });

    const $ = cheerio.load(html);
    const ofertas: Oferta[] = [];

    // --- ESTRATÉGIA ROBUSTA: Lendo o objeto __NEXT_DATA__ ---
    const scriptContent = $('#__NEXT_DATA__').html();

    if (scriptContent) {
      const jsonData = JSON.parse(scriptContent);
      
      // O array de produtos está aninhado em props.pageProps.initialReduxState.hits.hits
      const productHits: ZoomProductHit[] = jsonData?.props?.initialReduxState?.hits?.hits || [];

      productHits.forEach((item) => {
        // O Zoom é um comparador, então o preço é o menor encontrado
        const nome = normalizeText(item.name);
        const preco = item.price; 
        const link = `https://www.zoom.com.br${item.url}`; // O link vem incompleto, precisa do domínio.
        const loja = item.bestOffer?.merchantName || "Múltiplas Lojas";

        if (nome && preco > 0 && link) {
          ofertas.push({
            nome,
            preco,
            link, 
            mercado: "Zoom",
            loja: loja // Usamos o nome da loja com o menor preço
          });
        }
      });
    }

    console.log(`✅ (Scraper) Encontradas ${ofertas.length} ofertas para "${query}" no Zoom (via NEXT_DATA).`);
    return ofertas;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`⚠️ Erro no scraper Zoom para a busca "${query}":`, errorMessage);
    return [];
  }
}