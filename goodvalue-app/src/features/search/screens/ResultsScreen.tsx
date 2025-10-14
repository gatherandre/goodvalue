import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { resolveApiUrl } from "../../../shared/api";
import { Oferta } from "../../../shared/types";
import {
  dedupeCaseInsensitive,
  getBestOffersByMarketplace,
  getComparablePrice,
  normalizeKey,
} from "../utils/marketplaces";
import { BrandHeader } from "../../../shared/components/BrandHeader";

const API_URL = resolveApiUrl();
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const TABLE_MARKET_COLUMN_WIDTH = 150;
const TABLE_ITEM_COLUMN_WIDTH = 170;

function formatPrice(value: number | null | undefined): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return currencyFormatter.format(value);
  }
  return "Preço indisponível";
}

type AggregatedOffer = {
  item: string;
  offer: Oferta;
};

type MarketplaceTotal = {
  key: string;
  label: string;
  total: number;
  offers: AggregatedOffer[];
};

type EconomicalCombination = {
  total: number;
  offers: AggregatedOffer[];
};

export default function ResultsScreen() {
  const params = useLocalSearchParams<{
    items?: string | string[];
    marketplaces?: string | string[];
    q?: string | string[];
  }>();

  const rawItemsParam = Array.isArray(params.items) ? params.items[0] : params.items;
  const legacyQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawMarketsParam = Array.isArray(params.marketplaces)
    ? params.marketplaces[0]
    : params.marketplaces;

  const itemsList = useMemo(() => {
    if (rawItemsParam) {
      try {
        const parsed = JSON.parse(rawItemsParam);
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0);
          return dedupeCaseInsensitive(cleaned);
        }
      } catch (err) {
        console.warn("Não foi possível interpretar a lista de itens recebida.", err);
      }
    }

    if (legacyQuery && legacyQuery.trim()) {
      return [legacyQuery.trim()];
    }

    return [];
  }, [rawItemsParam, legacyQuery]);

  const selectedMarketplaces = useMemo(() => {
    if (rawMarketsParam) {
      try {
        const parsed = JSON.parse(rawMarketsParam);
        if (Array.isArray(parsed)) {
          const cleaned = parsed
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0);
          return dedupeCaseInsensitive(cleaned);
        }
      } catch (err) {
        console.warn("Não foi possível interpretar as lojas selecionadas.", err);
      }
    }

    return [];
  }, [rawMarketsParam]);

  const [resultsByItem, setResultsByItem] = useState<Record<string, Oferta[]>>({});
  const [failedItems, setFailedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (itemsList.length === 0) {
      setResultsByItem({});
      setFailedItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setFailedItems([]);

      const responses = await Promise.all(
        itemsList.map(async (item) => {
          try {
            const apiParams: { q: string; markets?: string } = { q: item };
            if (selectedMarketplaces.length > 0) {
              apiParams.markets = JSON.stringify(selectedMarketplaces);
            }
            const res = await axios.get(`${API_URL}/search`, { params: apiParams });
            const ofertas = Array.isArray(res.data) ? (res.data as Oferta[]) : [];
            return { item, ofertas, hasError: false };
          } catch (err) {
            console.error(`Não foi possível carregar ofertas para ${item}`, err);
            return { item, ofertas: [] as Oferta[], hasError: true };
          }
        }),
      );

      if (!isMounted) return;

      const aggregated: Record<string, Oferta[]> = {};
      const failed: string[] = [];

      responses.forEach(({ item, ofertas, hasError }) => {
        aggregated[item] = ofertas;
        if (hasError) {
          failed.push(item);
        }
      });

      setResultsByItem(aggregated);
      setFailedItems(failed);
      if (failed.length === responses.length) {
        setError("Não foi possível carregar os resultados. Tente novamente mais tarde.");
      } else {
        setError(null);
      }
      setLoading(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [itemsList, selectedMarketplaces]);

  const sortedOffersByItem = useMemo(() => {
    const map: Record<string, Oferta[]> = {};
    itemsList.forEach((item) => {
      const offers = resultsByItem[item] ?? [];
      map[item] = [...offers].sort(
        (a, b) => getComparablePrice(a.preco) - getComparablePrice(b.preco),
      );
    });
    return map;
  }, [itemsList, resultsByItem]);

  const purchaseHighlights = useMemo(() => {
    if (itemsList.length === 0) {
      return { bestSingleMarketplace: null, bestEconomicalCombination: null };
    }

    const totalsByMarketplace = new Map<string, { label: string; offers: Map<string, Oferta> }>();

    itemsList.forEach((item) => {
      const offers = sortedOffersByItem[item] ?? [];
      const perMarketplace = getBestOffersByMarketplace(offers);

      perMarketplace.forEach(({ key, label, offer }) => {
        const entry = totalsByMarketplace.get(key) ?? {
          label,
          offers: new Map<string, Oferta>(),
        };

        if (!entry.label && label) {
          entry.label = label;
        }

        entry.offers.set(item, offer);
        totalsByMarketplace.set(key, entry);
      });
    });

    const marketplaceTotals = Array.from(totalsByMarketplace.entries())
      .map(([key, data]) => {
        if (data.offers.size !== itemsList.length) {
          return null;
        }

        let total = 0;
        const breakdown: AggregatedOffer[] = [];
        let valid = true;

        itemsList.forEach((item) => {
          const offer = data.offers.get(item);
          if (!offer) {
            valid = false;
            return;
          }

          const comparablePrice = getComparablePrice(offer.preco);
          if (!Number.isFinite(comparablePrice)) {
            valid = false;
            return;
          }

          total += comparablePrice;
          breakdown.push({ item, offer });
        });

        if (!valid) {
          return null;
        }

        return {
          key,
          label: data.label || key,
          total,
          offers: breakdown,
        } as MarketplaceTotal;
      })
      .filter((entry): entry is MarketplaceTotal => entry !== null)
      .sort((a, b) => a.total - b.total);

    const bestSingleMarketplace = marketplaceTotals.length > 0 ? marketplaceTotals[0] : null;

    const economicalOffers = itemsList
      .map((item) => {
        const offers = sortedOffersByItem[item] ?? [];
        const bestOffer = offers.find((offer) => Number.isFinite(getComparablePrice(offer.preco)));
        if (!bestOffer) {
          return null;
        }
        return { item, offer: bestOffer } as AggregatedOffer;
      })
      .filter((entry): entry is AggregatedOffer => entry !== null);

    const bestEconomicalCombination: EconomicalCombination | null =
      economicalOffers.length === itemsList.length
        ? {
            total: economicalOffers.reduce(
              (sum, entry) => sum + getComparablePrice(entry.offer.preco),
              0,
            ),
            offers: economicalOffers,
          }
        : null;

    return { bestSingleMarketplace, bestEconomicalCombination };
  }, [itemsList, sortedOffersByItem]);

  const { bestSingleMarketplace, bestEconomicalCombination } = purchaseHighlights;

  const tableLayout = useMemo(() => {
    const itemFailures = new Map<string, boolean>();
    const markets = new Map<
      string,
      {
        label: string;
        offers: Map<string, Oferta>;
      }
    >();

    itemsList.forEach((item) => {
      itemFailures.set(item, failedItems.includes(item));
      const offers = sortedOffersByItem[item] ?? [];
      const bestByMarketplace = getBestOffersByMarketplace(offers);

      bestByMarketplace.forEach(({ label, offer }) => {
        const resolvedLabel =
          offer.mercado?.trim() ||
          label?.trim() ||
          offer.loja?.trim() ||
          "Marketplace";
        const marketKey = normalizeKey(resolvedLabel);
        if (!marketKey) {
          return;
        }

        const entry = markets.get(marketKey) ?? {
          label: resolvedLabel,
          offers: new Map<string, Oferta>(),
        };

        if (!entry.label && resolvedLabel) {
          entry.label = resolvedLabel;
        }

        const existing = entry.offers.get(item);
        if (!existing || getComparablePrice(offer.preco) < getComparablePrice(existing.preco)) {
          entry.offers.set(item, offer);
        }

        markets.set(marketKey, entry);
      });
    });

    const rows = Array.from(markets.entries())
      .map(([key, value]) => ({
        key,
        label: value.label || key,
        offers: value.offers,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return { rows, itemFailures };
  }, [itemsList, failedItems, sortedOffersByItem]);

  const hasSelectedMarketplaces = selectedMarketplaces.length > 0;
  if (itemsList.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.page, styles.center]}>
          <BrandHeader subtitle="Nenhum item informado" />
          <Text style={[styles.infoText, styles.centerText]}>
            Volte e adicione produtos à sua lista.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const noResultsLoaded = itemsList.every((item) => (resultsByItem[item] ?? []).length === 0);

  if (loading && noResultsLoaded) {
    return (
      <View style={[styles.page, styles.center]}>
        <ActivityIndicator size="large" color="#2b6cb0" />
        <Text style={[styles.infoText, styles.centerText]}>Buscando as melhores ofertas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <BrandHeader />
      <Text style={styles.heading}>Resultados da sua lista</Text>
      <Text style={styles.infoText}>
        {hasSelectedMarketplaces
          ? "Mostrando todas as ofertas dos mercados selecionados em ordem crescente."
          : "Mostrando todas as ofertas encontradas em ordem crescente."}
      </Text>

      {loading && !noResultsLoaded ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="small" color="#2b6cb0" />
          <Text style={[styles.infoText, styles.inlineLoadingText]}>Atualizando resultados...</Text>
        </View>
      ) : null}

      {error && noResultsLoaded ? (
        <View style={[styles.center, styles.errorContainer]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
        >
          {itemsList.length > 0 ? (
            <View style={styles.summarySection}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Menor preço total</Text>
                {bestSingleMarketplace ? (
                  <>
                    <Text style={styles.summaryCaption}>
                      Todos os itens no {bestSingleMarketplace.label}
                    </Text>
                    <View style={styles.summaryItems}>
                      {bestSingleMarketplace.offers.map(({ item, offer }) => (
                        <View
                          key={`${bestSingleMarketplace.key}-${normalizeKey(item)}`}
                          style={styles.summaryRow}
                        >
                          <View style={styles.summaryRowInfo}>
                            <Text style={styles.summaryItemName}>{item}</Text>
                            <Text style={styles.summaryItemStore}>
                              {offer.loja?.trim() || offer.mercado?.trim() || bestSingleMarketplace.label}
                            </Text>
                          </View>
                          <Text style={styles.summaryPrice}>{formatPrice(offer.preco)}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                      <Text style={styles.summaryTotalLabel}>Total</Text>
                      <Text style={styles.summaryTotalValue}>{formatPrice(bestSingleMarketplace.total)}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.infoText}>Nenhum mercado possui todos os itens disponíveis.</Text>
                )}
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Melhor compra econômica</Text>
                {bestEconomicalCombination ? (
                  <>
                    <Text style={styles.summaryCaption}>
                      Menores preços por item, independente da loja.
                    </Text>
                    <View style={styles.summaryItems}>
                      {bestEconomicalCombination.offers.map(({ item, offer }) => (
                        <View
                          key={`economico-${normalizeKey(item)}-${offer.link}`}
                          style={styles.summaryRow}
                        >
                          <View style={styles.summaryRowInfo}>
                            <Text style={styles.summaryItemName}>{item}</Text>
                            <Text style={styles.summaryItemStore}>
                              {offer.loja?.trim() || offer.mercado?.trim() || "Loja não informada"}
                            </Text>
                          </View>
                          <Text style={styles.summaryPrice}>{formatPrice(offer.preco)}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                      <Text style={styles.summaryTotalLabel}>Total</Text>
                      <Text style={styles.summaryTotalValue}>{formatPrice(bestEconomicalCombination.total)}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.infoText}>
                    Ainda não há ofertas suficientes para montar esta combinação.
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          {itemsList.length > 0 ? (
            <View style={styles.tableSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableWrapper}>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <View style={[styles.tableCell, styles.tableFirstCell, styles.tableMarketHeaderCell]}>
                      <Text style={styles.tableHeaderText}>Mercados</Text>
                    </View>
                    {itemsList.map((item) => (
                      <View
                        key={`item-header-${normalizeKey(item)}`}
                        style={[styles.tableCell, styles.tableItemHeaderCell]}
                      >
                        <Text style={styles.tableHeaderText}>{item}</Text>
                        {tableLayout.itemFailures.get(item) ? (
                          <Text style={styles.tableWarningText}>Falha ao carregar</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>

                  {tableLayout.rows.length === 0 ? (
                    <View style={[styles.tableRow, styles.tableEmptyRow]}>
                      <Text style={styles.infoText}>Nenhuma oferta disponível para os itens selecionados.</Text>
                    </View>
                  ) : (
                    tableLayout.rows.map((row) => (
                      <View key={`market-row-${row.key}`} style={[styles.tableRow, styles.tableBodyRow]}>
                        <View style={[styles.tableCell, styles.tableFirstCell, styles.tableMarketCell]}>
                          <Text style={styles.tableMarketLabel}>{row.label}</Text>
                        </View>
                        {itemsList.map((item) => {
                          const offer = row.offers.get(item);
                          return (
                            <View
                              key={`price-${row.key}-${normalizeKey(item)}`}
                              style={[styles.tableCell, styles.tableItemCell]}
                            >
                              {offer ? (
                                <>
                                  <Text style={styles.tablePriceValue}>{formatPrice(offer.preco)}</Text>
                                  {offer.loja ? (
                                    <Text style={styles.tableStoreName}>{offer.loja}</Text>
                                  ) : null}
                                  <TouchableOpacity
                                    onPress={() => Linking.openURL(offer.link)}
                                    style={styles.tableLinkButton}
                                  >
                                    <Text style={styles.tableLinkButtonText}>Abrir</Text>
                                  </TouchableOpacity>
                                </>
                              ) : (
                                <Text style={styles.tableMissingText}>—</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7fafc",
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "#f7fafc",
  },
  heading: { fontSize: 20, fontWeight: "700", marginBottom: 8, color: "#1A202C" },
  infoText: { fontSize: 14, color: "#4A5568" },
  center: { alignItems: "center", justifyContent: "center" },
  centerText: { marginTop: 12, textAlign: "center" },
  inlineLoading: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  inlineLoadingText: { marginLeft: 8 },
  errorContainer: { marginTop: 32 },
  errorText: { fontSize: 16, color: "#E53E3E", textAlign: "center" },
  resultsContainer: { paddingTop: 16, paddingBottom: 32, gap: 16 },
  summarySection: { gap: 16 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryTitle: { fontSize: 16, fontWeight: "700", color: "#2D3748" },
  summaryCaption: { fontSize: 13, color: "#4A5568" },
  summaryItems: { gap: 12 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  summaryRowInfo: { flex: 1, gap: 2 },
  summaryItemName: { fontSize: 14, fontWeight: "600", color: "#2D3748" },
  summaryItemStore: { fontSize: 12, color: "#4A5568" },
  summaryPrice: { fontSize: 14, fontWeight: "600", color: "#0F9D58" },
  summaryTotalRow: { borderTopWidth: 1, borderColor: "#E2E8F0", paddingTop: 12, marginTop: 4 },
  summaryTotalLabel: { fontSize: 14, fontWeight: "700", color: "#2D3748" },
  summaryTotalValue: { fontSize: 16, fontWeight: "700", color: "#0F9D58" },
  tableSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  tableWrapper: { flexDirection: "column" },
  tableRow: { flexDirection: "row" },
  tableHeaderRow: {
    backgroundColor: "#EDF2F7",
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableBodyRow: {
    borderTopWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableEmptyRow: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableFirstCell: { borderLeftWidth: 0 },
  tableMarketHeaderCell: {
    width: TABLE_MARKET_COLUMN_WIDTH,
    justifyContent: "center",
  },
  tableItemHeaderCell: {
    width: TABLE_ITEM_COLUMN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  tableMarketCell: {
    width: TABLE_MARKET_COLUMN_WIDTH,
    justifyContent: "center",
  },
  tableItemCell: {
    width: TABLE_ITEM_COLUMN_WIDTH,
    alignItems: "flex-start",
    gap: 6,
  },
  tableHeaderText: { fontSize: 13, fontWeight: "600", color: "#2D3748", textAlign: "center" },
  tableWarningText: { marginTop: 4, fontSize: 11, color: "#E53E3E", textAlign: "center" },
  tableMarketLabel: { fontSize: 14, fontWeight: "600", color: "#2D3748" },
  tablePriceValue: { fontSize: 16, fontWeight: "700", color: "#0F9D58" },
  tableStoreName: { fontSize: 12, color: "#4A5568" },
  tableMissingText: { fontSize: 16, color: "#CBD5E0", textAlign: "center" },
  tableLinkButton: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#2b6cb0",
    borderRadius: 8,
  },
  tableLinkButtonText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});
