import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Sparkles,
  Plus,
  X,
  Check,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from 'lucide-react-native';
import { API_ENDPOINTS, resolveImageUrl } from '../config/api';
import { Product } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useProductDetailStore } from '../store/productDetailStore';
import { getProductWeightDisplay } from '../utils/cannabisLimit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 12;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

export interface CatalogCategoryItem {
  id: string;
  name: string;
  backendName: string;
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}

export interface CategoryCatalogProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  heroImage?: any;
  categories: CatalogCategoryItem[];
  allCategoryBackendQuery: string;
  allCategoryLabel: string;
  accentColor?: string;
}

type FilterTab = 'category' | 'strain' | 'price' | 'brand';
type PriceRange = 'all' | 'under-20' | '20-40' | '40-60' | 'above-60';
type SortOption = 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'thc-desc';

const PRICE_RANGE_OPTIONS: { id: PriceRange; label: string; min?: number; max?: number }[] = [
  { id: 'all', label: 'All Prices' },
  { id: 'under-20', label: 'Under $20', max: 20 },
  { id: '20-40', label: '$20 – $40', min: 20, max: 40 },
  { id: '40-60', label: '$40 – $60', min: 40, max: 60 },
  { id: 'above-60', label: '$60 & Above', min: 60 },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'default', label: 'Featured / Default' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'name-asc', label: 'Name: A to Z' },
  { id: 'thc-desc', label: 'THC: High to Low' },
];

