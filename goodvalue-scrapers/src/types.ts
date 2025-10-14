export interface Oferta {
  nome: string;
  preco: number | null;
  link: string;
  mercado: string;
  loja?: string;
  cidade?: string;
  cep?: string;
  distancia?: number;
  imagem?: string;
}

export interface RawOferta {
  titulo: string;
  preco: string;
  link: string;
  loja?: string;
}
