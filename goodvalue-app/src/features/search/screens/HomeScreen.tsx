import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";
import { resolveApiUrl } from "../../../shared/api";
import {
  FALLBACK_MARKETPLACES,
  FALLBACK_SUGGESTIONS,
} from "../config";
import { buildMarketplaceList, normalizeKey } from "../utils/marketplaces";
import { BrandHeader } from "../../../shared/components/BrandHeader";

const API_URL = resolveApiUrl();

export default function HomeScreen() {
  console.log('[HomeScreen] render start');
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_SUGGESTIONS);
  const [marketplaces, setMarketplaces] = useState<string[]>(FALLBACK_MARKETPLACES);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);

  useEffect(() => {
    setLoadingSuggestions(true);
    axios
      .get(`${API_URL}/suggestions`)
      .then((response) => {
        const items = response.data?.suggestions;
        if (Array.isArray(items) && items.length > 0) {
          setSuggestions(items.slice(0, 10));
        }
      })
      .catch((err) => {
        console.warn("Não foi possível carregar as sugestões de produtos", err);
      })
      .finally(() => setLoadingSuggestions(false));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_URL}/marketplaces`)
      .then((response) => {
        const items = response.data?.marketplaces;
        if (Array.isArray(items) && items.length > 0) {
          const curatedList = buildMarketplaceList(items);
          if (curatedList.length > 0) {
            setMarketplaces(curatedList);
            return;
          }
        }
        setMarketplaces(FALLBACK_MARKETPLACES);
      })
      .catch((err) => {
        console.warn("Não foi possível carregar as plataformas disponíveis", err);
      });
  }, []);

  const addItem = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    const key = normalizeKey(normalized);
    setItems((current) => {
      if (current.some((item) => normalizeKey(item) === key)) {
        return current;
      }
      return [...current, normalized];
    });
  };

  const removeItem = (value: string) => {
    const key = normalizeKey(value);
    setItems((current) => current.filter((item) => normalizeKey(item) !== key));
  };

  const toggleItem = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return;
    const key = normalizeKey(normalized);
    setItems((current) => {
      if (current.some((item) => normalizeKey(item) === key)) {
        return current.filter((item) => normalizeKey(item) !== key);
      }
      return [...current, normalized];
    });
  };

  const handleAddFromInput = () => {
    addItem(inputValue);
    setInputValue("");
  };

  const addPendingInputToItems = (): string[] => {
    const normalized = inputValue.trim();
    if (!normalized) {
      return items;
    }
    const key = normalizeKey(normalized);
    if (items.some((item) => normalizeKey(item) === key)) {
      setInputValue("");
      return items;
    }
    const updated = [...items, normalized];
    setItems(updated);
    setInputValue("");
    return updated;
  };

  const handleSearch = () => {
    const readyItems = addPendingInputToItems();
    if (readyItems.length === 0) return;

    const params: Record<string, string> = { items: JSON.stringify(readyItems) };
    if (selectedMarketplaces.length > 0) {
      params.marketplaces = JSON.stringify(selectedMarketplaces);
    }

    router.push({ pathname: "/results", params });
  };

  const toggleMarketplace = (market: string) => {
    const normalized = market.trim();
    if (!normalized) return;
    const key = normalizeKey(normalized);
    setSelectedMarketplaces((current) => {
      if (current.some((item) => normalizeKey(item) === key)) {
        return current.filter((item) => normalizeKey(item) !== key);
      }
      return [...current, normalized];
    });
  };

  const isItemSelected = (value: string) =>
    items.some((item) => normalizeKey(item) === normalizeKey(value));

  const canAddItem = Boolean(inputValue.trim());
  const canSearch = canAddItem || items.length > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader />
      <View style={styles.inputGroup}>
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Digite o produto, ex: arroz"
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleAddFromInput}
            returnKeyType="done"
            blurOnSubmit={false}
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.addButton, !canAddItem && styles.buttonDisabled]}
            disabled={!canAddItem}
            onPress={handleAddFromInput}
          >
            <Text style={[styles.addButtonText, !canAddItem && styles.buttonDisabledText]}>Adicionar item</Text>
          </TouchableOpacity>
        </View>

        {items.length > 0 ? (
          <View style={styles.itemList}>
            {items.map((item) => (
              <View key={normalizeKey(item)} style={styles.itemChip}>
                <Text style={styles.itemChipText}>{item}</Text>
                <TouchableOpacity
                  onPress={() => removeItem(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${item}`}
                  style={styles.itemChipRemoveButton}
                >
                  <Text style={styles.itemChipRemove}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyListText}>Adicione produtos para montar sua lista de compras.</Text>
        )}

        <TouchableOpacity
          style={[styles.searchButton, !canSearch && styles.searchButtonDisabled]}
          disabled={!canSearch}
          onPress={handleSearch}
        >
          <Text style={[styles.searchButtonText, !canSearch && styles.buttonDisabledText]}>Buscar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Sugestões Populares (clique nas suas escolhas)</Text>
      {loadingSuggestions ? (
        <View style={styles.loadingHolder}>
          <ActivityIndicator color="#2b6cb0" />
        </View>
      ) : (
        <View style={styles.suggestionGrid}>
          {suggestions.map((item) => {
            const selected = isItemSelected(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.suggestionChip, selected && styles.suggestionChipSelected]}
                onPress={() => toggleItem(item)}
              >
                <Text style={[styles.suggestionText, selected && styles.suggestionTextSelected]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Lojas (clique nas suas escolhas)</Text>
      <View style={styles.marketplaceList}>
        {marketplaces.map((market) => {
          const isActive = selectedMarketplaces.some((value) => normalizeKey(value) === normalizeKey(market));
          return (
            <TouchableOpacity
              key={market}
              style={[styles.marketChip, isActive && styles.marketChipActive]}
              onPress={() => toggleMarketplace(market)}
            >
              <Text style={[styles.marketText, isActive && styles.marketTextActive]}>{market}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedMarketplaces.length > 0 ? (
        <Text style={styles.helperLabel}>
          Filtrando resultados por:{" "}
          <Text style={styles.helperLabelHighlight}>{selectedMarketplaces.join(", ")}</Text>
        </Text>
      ) : (
        <Text style={styles.helperLabel}>Nenhuma loja selecionada. Pesquisaremos em todas as disponíveis.</Text>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7fafc",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 32,
    gap: 18,
  },
  inputGroup: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  addButton: {
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  addButtonText: { color: "#1A202C", fontSize: 14, fontWeight: "600" },
  buttonDisabled: { backgroundColor: "#EDF2F7" },
  buttonDisabledText: { color: "#A0AEC0" },
  searchButton: {
    backgroundColor: "#2b6cb0",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  searchButtonDisabled: { backgroundColor: "#A0AEC0" },
  searchButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#2D3748" },
  loadingHolder: { paddingVertical: 16 },
  emptyListText: { color: "#4A5568" },
  itemList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  itemChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2b6cb0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  itemChipText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  itemChipRemoveButton: { paddingHorizontal: 4, paddingVertical: 2 },
  itemChipRemove: { color: "#fff", fontSize: 16, fontWeight: "700" },
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  suggestionChip: {
    backgroundColor: "#EDF2F7",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  suggestionChipSelected: {
    backgroundColor: "#2b6cb0",
  },
  suggestionText: { color: "#2D3748", fontSize: 14, fontWeight: "500" },
  suggestionTextSelected: { color: "#fff" },
  marketplaceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  marketChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E0",
    backgroundColor: "#fff",
  },
  marketChipActive: {
    backgroundColor: "#2b6cb0",
    borderColor: "#2b6cb0",
  },
  marketText: { color: "#2D3748", fontSize: 14 },
  marketTextActive: { color: "#fff", fontWeight: "700" },
  helperLabel: { textAlign: "center", color: "#4A5568" },
  helperLabelHighlight: { fontWeight: "700", color: "#2b6cb0" },
});
