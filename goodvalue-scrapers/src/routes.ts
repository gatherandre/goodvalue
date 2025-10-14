import { Router, Request, Response } from "express";
// CRÍTICO: Importar a lista SCRAPERS do runner.ts
import { runScrapers, SCRAPERS } from "./runner.js";
import { productSuggestions } from "./data/suggestions.js";

const router = Router();

// A rota /search está funcional
router.get("/search", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    if (!q) {
      return res.status(400).json({ error: "Parâmetro q é obrigatório" });
    }

    const marketsParam = req.query.markets as string | undefined;
    let selectedMarkets: string[] = [];
    if (marketsParam) {
      try {
        const parsed = JSON.parse(marketsParam);
        if (Array.isArray(parsed)) {
          selectedMarkets = parsed;
        }
      } catch (e) {
        // Ignora o erro se o JSON for inválido, apenas não filtra
      }
    }

    if (selectedMarkets.length > 0) {
      console.log(`🔎 Buscando "${q}" apenas nos mercados:`, selectedMarkets);
    } else {
      console.log(`🔎 Buscando "${q}" em todos os mercados.`);
    }

    const ofertas = await runScrapers(q, selectedMarkets);
    res.json(ofertas);
  } catch (err) {
    console.error("❌ Erro na rota /search:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// A rota /suggestions está funcional
router.get("/suggestions", (_req: Request, res: Response) => {
  res.json({ suggestions: productSuggestions });
});

// --- A CORREÇÃO DEFINITIVA ESTÁ AQUI ---
// Esta rota agora pega os nomes da lista de SCRAPERS e os retorna
// no formato { marketplaces: ["Nome1", "Nome2", ...] } que o app espera.
router.get("/marketplaces", (_req: Request, res: Response) => {
  try {
    const marketplaceNames = SCRAPERS.map(scraper => scraper.marketplace);
    res.json({ marketplaces: marketplaceNames });
  } catch (err) {
    console.error("❌ Erro na rota /marketplaces:", err);
    res.status(500).json({ marketplaces: [] }); // Envia uma lista vazia em caso de erro
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

router.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "GoodValue API",
    endpoints: ["/search", "/suggestions", "/marketplaces", "/health"],
  });
});

export default router;