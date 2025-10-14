import { SCRAPERS } from "../runner.js";

export const marketplaces: string[] = SCRAPERS.map(({ marketplace }) => marketplace);
