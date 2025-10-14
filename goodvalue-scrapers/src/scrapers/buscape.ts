import puppeteer from "puppeteer";
import { Oferta, RawOferta } from "../types.js";
import { normalizeText, parsePriceToNumber, setupPageAntiBot } from "../utils.js";

export async function scrapeBuscape(query: string): Promise<Oferta[]> {
  const url = `https://www.buscape.com.br/search?q=${encodeURIComponent(query)}`;
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await setupPageAntiBot(page);
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector("div[data-testid='product-card']", { timeout: 10000 }).catch(() => null);

    const rawOfertas: RawOferta[] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("div[data-testid='product-card']"))
        .map((el) => ({
          titulo: el.querySelector("h2")?.textContent || "",
          preco: el.querySelector("[data-testid='product-card::price']")?.textContent || "",
          link: (el.querySelector("a") as HTMLAnchorElement)?.href || "",
          loja: el.querySelector("[data-testid='product-card::seller']")?.textContent || "",
        }));
    });

    return rawOfertas
      .map((item) => ({
        nome: normalizeText(item.titulo) ?? "Produto sem título",
        preco: parsePriceToNumber(item.preco),
        link: item.link,
        mercado: "Buscapé",
        loja: normalizeText(item.loja),
      }))
      .filter((item) => Boolean(item.link));
  } finally {
    await browser.close();
  }
}
