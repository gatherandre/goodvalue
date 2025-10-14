export interface Oferta {
  nome: string;
  preco: number | null | undefined;
  link: string;
  mercado: string;
  loja?: string;
  cidade?: string;
  cep?: string;
  distancia?: number;
  imagem?: string;
}