export default function CategoryCatalogScreen({
  title,
  categories,
  allCategoryBackendQuery,
  allCategoryLabel,
  accentColor = '#0166dc',
}: CategoryCatalogProps) {
  const navigation = useNavigation<any>();

  // ── Local State (Primitive hooks first) ──────────────────────
  const [selectedCategory, setSelectedCategory] = useState<CatalogCategoryItem>({
    id: 'all',
    name: allCategoryLabel,
    backendName: allCategoryBackendQuery,
    icon: Sparkles,
  });
  const [selectedStrain, setSelectedStrain] = useState<string | null>(null);
  const [backendStrains, setBackendStrains] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [addedPopupId, setAddedPopupId] = useState<string | null>(null);

  // Filter Modal State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('category');
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');

  // ── Memoized Category List ───────────────────────────────────
  const allCategoryItem = useMemo<CatalogCategoryItem>(() => ({
    id: 'all',
    name: allCategoryLabel,
    backendName: allCategoryBackendQuery,
    icon: Sparkles,
  }), [allCategoryLabel, allCategoryBackendQuery]);

  const fullCategoryList = useMemo<CatalogCategoryItem[]>(() => [
    allCategoryItem,
    ...categories,
  ], [allCategoryItem, categories]);

  // ── Zustand Stores ───────────────────────────────────────────
  const cartItemCount = useCartStore(state => state.totalCount);
  const addToCart = useCartStore(state => state.addToCart);
  const openCart = useCartStore(state => state.openCart);
  const openDetail = useProductDetailStore(state => state.openDetail);

  // ── Navigation ───────────────────────────────────────────────
  const handleBack = () => {
    try {
      if (navigation?.navigate) {
        navigation.navigate('Home');
        return;
      }
      if (navigation?.jumpTo) {
        navigation.jumpTo('Home');
        return;
      }
      const parent = navigation?.getParent?.();
      if (parent?.navigate) {
        parent.navigate('Home');
        return;
      }
      if (navigation?.goBack) {
        navigation.goBack();
      }
    } catch (err) {
      console.warn('Catalog back navigation error:', err);
    }
  };

  // ── Reset Filters when navigating away or switching main tab ─
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSearchQuery('');
        setIsFilterModalOpen(false);
      };
    }, [])
  );

  // ── Fetch products from backend ──────────────────────────────
  const fetchProducts = useCallback(async (
    backendCategory: string,
    isRefresh = false,
  ) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (backendCategory) {
        params.append('category', backendCategory);
      }
      params.append('hasImage', 'true');
      params.append('limit', '150');

      const url = `${API_ENDPOINTS.products}?${params.toString()}`;
      const res = await fetch(url);
      const json = await res.json();
      const list: Product[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.products)
        ? json.products
        : Array.isArray(json?.data)
        ? json.data
        : [];
      setProducts(list);
    } catch (err) {
      console.warn(`Failed to fetch products for ${title}:`, err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [title]);

  useEffect(() => {
    fetchProducts(selectedCategory.backendName);
  }, [selectedCategory, fetchProducts]);

  // ── Fetch Strains from backend API meta endpoint ─────────────
  useEffect(() => {
    let isMounted = true;
    fetch(`${API_ENDPOINTS.products}/meta/strains`)
      .then(res => res.json())
      .then(data => {
        if (isMounted && Array.isArray(data?.strains)) {
          setBackendStrains(
            data.strains.filter(
              (s: string) => s && s.toLowerCase() !== 'none' && s.toLowerCase() !== 'null',
            ),
          );
        }
      })
      .catch(err => {
        console.warn('Could not fetch backend strains:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = () => {
    fetchProducts(selectedCategory.backendName, true);
  };

  // ── Extract Available Strains dynamically from backend + products ──
  const availableStrains = useMemo(() => {
    const strainSet = new Set<string>();

    // 1. Add strains from backend API response (e.g. Hybrid, Indica, Sativa, Blend, CBD...)
    backendStrains.forEach(s => {
      if (s && typeof s === 'string') {
        const clean = s.trim();
        if (clean && clean.toLowerCase() !== 'none' && clean.toLowerCase() !== 'others') {
          strainSet.add(clean);
        }
      }
    });

    // 2. Discover any distinct strains directly from loaded products
    products.forEach(p => {
      if (p.strain && typeof p.strain === 'string') {
        const clean = p.strain.trim();
        if (
          clean &&
          clean.toLowerCase() !== 'none' &&
          clean.toLowerCase() !== 'null' &&
          clean.toLowerCase() !== 'others'
        ) {
          strainSet.add(clean);
        }
      }
    });

    // 3. Guarantee canonical strains if list is empty
    if (strainSet.size === 0) {
      strainSet.add('Hybrid');
      strainSet.add('Indica');
      strainSet.add('Sativa');
    }

    const list = Array.from(strainSet);
    const priority = ['Hybrid', 'Indica', 'Sativa'];
    return list.sort((a, b) => {
      const idxA = priority.findIndex(p => p.toLowerCase() === a.toLowerCase());
      const idxB = priority.findIndex(p => p.toLowerCase() === b.toLowerCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [backendStrains, products]);

  // ── Extract Available Brands dynamically ─────────────────────
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach(p => {
      if (p.brand && typeof p.brand === 'string') {
        const clean = p.brand.trim();
        if (clean) brandsSet.add(clean);
      }
    });
    return Array.from(brandsSet).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredBrandsList = useMemo(() => {
    if (!brandSearchQuery.trim()) return availableBrands;
    const q = brandSearchQuery.toLowerCase().trim();
    return availableBrands.filter(b => b.toLowerCase().includes(q));
  }, [availableBrands, brandSearchQuery]);

  // ── Client-side Filter & Sort Pipeline ───────────────────────
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const name = p.product_name?.toLowerCase() || '';
        const brand = p.brand?.toLowerCase() || '';
        const sku = p.sku?.toLowerCase() || '';
        const cat = p.category?.toLowerCase() || '';
        return name.includes(q) || brand.includes(q) || sku.includes(q) || cat.includes(q);
      });
    }

    // 2. Strain filter (Hybrid, Indica, Sativa...)
    if (selectedStrain) {
      result = result.filter(
        p => p.strain && p.strain.trim().toLowerCase() === selectedStrain.trim().toLowerCase(),
      );
    }

    // 3. Brand filter
    if (selectedBrand) {
      result = result.filter(p => p.brand?.trim() === selectedBrand);
    }

    // 4. Price range filter
    if (selectedPriceRange !== 'all') {
      const range = PRICE_RANGE_OPTIONS.find(r => r.id === selectedPriceRange);
      if (range) {
        result = result.filter(p => {
          const price = parseFloat(p.retail_price || '0');
          if (range.min !== undefined && price < range.min) return false;
          if (range.max !== undefined && price > range.max) return false;
          return true;
        });
      }
    }

    // 5. Sort
    if (sortBy === 'price-asc') {
      result.sort((a, b) => parseFloat(a.retail_price || '0') - parseFloat(b.retail_price || '0'));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => parseFloat(b.retail_price || '0') - parseFloat(a.retail_price || '0'));
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
    } else if (sortBy === 'thc-desc') {
      result.sort((a, b) => parseFloat(b.thC_LEVEL || '0') - parseFloat(a.thC_LEVEL || '0'));
    }

    return result;
  }, [products, searchQuery, selectedStrain, selectedBrand, selectedPriceRange, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory.id !== 'all') count++;
    if (selectedStrain) count++;
    if (selectedBrand) count++;
    if (selectedPriceRange !== 'all') count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [selectedCategory, selectedStrain, selectedBrand, selectedPriceRange, sortBy]);

  const handleResetFilters = () => {
    setSelectedCategory(allCategoryItem);
    setSelectedStrain(null);
    setSelectedBrand(null);
    setSelectedPriceRange('all');
    setSortBy('default');
    setBrandSearchQuery('');
  };

  const openFilterWithTab = (tab: FilterTab) => {
    setActiveFilterTab(tab);
    setIsFilterModalOpen(true);
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1, true);
    const id = product.pk || product.sku;
    setAddedPopupId(id);
    setTimeout(() => {
      setAddedPopupId(prev => (prev === id ? null : prev));
    }, 1200);
  };

  const getPricePillLabel = () => {
    if (selectedPriceRange !== 'all') {
      const match = PRICE_RANGE_OPTIONS.find(r => r.id === selectedPriceRange);
      return match ? match.label : 'Price';
    }
    if (sortBy === 'price-asc') return 'Low-to-High';
    if (sortBy === 'price-desc') return 'High-to-Low';
    if (sortBy === 'thc-desc') return 'High THC';
    if (sortBy === 'name-asc') return 'A-Z';
    return 'All Prices';
  };

  // ── Product Item Card ────────────────────────────────────────
  const renderProductItem = ({ item }: { item: Product }) => {
    console.log("item",item);
    
    const isAdded = addedPopupId === (item.pk || item.sku);
    const strain = item.strain;

    let strainBadgeStyle = styles.hybridBadge;
    let strainTextStyle = styles.hybridText;
    if (strain === 'Sativa') {
      strainBadgeStyle = styles.sativaBadge;
      strainTextStyle = styles.sativaText;
    } else if (strain === 'Indica') {
      strainBadgeStyle = styles.indicaBadge;
      strainTextStyle = styles.indicaText;
    }

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={0.9}
          onPress={() => openDetail(item)}>
          {item.imageUrl ? (
            <Image
              source={{ uri: resolveImageUrl(item.imageUrl) || item.imageUrl }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>🌿</Text>
            </View>
          )}

          {strain ? (
            <View style={[styles.strainBadge, strainBadgeStyle]}>
              <Text style={[styles.strainText, strainTextStyle]}>{strain}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.cardDetails}>
          {/* Brand & Weight */}
          <View style={styles.brandRow}>
            {item.brand ? (
              <Text style={styles.brandText} numberOfLines={1}>
                {item.brand}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            {getProductWeightDisplay(item) ? (
              <View style={styles.weightBadge}>
                <Text style={styles.weightBadgeText}>
                  {getProductWeightDisplay(item)}
                </Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={() => openDetail(item)}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
          </TouchableOpacity>

          {item.thC_LEVEL ? (
            <Text style={styles.thcText}>THC: {item.thC_LEVEL}%</Text>
          ) : (
            <Text style={styles.categoryTag} numberOfLines={1}>
              {item.category || title}
            </Text>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              ${parseFloat(item.retail_price || '0').toFixed(2)}
            </Text>

            <TouchableOpacity
              style={[styles.addBtn, isAdded && styles.addBtnSuccess]}
              onPress={() => handleAddToCart(item)}
              activeOpacity={0.85}>
              {isAdded ? (
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── 1. Top Header: Back Arrow, Center Title, Right Cart ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={openCart}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <ShoppingCart size={22} color="#0F172A" strokeWidth={2.2} />
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── 2. Search Bar with Filter Icon on Right ────────────── */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748B" strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${title}...`}
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFiltersCount > 0 && styles.filterButtonActive,
          ]}
          onPress={() => setIsFilterModalOpen(true)}
          activeOpacity={0.8}>
          <SlidersHorizontal
            size={18}
            color={activeFiltersCount > 0 ? '#FFFFFF' : '#1E293B'}
            strokeWidth={2.2}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── 3. Dropdowns: Category, Strain, Price & Brand Quick Toggles ── */}
      <View style={styles.dropdownRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dropdownScroll}>
          {/* Category Dropdown Pill */}
          <TouchableOpacity
            style={[
              styles.dropdownPill,
              selectedCategory.id !== 'all' && styles.dropdownPillActive,
            ]}
            onPress={() => openFilterWithTab('category')}
            activeOpacity={0.75}>
            <Text
              style={[
                styles.dropdownPillLabel,
                selectedCategory.id !== 'all' && styles.dropdownPillLabelActive,
              ]}
              numberOfLines={1}>
              {selectedCategory.id === 'all' ? 'Category: All' : selectedCategory.name}
            </Text>
            <ChevronDown
              size={14}
              color={selectedCategory.id !== 'all' ? '#1D4ED8' : '#64748B'}
              strokeWidth={2.2}
            />
          </TouchableOpacity>

          {/* Strain Dropdown Pill (Hybrid, Indica, Sativa...) */}
          {selectedStrain ? (
            <TouchableOpacity
              style={[styles.dropdownPill, styles.dropdownPillActive]}
              onPress={() => openFilterWithTab('strain')}
              activeOpacity={0.75}>
              <Text
                style={[styles.dropdownPillLabel, styles.dropdownPillLabelActive]}
                numberOfLines={1}>
                {selectedStrain}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedStrain(null)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <X size={12} color="#1D4ED8" strokeWidth={2.5} />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.dropdownPill}
              onPress={() => openFilterWithTab('strain')}
              activeOpacity={0.75}>
              <Text style={styles.dropdownPillLabel} numberOfLines={1}>
                Strain: All
              </Text>
              <ChevronDown size={14} color="#64748B" strokeWidth={2.2} />
            </TouchableOpacity>
          )}

          {/* Price Dropdown Pill */}
          <TouchableOpacity
            style={[
              styles.dropdownPill,
              (selectedPriceRange !== 'all' || sortBy !== 'default') && styles.dropdownPillActive,
            ]}
            onPress={() => openFilterWithTab('price')}
            activeOpacity={0.75}>
            <Text
              style={[
                styles.dropdownPillLabel,
                (selectedPriceRange !== 'all' || sortBy !== 'default') && styles.dropdownPillLabelActive,
              ]}
              numberOfLines={1}>
              {getPricePillLabel()}
            </Text>
            <ChevronDown
              size={14}
              color={(selectedPriceRange !== 'all' || sortBy !== 'default') ? '#1D4ED8' : '#64748B'}
              strokeWidth={2.2}
            />
          </TouchableOpacity>

          {/* Brand Dropdown Pill */}
          {selectedBrand ? (
            <TouchableOpacity
              style={[styles.dropdownPill, styles.dropdownPillActive]}
              onPress={() => openFilterWithTab('brand')}
              activeOpacity={0.75}>
              <Text style={[styles.dropdownPillLabel, styles.dropdownPillLabelActive]} numberOfLines={1}>
                {selectedBrand}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedBrand(null)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <X size={12} color="#1D4ED8" strokeWidth={2.5} />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.dropdownPill}
              onPress={() => openFilterWithTab('brand')}
              activeOpacity={0.75}>
              <Text style={styles.dropdownPillLabel} numberOfLines={1}>
                Brand: All
              </Text>
              <ChevronDown size={14} color="#64748B" strokeWidth={2.2} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* ── Active Filter Clear Bar (shows only when filters applied) ── */}
      {activeFiltersCount > 0 && (
        <View style={styles.filterStatusRow}>
          <Text style={styles.filterStatusText}>
            Showing {filteredProducts.length} results
          </Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetFilters}
            activeOpacity={0.7}>
            <RotateCcw size={12} color="#EF4444" strokeWidth={2} />
            <Text style={styles.resetButtonText}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 4. Full Width Product Cards Grid ───────────────────── */}
      {isLoading && products.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.pk || item.sku || item.product_name}
          renderItem={renderProductItem}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsListContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🌿</Text>
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery || activeFiltersCount > 0
                  ? 'No items match your selected filters or search terms.'
                  : 'No items currently available in this category.'}
              </Text>
              {(searchQuery || activeFiltersCount > 0) && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    setSearchQuery('');
                    handleResetFilters();
                  }}>
                  <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── 5. Multi-Tab Filter Modal ──────────────────────────── */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setIsFilterModalOpen(false)}
          />
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Filter Products</Text>
                <Text style={styles.modalSubtitle}>
                  {filteredProducts.length} items found
                </Text>
              </View>

              <View style={styles.modalHeaderActions}>
                {activeFiltersCount > 0 && (
                  <TouchableOpacity
                    style={styles.modalResetBtn}
                    onPress={handleResetFilters}
                    activeOpacity={0.7}>
                    <Text style={styles.modalResetText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setIsFilterModalOpen(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={20} color="#0F172A" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Body: Left Tab Sidebar + Right Options Content */}
            <View style={styles.modalBody}>
              {/* Left Side: Filter Tabs */}
              <View style={styles.filterTabsSidebar}>
                <TouchableOpacity
                  style={[
                    styles.filterTabItem,
                    activeFilterTab === 'category' && styles.filterTabItemActive,
                  ]}
                  onPress={() => setActiveFilterTab('category')}>
                  <Text
                    style={[
                      styles.filterTabLabel,
                      activeFilterTab === 'category' && styles.filterTabLabelActive,
                    ]}>
                    Category
                  </Text>
                  {selectedCategory.id !== 'all' && <View style={styles.tabActiveDot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterTabItem,
                    activeFilterTab === 'strain' && styles.filterTabItemActive,
                  ]}
                  onPress={() => setActiveFilterTab('strain')}>
                  <Text
                    style={[
                      styles.filterTabLabel,
                      activeFilterTab === 'strain' && styles.filterTabLabelActive,
                    ]}>
                    Strain
                  </Text>
                  {selectedStrain !== null && <View style={styles.tabActiveDot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterTabItem,
                    activeFilterTab === 'price' && styles.filterTabItemActive,
                  ]}
                  onPress={() => setActiveFilterTab('price')}>
                  <Text
                    style={[
                      styles.filterTabLabel,
                      activeFilterTab === 'price' && styles.filterTabLabelActive,
                    ]}>
                    Price & Sort
                  </Text>
                  {(selectedPriceRange !== 'all' || sortBy !== 'default') && (
                    <View style={styles.tabActiveDot} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterTabItem,
                    activeFilterTab === 'brand' && styles.filterTabItemActive,
                  ]}
                  onPress={() => setActiveFilterTab('brand')}>
                  <Text
                    style={[
                      styles.filterTabLabel,
                      activeFilterTab === 'brand' && styles.filterTabLabelActive,
                    ]}>
                    Brand
                  </Text>
                  {selectedBrand !== null && <View style={styles.tabActiveDot} />}
                </TouchableOpacity>
              </View>

              {/* Right Side: Options Pane */}
              <View style={styles.filterContentPane}>
                {/* CATEGORY TAB CONTENT */}
                {activeFilterTab === 'category' && (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.filterOptionsScroll}>
                    <Text style={styles.sectionHeader}>Categories</Text>
                    {fullCategoryList.map(cat => {
                      const isSelected = selectedCategory.id === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.optionRow,
                            isSelected && styles.optionRowSelected,
                          ]}
                          onPress={() => setSelectedCategory(cat)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}
                            numberOfLines={2}>
                            {cat.name}
                          </Text>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                            ]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* STRAIN TAB CONTENT */}
                {activeFilterTab === 'strain' && (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.filterOptionsScroll}>
                    <Text style={styles.sectionHeader}>Strain Type</Text>

                    {/* All Strains option */}
                    <TouchableOpacity
                      style={[
                        styles.optionRow,
                        selectedStrain === null && styles.optionRowSelected,
                      ]}
                      onPress={() => setSelectedStrain(null)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.optionLabel,
                          selectedStrain === null && styles.optionLabelSelected,
                        ]}>
                        All Strains
                      </Text>
                      <View
                        style={[
                          styles.radioCircle,
                          selectedStrain === null && styles.radioCircleSelected,
                        ]}>
                        {selectedStrain === null && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>

                    {/* Strains from backend API (Hybrid, Indica, Sativa, Blend, CBD...) */}
                    {availableStrains.map(strainName => {
                      const isSelected = selectedStrain?.toLowerCase() === strainName.toLowerCase();
                      const lower = strainName.toLowerCase();
                      let pillBg = '#F1F5F9';
                      let pillColor = '#475569';
                      if (lower.includes('hybrid')) {
                        pillBg = '#DBEAFE';
                        pillColor = '#1D4ED8';
                      } else if (lower.includes('indica')) {
                        pillBg = '#EDE9FE';
                        pillColor = '#7C3AED';
                      } else if (lower.includes('sativa')) {
                        pillBg = '#FEF3C7';
                        pillColor = '#D97706';
                      }

                      return (
                        <TouchableOpacity
                          key={strainName}
                          style={[
                            styles.optionRow,
                            isSelected && styles.optionRowSelected,
                          ]}
                          onPress={() => setSelectedStrain(isSelected ? null : strainName)}
                          activeOpacity={0.7}>
                          <View style={styles.strainOptionLeft}>
                            <View style={[styles.strainColorDot, { backgroundColor: pillColor }]} />
                            <Text
                              style={[
                                styles.optionLabel,
                                isSelected && styles.optionLabelSelected,
                              ]}>
                              {strainName}
                            </Text>
                            <View style={[styles.strainMiniBadge, { backgroundColor: pillBg }]}>
                              <Text style={[styles.strainMiniBadgeText, { color: pillColor }]}>
                                {strainName.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                            ]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* PRICE & SORT TAB CONTENT */}
                {activeFilterTab === 'price' && (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.filterOptionsScroll}>
                    <Text style={styles.sectionHeader}>Sort By</Text>
                    {SORT_OPTIONS.map(opt => {
                      const isSelected = sortBy === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.optionRow,
                            isSelected && styles.optionRowSelected,
                          ]}
                          onPress={() => setSortBy(opt.id)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}>
                            {opt.label}
                          </Text>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                            ]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    <Text style={[styles.sectionHeader, { marginTop: 18 }]}>
                      Price Range
                    </Text>
                    {PRICE_RANGE_OPTIONS.map(opt => {
                      const isSelected = selectedPriceRange === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.optionRow,
                            isSelected && styles.optionRowSelected,
                          ]}
                          onPress={() => setSelectedPriceRange(opt.id)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.optionLabel,
                              isSelected && styles.optionLabelSelected,
                            ]}>
                            {opt.label}
                          </Text>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleSelected,
                            ]}>
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* BRAND TAB CONTENT */}
                {activeFilterTab === 'brand' && (
                  <View style={styles.brandContentContainer}>
                    <View style={styles.brandSearchRow}>
                      <Search size={14} color="#64748B" />
                      <TextInput
                        style={styles.brandSearchInput}
                        placeholder="Search brands (e.g. Buzz'd)..."
                        placeholderTextColor="#94A3B8"
                        value={brandSearchQuery}
                        onChangeText={setBrandSearchQuery}
                      />
                      {brandSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setBrandSearchQuery('')}>
                          <X size={14} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.filterOptionsScroll}>
                      {/* All Brands option */}
                      <TouchableOpacity
                        style={[
                          styles.optionRow,
                          selectedBrand === null && styles.optionRowSelected,
                        ]}
                        onPress={() => setSelectedBrand(null)}
                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.optionLabel,
                            selectedBrand === null && styles.optionLabelSelected,
                          ]}>
                          All Brands
                        </Text>
                        <View
                          style={[
                            styles.radioCircle,
                            selectedBrand === null && styles.radioCircleSelected,
                          ]}>
                          {selectedBrand === null && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>

                      {filteredBrandsList.length === 0 ? (
                        <View style={styles.noBrandsFound}>
                          <Text style={styles.noBrandsText}>No matching brands</Text>
                        </View>
                      ) : (
                        filteredBrandsList.map(brandName => {
                          const isSelected = selectedBrand === brandName;
                          return (
                            <TouchableOpacity
                              key={brandName}
                              style={[
                                styles.optionRow,
                                isSelected && styles.optionRowSelected,
                              ]}
                              onPress={() => setSelectedBrand(isSelected ? null : brandName)}
                              activeOpacity={0.7}>
                              <Text
                                style={[
                                  styles.optionLabel,
                                  isSelected && styles.optionLabelSelected,
                                ]}
                                numberOfLines={1}>
                                {brandName}
                              </Text>
                              <View
                                style={[
                                  styles.radioCircle,
                                  isSelected && styles.radioCircleSelected,
                                ]}>
                                {isSelected && <View style={styles.radioDot} />}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyFilterBtn}
                onPress={() => setIsFilterModalOpen(false)}
                activeOpacity={0.85}>
                <Text style={styles.applyFilterBtnText}>
                  Apply Filters ({filteredProducts.length} Items)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // 1. Header
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#3B82F6',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // 2. Search & Filter Bar
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flex: 1,
    height: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  // 3. Dropdown Quick Toggles
  dropdownRow: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 8,
  },
  dropdownScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 8,
  },
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  dropdownPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  dropdownPillLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  dropdownPillLabelActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },

  // Filter Status Bar
  filterStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  filterStatusText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetButtonText: {
    fontSize: 11.5,
    color: '#EF4444',
    fontWeight: '700',
  },

  // Center / Loading
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // 4. Product Cards Grid (Full Screen Width)
  productsListContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 10,
    paddingBottom: 30,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    fontSize: 32,
  },
  strainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  strainText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sativaBadge: {
    backgroundColor: '#FEF3C7',
  },
  sativaText: {
    color: '#D97706',
  },
  indicaBadge: {
    backgroundColor: '#EDE9FE',
  },
  indicaText: {
    color: '#7C3AED',
  },
  hybridBadge: {
    backgroundColor: '#DBEAFE',
  },
  hybridText: {
    color: '#1D4ED8',
  },

  // Card details
  cardDetails: {
    padding: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 4,
  },
  brandText: {
    flex: 1,
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  weightBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weightBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#475569',
  },
  productName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 16,
    minHeight: 32,
    marginBottom: 4,
  },
  thcText: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '700',
    marginBottom: 6,
  },
  categoryTag: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSuccess: {
    backgroundColor: '#2563EB',
  },

  // Empty state
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  clearFiltersBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── 5. Multi-Tab Filter Modal Styles ─────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalResetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    flex: 1,
    flexDirection: 'row',
  },

  // Left Filter Tabs Sidebar
  filterTabsSidebar: {
    width: 115,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingTop: 8,
  },
  filterTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  filterTabItemActive: {
    backgroundColor: '#FFFFFF',
    borderRightWidth: 3,
    borderRightColor: '#3B82F6',
  },
  filterTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  tabActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },

  // Right Filter Content Pane
  filterContentPane: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  filterOptionsScroll: {
    padding: 14,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginRight: 8,
  },
  optionLabelSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#1D4ED8',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1D4ED8',
  },

  // Strain Tab specific
  strainOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  strainColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  strainMiniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  strainMiniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Brand Tab specific
  brandContentContainer: {
    flex: 1,
  },
  brandSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
    paddingHorizontal: 10,
    height: 36,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  brandSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  noBrandsFound: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noBrandsText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // Modal Footer
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  applyFilterBtn: {
    backgroundColor: '#3B82F6',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  applyFilterBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
