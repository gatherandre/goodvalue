import { Oferta } from "../types.js";

export type StaticMarketplace =
  | "Superprix"
  | "Atacadao"
  | "FeiraNova";

type StaticOfferDefinition = Oferta & {
  keywords?: string[];
};

const STATIC_OFFERS: Record<StaticMarketplace, StaticOfferDefinition[]> = {
  Superprix: [
    {
      nome: "Arroz Tipo 1 SuperPrix 5kg",
      preco: 24.9,
      link: "https://www.superprix.com.br/produto/arroz-tipo-1-superprix-5kg",
      mercado: "Superprix",
      loja: "SuperPrix Copacabana",
      keywords: ["arroz", "branco", "grão longo"],
    },
    {
      nome: "Feijão Carioca SuperPrix 1kg",
      preco: 8.49,
      link: "https://www.superprix.com.br/produto/feijao-carioca-superprix-1kg",
      mercado: "Superprix",
      loja: "SuperPrix Botafogo",
      keywords: ["feijao", "carioca"],
    },
    {
      nome: "Shampoo Dove Reconstrução 400ml",
      preco: 19.9,
      link: "https://www.superprix.com.br/produto/shampoo-dove-reconstrucao-400ml",
      mercado: "Superprix",
      loja: "SuperPrix Ipanema",
      keywords: ["shampoo", "dove"],
    },
  ],
  Atacadao: [
    {
      nome: "Ovo Caipira Bandeja 30 Unidades",
      preco: 49.9,
      link: "https://atacadaobr.vtexcommercestable.com.br/ovo-caipira-45268/p",
      mercado: "Atacadão",
      loja: "Atacadão Online",
      keywords: ["ovo", "caipira"],
    },
    {
      nome: "Ovo Branco Cartela 30 Unidades",
      preco: 29.9,
      link: "https://atacadaobr.vtexcommercestable.com.br/ovo-branco-30-unidades/p",
      mercado: "Atacadão",
      loja: "Atacadão Online",
      keywords: ["ovo", "branco"],
    },
    {
      nome: "Ovo Vermelho Cartela 20 Unidades",
      preco: 21.9,
      link: "https://atacadaobr.vtexcommercestable.com.br/ovo-vermelho-20-unidades/p",
      mercado: "Atacadão",
      loja: "Atacadão Online",
      keywords: ["ovo", "vermelho"],
    },
  ],
  FeiraNova: [
    {
      nome: "Ovo Mantiqueira Branco 20 Unidades",
      preco: 15.99,
      link: "https://www.feiranovaemcasa.com.br/produto/413/ovo-mantiqueira-branco-grande-20un",
      mercado: "Feira Nova em Casa",
      loja: "Feira Nova",
      keywords: ["ovo", "mantiqueira", "branco"],
    },
    {
      nome: "Ovo Caipira Santo Antônio 12 Unidades",
      preco: 12.99,
      link: "https://www.feiranovaemcasa.com.br/produto/10873/ovo-santo-antonio-caipira-12un",
      mercado: "Feira Nova em Casa",
      loja: "Feira Nova",
      keywords: ["ovo", "caipira"],
    },
    {
      nome: "Ovo de Codorna Mantiqueira 30 Unidades",
      preco: 8.98,
      link: "https://www.feiranovaemcasa.com.br/produto/4337/ovo-mantiqueira-codorna-30un",
      mercado: "Feira Nova em Casa",
      loja: "Feira Nova",
      keywords: ["ovo", "codorna"],
    },
  ],
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function findStaticOffers(
  marketplace: StaticMarketplace,
  query: string,
): Oferta[] {
  const tokens = normalize(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const filtered = tokens.length
    ? STATIC_OFFERS[marketplace].filter((offer) => {
        const haystack = normalize(
          [offer.nome, offer.loja, ...(offer.keywords ?? [])].filter(Boolean).join(" "),
        );
        return tokens.every((token) => haystack.includes(token));
      })
    : STATIC_OFFERS[marketplace];

  return filtered.map(({ keywords, ...offer }) => offer);
}
