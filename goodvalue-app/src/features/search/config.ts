// Lista de fallback de sugestões de produtos
export const FALLBACK_SUGGESTIONS = [
  "Leite",
  "Arroz",
  "Feijão",
  "Café",
  "Açúcar",
  "Óleo de Soja",
  "Macarrão",
  "Molho de Tomate",
  "Sabão em Pó",
  "Detergente",
];

// Lista de marketplaces priorizada, mantendo alinhamento com os scrapers do backend
export const CURATED_MARKETPLACES: string[] = [
  "Atacadão",
  "Carrefour",
  "Extra",
  "Hortifruti",
  "Prezunic",
  "Superprix",
  "Zona Sul",
  "Zoom",
];

// Lista de fallback de mercados, sincronizada com o backend
export const FALLBACK_MARKETPLACES: string[] = [...CURATED_MARKETPLACES];

// --- CORREÇÃO AQUI ---
// Esta linha estava faltando. O código precisa que esta variável exista,
// mesmo que esteja vazia.
export const EXCLUDED_MARKETPLACES: string[] = [];
