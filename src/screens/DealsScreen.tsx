/**
 * DealsScreen – Exclusive Deals & Promotional Specials
 *
 * Mirrors the Pharsyde Web Frontend Deals & Specials (/deals):
 * - Promotional hero banner with live deal counts (101 Deals on Sale Available)
 * - Exact product sequence matching the web frontend (sorted by Recently Updated / modified DESC)
 * - Live stock badge on top right of product cards (e.g. "5 LEFT", "2 LEFT", "SOLD OUT")
 * - Dynamic category pills extracted from active promotional deals
 * - Quick sort options: Recently Updated (Default), Biggest Discount %, Biggest Savings $, Price Low/High, THC High/Low
 * - Full filter modal (Category, Strain, Brand, Price Range)
 * - 2-column product grid with sale badges (-XX%), strikethrough original prices,
 *   discounted prices in rose-600, green savings pills (Save $X.XX), and specs tags (Strain, THC, CBD)
 * - Cannabis 30.0g legal limit tracking & safe add-to-cart
 * - Pull-to-refresh & animated skeleton loaders
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
  Animated,
  RefreshControl,
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

type FilterTab = 'category' | 'strain' | 'price' | 'brand';
type PriceRange = 'all' | 'under-20' | '20-40' | '40-60' | 'above-60';
type SortOption =
  | 'modified-desc'
  | 'discount-desc'
  | 'savings-desc'
  | 'price-asc'
  | 'price-desc'
  | 'thc-desc'
  | 'thc-asc';

const PRICE_RANGE_OPTIONS: { id: PriceRange; label: string; min?: number; max?: number }[] = [
  { id: 'all', label: 'All Prices' },
  { id: 'under-20', label: 'Under $20', max: 20 },
  { id: '20-40', label: '$20 – $40', min: 20, max: 40 },
  { id: '40-60', label: '$40 – $60', min: 40, max: 60 },
  { id: 'above-60', label: '$60 & Above', min: 60 },
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'modified-desc', label: 'Recently Updated' },
  { id: 'discount-desc', label: 'Biggest Discount (%)' },
  { id: 'savings-desc', label: 'Biggest Savings ($)' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'thc-desc', label: 'THC: High to Low' },
  { id: 'thc-asc', label: 'THC: Low to High' },
];

const DealsSkeleton = ({ pulseAnim }: { pulseAnim: Animated.Value }) => (
  <Animated.View style={[styles.productCard, { opacity: pulseAnim }]}>
    <View style={styles.skeletonImage} />
    <View style={styles.cardDetails}>
      <View style={styles.brandRow}>
        <View style={styles.skeletonBrand} />
        <View style={styles.skeletonWeight} />
      </View>
      <View style={styles.skeletonTitleLine1} />
      <View style={styles.skeletonTitleLine2} />
      <View style={styles.skeletonSpecs} />
      <View style={styles.priceRow}>
        <View style={styles.skeletonPrice} />
        <View style={styles.skeletonAddBtn} />
      </View>
    </View>
  </Animated.View>
);

export default function DealsScreen() {
  const navigation = useNavigation<any>();

  // ── State ────────────────────────────────────────────────────────
  const [deals, setDeals] = useState<Product[]>([]);
  const [totalDealsCount, setTotalDealsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [addedPopupId, setAddedPopupId] = useState<string | null>(null);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStrain, setSelectedStrain] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortOption>('modified-desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  // Modals
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('category');
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');

  // ── Pulse Animation for Skeletons ────────────────────────────────
  const pulseAnim = React.useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ── Zustand Cart & Product Detail ────────────────────────────────
  const cartItemCount = useCartStore(state => state.totalCount);
  const addToCart = useCartStore(state => state.addToCart);
  const openCart = useCartStore(state => state.openCart);
  const openDetail = useProductDetailStore(state => state.openDetail);

  useFocusEffect(
    useCallback(() => {
      useCartStore.getState().fetchPublicSettings();
    }, []),
  );

  // ── Fetch Deals from Backend ─────────────────────────────────────
  // Uses same endpoint and query params as web frontend (/products?onSale=true&inStock=true&hasImageOrInStock=true&sortBy=modified&sortOrder=DESC)
  const fetchDeals = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const url = `${API_ENDPOINTS.products}?onSale=true&inStock=true&hasImageOrInStock=true&sortBy=modified&sortOrder=DESC&limit=150`;
      const res = await fetch(url);
      const json = await res.json();
      const list: Product[] = Array.isArray(json?.products)
        ? json.products
        : Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];
      setDeals(list);
      setTotalDealsCount(json?.total || list.length);
    } catch (err) {
      console.warn('Failed to fetch promotional deals:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // ── Extract Dynamic Categories & Counts from Deals ───────────────
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, number>();
    deals.forEach(item => {
      if (item.category && item.category.trim()) {
        const cat = item.category.trim();
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    });

    const list = Array.from(map.entries())
      .map(([name, count]) => ({ id: name, name, count }))
      .sort((a, b) => b.count - a.count);

    return [{ id: 'all', name: 'All Deals', count: deals.length }, ...list];
  }, [deals]);

  // Extract distinct strains & brands
  const availableStrains = useMemo(() => {
    const set = new Set<string>();
    deals.forEach(item => {
      const s = item.strain?.trim();
      if (s && s.toLowerCase() !== 'none' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'n/a') {
        set.add(s);
      }
    });
    return Array.from(set).sort();
  }, [deals]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    deals.forEach(item => {
      const b = item.brand?.trim();
      if (b && b.toLowerCase() !== 'none') {
        set.add(b);
      }
    });
    return Array.from(set).sort();
  }, [deals]);

  // ── Filtered & Sorted Deals ──────────────────────────────────────
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Category
    if (selectedCategory !== 'all') {
      result = result.filter(
        item => item.category?.trim().toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    // Search query
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.trim().toLowerCase();
      result = result.filter(item => {
        const name = (item.product_name || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const sku = (item.sku || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        return name.includes(q) || brand.includes(q) || sku.includes(q) || cat.includes(q);
      });
    }

    // Strain
    if (selectedStrain) {
      result = result.filter(
        item => item.strain?.trim().toLowerCase() === selectedStrain.toLowerCase(),
      );
    }

    // Brand
    if (selectedBrand) {
      result = result.filter(
        item => item.brand?.trim().toLowerCase() === selectedBrand.toLowerCase(),
      );
    }

    // Price range (checks effective discounted price)
    if (selectedPriceRange !== 'all') {
      const range = PRICE_RANGE_OPTIONS.find(r => r.id === selectedPriceRange);
      if (range) {
        result = result.filter(item => {
          const retail = parseFloat(item.retail_price || '0');
          const rawDiscount =
            item.discounted_price !== undefined && item.discounted_price !== null
              ? parseFloat(String(item.discounted_price))
              : null;
          const effectivePrice =
            rawDiscount !== null && !isNaN(rawDiscount) && rawDiscount > 0 ? rawDiscount : retail;
          if (range.min !== undefined && effectivePrice < range.min) return false;
          if (range.max !== undefined && effectivePrice > range.max) return false;
          return true;
        });
      }
    }

    // Sorting
    // If 'modified-desc' (Recently Updated), keep pristine backend sequence matching web frontend
    if (sortBy === 'modified-desc') {
      return result;
    }

    result.sort((a, b) => {
      const retailA = parseFloat(a.retail_price || '0');
      const discountA =
        a.discounted_price !== undefined && a.discounted_price !== null
          ? parseFloat(String(a.discounted_price))
          : retailA;
      const percentA = a.discount_percent
        ? parseFloat(String(a.discount_percent))
        : retailA > 0
        ? ((retailA - discountA) / retailA) * 100
        : 0;
      const savingsA = a.discount_amount
        ? parseFloat(String(a.discount_amount))
        : Math.max(0, retailA - discountA);
      const thcValA = parseFloat(a.thC_LEVEL || '0');

      const retailB = parseFloat(b.retail_price || '0');
      const discountB =
        b.discounted_price !== undefined && b.discounted_price !== null
          ? parseFloat(String(b.discounted_price))
          : retailB;
      const percentB = b.discount_percent
        ? parseFloat(String(b.discount_percent))
        : retailB > 0
        ? ((retailB - discountB) / retailB) * 100
        : 0;
      const savingsB = b.discount_amount
        ? parseFloat(String(b.discount_amount))
        : Math.max(0, retailB - discountB);
      const thcValB = parseFloat(b.thC_LEVEL || '0');

      if (sortBy === 'discount-desc') {
        return percentB - percentA;
      }
      if (sortBy === 'savings-desc') {
        return savingsB - savingsA;
      }
      if (sortBy === 'price-asc') {
        return discountA - discountB;
      }
      if (sortBy === 'price-desc') {
        return discountB - discountA;
      }
      if (sortBy === 'thc-desc') {
        return thcValB - thcValA;
      }
      if (sortBy === 'thc-asc') {
        return thcValA - thcValB;
      }
      return 0;
    });

    return result;
  }, [
    deals,
    selectedCategory,
    debouncedSearchQuery,
    selectedStrain,
    selectedBrand,
    selectedPriceRange,
    sortBy,
  ]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedStrain) count++;
    if (selectedBrand) count++;
    if (selectedPriceRange !== 'all') count++;
    if (sortBy !== 'modified-desc') count++;
    return count;
  }, [selectedCategory, selectedStrain, selectedBrand, selectedPriceRange, sortBy]);

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedStrain(null);
    setSelectedBrand(null);
    setSelectedPriceRange('all');
    setSortBy('modified-desc');
    setSearchQuery('');
    setBrandSearchQuery('');
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1, false);
    const id = product.pk || product.sku;
    setAddedPopupId(id);
    setTimeout(() => {
      setAddedPopupId(prev => (prev === id ? null : prev));
    }, 1200);
  };

  // ── Product Item Card ────────────────────────────────────────────
  const renderProductItem = ({ item }: { item: Product }) => {
    const isAdded = addedPopupId === (item.pk || item.sku);

    // Strains
    const rawStrain = item.strain;
    const isNoneStrain =
      !rawStrain ||
      typeof rawStrain !== 'string' ||
      rawStrain.trim().toLowerCase() === 'none' ||
      rawStrain.trim().toLowerCase() === 'null' ||
      rawStrain.trim().toLowerCase() === 'n/a';
    const strain = isNoneStrain ? null : rawStrain.trim();
    const isNicotine = item.category?.toLowerCase().includes('nicotine');
    const showStrainBadge = !isNicotine && Boolean(strain);

    let strainBadgeStyle = styles.hybridBadge;
    let strainTextStyle = styles.hybridText;
    let strainDotStyle = styles.hybridDot;
    let strainSpecStyle = styles.hybridSpecPill;
    if (strain) {
      const lower = strain.toLowerCase();
      if (lower.includes('sativa')) {
        strainBadgeStyle = styles.sativaBadge;
        strainTextStyle = styles.sativaText;
        strainDotStyle = styles.sativaDot;
        strainSpecStyle = styles.sativaSpecPill;
      } else if (lower.includes('indica')) {
        strainBadgeStyle = styles.indicaBadge;
        strainTextStyle = styles.indicaText;
        strainDotStyle = styles.indicaDot;
        strainSpecStyle = styles.indicaSpecPill;
      }
    }

    // Stock count & Out of stock status matching frontend
    const rawQty = item.qty_available !== undefined && item.qty_available !== null
      ? parseFloat(String(item.qty_available))
      : null;
    const isOutOfStock = rawQty !== null && rawQty <= 0;
    const isLowStock = rawQty !== null && rawQty > 0 && rawQty <= 5;

    // Pricing calculation
    const retailPrice = parseFloat(item.retail_price || '0');
    const rawDiscount =
      item.discounted_price !== undefined && item.discounted_price !== null
        ? parseFloat(String(item.discounted_price))
        : null;
    const isOnSale =
      rawDiscount !== null && !isNaN(rawDiscount) && rawDiscount > 0 && rawDiscount < retailPrice;
    const effectivePrice = isOnSale ? rawDiscount : retailPrice;

    const discountAmount = isOnSale
      ? item.discount_amount
        ? parseFloat(String(item.discount_amount)).toFixed(2)
        : (retailPrice - rawDiscount).toFixed(2)
      : null;

    const discountPercent = isOnSale && retailPrice > 0
      ? item.discount_percent
        ? Math.round(Number(item.discount_percent))
        : Math.round(((retailPrice - rawDiscount) / retailPrice) * 100)
      : null;

    return (
      <View style={styles.productCard}>
        {/* Image & Floating Badges */}
        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={0.9}
          onPress={() => openDetail(item)}>
          {item.imageUrl ? (
            <Image
              source={{ uri: resolveImageUrl(item.imageUrl) || item.imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>🌿</Text>
            </View>
          )}

          {/* Floating Badges Overlay (Matching Frontend ProductCard.jsx) */}
          <View style={styles.floatingBadgesContainer}>
            {/* Left Column: Strain Badge + Sale Badge */}
            <View style={styles.badgesLeftCol}>
              {showStrainBadge ? (
                <View style={[styles.strainBadge, strainBadgeStyle]}>
                  {/* <View style={[styles.strainDot, strainDotStyle]} /> */}
                  <Text style={[styles.strainText, strainTextStyle]}>{strain}</Text>
                </View>
              ) : null}

              {isOnSale && (
                <View style={styles.saleBadge}>
                  {/* <Sparkles size={10} color="#FFFFFF" /> */}
                  <Text style={styles.saleBadgeText}>
                    SALE {discountPercent ? `-${discountPercent}%` : ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Right Column: How Many Left Badge (e.g. 5 LEFT) */}
            <View style={styles.badgesRightCol}>
              {isOutOfStock ? (
                <View style={styles.stockBadgeSoldOut}>
                  <Text style={styles.stockBadgeText}>SOLD OUT</Text>
                </View>
              ) : isLowStock ? (
                <View style={styles.stockBadgeLow}>
                  <Text style={styles.stockBadgeText}>{Math.round(rawQty)} LEFT</Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {/* Card Details */}
        <View style={styles.cardDetails}>
          {/* Brand & Weight */}
          <View style={styles.brandRow}>
            <Text style={styles.brandText} numberOfLines={1}>
              {item.brand?.trim() || 'PHARSYDE'}
            </Text>
            {getProductWeightDisplay(item) ? (
              <View style={styles.weightBadge}>
                <Text style={styles.weightBadgeText}>{getProductWeightDisplay(item)}</Text>
              </View>
            ) : null}
          </View>

          {/* Product Title */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => openDetail(item)}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
          </TouchableOpacity>

          {/* Key Specs Tags matching Frontend (Strain + THC + CBD) */}
          <View style={styles.specsRow}>
            {strain && !isNicotine ? (
              <View style={[styles.specPill, strainSpecStyle]}>
                {/* <View style={[styles.specDot, strainDotStyle]} /> */}
                <Text style={[styles.specText, strainTextStyle]}>{strain}</Text>
              </View>
            ) : null}

            {parseFloat(item.thC_LEVEL || '0') > 0 ? (
              <View style={styles.thcBadge}>
                <Text style={styles.thcBadgeLabel}>THC</Text>
                <Text style={styles.thcBadgeValue}>
                  {parseFloat(item.thC_LEVEL || '0').toFixed(1)}%
                </Text>
              </View>
            ) : null}

            {parseFloat(item.cbD_LEVEL || '0') > 0 ? (
              <View style={styles.cbdBadge}>
                <Text style={styles.cbdBadgeLabel}>CBD</Text>
                <Text style={styles.cbdBadgeValue}>
                  {parseFloat(item.cbD_LEVEL || '0').toFixed(1)}%
                </Text>
              </View>
            ) : null}

            {!strain &&
            parseFloat(item.thC_LEVEL || '0') <= 0 &&
            parseFloat(item.cbD_LEVEL || '0') <= 0 &&
            item.category ? (
              <View style={styles.categoryBadgePill}>
                <Text style={styles.categoryTag} numberOfLines={1}>
                  {item.category}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Pricing & Add to Cart Action */}
          <View style={styles.priceRow}>
            <View style={styles.priceWrap}>
              {isOnSale ? (
                <>
                  <Text style={styles.salePriceLabel}>
                    SALE PRICE {discountPercent ? `(-${discountPercent}%)` : ''}
                  </Text>
                  <View style={styles.effectivePriceRow}>
                    <Text
                      style={[
                        styles.originalPriceText,
                        { textDecorationLine: 'line-through', color: '#94A3B8' },
                      ]}>
                      ${retailPrice.toFixed(2)}
                    </Text>
                    <Text style={styles.salePriceText}>${effectivePrice.toFixed(2)}</Text>
                    <Text style={styles.priceCurrency}>CAD</Text>
                  </View>
                  {discountAmount && Number(discountAmount) > 0 && (
                    <View style={styles.savingsPill}>
                      <Text style={styles.savingsPillText}>Save ${discountAmount}</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.priceLabel}>Price</Text>
                  <View style={styles.effectivePriceRow}>
                    <Text style={styles.regularPriceText}>${retailPrice.toFixed(2)}</Text>
                    <Text style={styles.priceCurrency}>CAD</Text>
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addBtn, isAdded && styles.addBtnSuccess, isOutOfStock && styles.addBtnDisabled]}
              onPress={() => !isOutOfStock && handleAddToCart(item)}
              disabled={isOutOfStock}
              activeOpacity={0.85}>
              {isAdded ? (
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
              ) : (
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ── Header Component for FlatList ────────────────────────────────
  const renderListHeader = () => (
    <View style={styles.listHeaderWrap}>
      {/* ── 1. Promotional Hero Banner ── */}
  

      {/* ── 2. Search & Filter Bar ── */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748B" strokeWidth={2.2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deals by product, brand..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Trigger Button */}
        <TouchableOpacity
          style={[styles.filterTriggerBtn, activeFiltersCount > 0 && styles.filterTriggerBtnActive]}
          onPress={() => {
            setActiveFilterTab('category');
            setIsFilterModalOpen(true);
          }}
          activeOpacity={0.8}>
          <SlidersHorizontal
            size={18}
            color={activeFiltersCount > 0 ? '#FFFFFF' : '#0F172A'}
            strokeWidth={2.2}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.activeFilterBadge}>
              <Text style={styles.activeFilterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── 3. Sort Bar & Quick Toggles ── */}
      <View style={styles.sortBarRow}>
        <Text style={styles.sortBarLabel}>Sort:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortPillsScroll}>
          {SORT_OPTIONS.map(opt => {
            const isSelected = sortBy === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sortPill, isSelected && styles.sortPillSelected]}
                onPress={() => setSortBy(opt.id)}>
                <Text style={[styles.sortPillText, isSelected && styles.sortPillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── 4. Dynamic Category Pills ── */}
      <View style={styles.categoryPillsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsScroll}>
          {dynamicCategories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.75}>
                <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextSelected]}>
                  {cat.name}
                </Text>
                <View style={[styles.categoryCountBadge, isSelected && styles.categoryCountBadgeSelected]}>
                  <Text style={[styles.categoryCountText, isSelected && styles.categoryCountTextSelected]}>
                    {cat.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Top Bar ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Deals
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

      {/* ── Products List ── */}
      {isLoading ? (
        <ScrollView contentContainerStyle={styles.loadingGrid} showsVerticalScrollIndicator={false}>
          {renderListHeader()}
          <View style={styles.skeletonRow}>
            {Array.from({ length: 6 }).map((_, i) => (
              <DealsSkeleton key={`skel-${i}`} pulseAnim={pulseAnim} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredDeals}
          keyExtractor={item => item.pk || item.sku || item.product_name}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={renderListHeader}
          renderItem={renderProductItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchDeals(true)}
              tintColor="#E11D48"
              colors={['#E11D48', '#0166dc']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Sparkles size={36} color="#E11D48" />
              </View>
              <Text style={styles.emptyTitle}>No Deals Found</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find any promotional deals matching your selected criteria.
              </Text>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetFilters}>
                <RotateCcw size={15} color="#0166dc" strokeWidth={2.4} />
                <Text style={styles.resetBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── Filter Modal ── */}
      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <SlidersHorizontal size={18} color="#E11D48" strokeWidth={2.2} />
                <Text style={styles.modalTitle}>FILTER DEALS</Text>
              </View>
              <View style={styles.modalHeaderRight}>
                {activeFiltersCount > 0 && (
                  <TouchableOpacity onPress={handleResetFilters} style={styles.modalResetBtn}>
                    <Text style={styles.modalResetText}>Reset</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsFilterModalOpen(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Tab Buttons */}
            <View style={styles.modalTabsRow}>
              {(['category', 'strain', 'brand', 'price'] as FilterTab[]).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.modalTabBtn, activeFilterTab === tab && styles.modalTabBtnActive]}
                  onPress={() => setActiveFilterTab(tab)}>
                  <Text
                    style={[
                      styles.modalTabBtnText,
                      activeFilterTab === tab && styles.modalTabBtnTextActive,
                    ]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* CATEGORY TAB */}
              {activeFilterTab === 'category' && (
                <View style={styles.filterOptionsGroup}>
                  {dynamicCategories.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.filterOptionItem, isSelected && styles.filterOptionItemSelected]}
                        onPress={() => setSelectedCategory(cat.id)}>
                        <Text
                          style={[
                            styles.filterOptionText,
                            isSelected && styles.filterOptionTextSelected,
                          ]}>
                          {cat.name} ({cat.count})
                        </Text>
                        {isSelected && <Check size={16} color="#E11D48" strokeWidth={2.6} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* STRAIN TAB */}
              {activeFilterTab === 'strain' && (
                <View style={styles.filterOptionsGroup}>
                  <TouchableOpacity
                    style={[styles.filterOptionItem, selectedStrain === null && styles.filterOptionItemSelected]}
                    onPress={() => setSelectedStrain(null)}>
                    <Text style={[styles.filterOptionText, selectedStrain === null && styles.filterOptionTextSelected]}>
                      All Strains
                    </Text>
                    {selectedStrain === null && <Check size={16} color="#E11D48" strokeWidth={2.6} />}
                  </TouchableOpacity>
                  {availableStrains.map(s => {
                    const isSelected = selectedStrain === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.filterOptionItem, isSelected && styles.filterOptionItemSelected]}
                        onPress={() => setSelectedStrain(s)}>
                        <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                          {s}
                        </Text>
                        {isSelected && <Check size={16} color="#E11D48" strokeWidth={2.6} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* BRAND TAB */}
              {activeFilterTab === 'brand' && (
                <View style={styles.filterOptionsGroup}>
                  <View style={styles.modalBrandSearch}>
                    <Search size={16} color="#94A3B8" />
                    <TextInput
                      style={styles.modalBrandInput}
                      placeholder="Search brands..."
                      placeholderTextColor="#94A3B8"
                      value={brandSearchQuery}
                      onChangeText={setBrandSearchQuery}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.filterOptionItem, selectedBrand === null && styles.filterOptionItemSelected]}
                    onPress={() => setSelectedBrand(null)}>
                    <Text style={[styles.filterOptionText, selectedBrand === null && styles.filterOptionTextSelected]}>
                      All Brands
                    </Text>
                    {selectedBrand === null && <Check size={16} color="#E11D48" strokeWidth={2.6} />}
                  </TouchableOpacity>
                  {availableBrands
                    .filter(b => b.toLowerCase().includes(brandSearchQuery.toLowerCase()))
                    .map(b => {
                      const isSelected = selectedBrand === b;
                      return (
                        <TouchableOpacity
                          key={b}
                          style={[styles.filterOptionItem, isSelected && styles.filterOptionItemSelected]}
                          onPress={() => setSelectedBrand(b)}>
                          <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                            {b}
                          </Text>
                          {isSelected && <Check size={16} color="#E11D48" strokeWidth={2.6} />}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}

              {/* PRICE TAB */}
              {activeFilterTab === 'price' && (
                <View style={styles.filterOptionsGroup}>
                  {PRICE_RANGE_OPTIONS.map(opt => {
                    const isSelected = selectedPriceRange === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.filterOptionItem, isSelected && styles.filterOptionItemSelected]}
                        onPress={() => setSelectedPriceRange(opt.id)}>
                        <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>
                          {opt.label}
                        </Text>
                        {isSelected && <Check size={16} color="#E11D48" strokeWidth={2.6} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Button */}
            <View style={styles.modalBottomRow}>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setIsFilterModalOpen(false)}>
                <Text style={styles.modalApplyBtnText}>
                  Show {filteredDeals.length} Deals
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E11D48',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },

  // ── List & Header ───────────────────────────────────────────────
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  listHeaderWrap: {
    paddingTop: 12,
    paddingBottom: 8,
  },

  // Hero Banner
  heroBanner: {
    backgroundColor: '#FFF1F2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE4E6',
    padding: 16,
    marginBottom: 14,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  heroSparkleWrap: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#FFE4E6',
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#E11D48',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  liveCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 6,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#E11D48',
  },
  liveCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  liveCountTextBold: {
    fontWeight: '800',
    color: '#0F172A',
  },

  // Search & Filter Row
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterTriggerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTriggerBtnActive: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  activeFilterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    width: 17,
    height: 17,
    borderRadius: 8.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  activeFilterBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Sort Bar
  sortBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  sortBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  sortPillsScroll: {
    gap: 6,
    paddingRight: 12,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortPillSelected: {
    backgroundColor: '#E11D48',
    borderColor: '#E11D48',
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  sortPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Category Pills
  categoryPillsWrap: {
    marginBottom: 8,
  },
  categoryPillsScroll: {
    gap: 6,
    paddingRight: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryPillSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  categoryPillTextSelected: {
    color: '#FFFFFF',
  },
  categoryCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  categoryCountBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  categoryCountTextSelected: {
    color: '#FFFFFF',
  },

  // ── Product Cards ───────────────────────────────────────────────
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
  floatingBadgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgesLeftCol: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  badgesRightCol: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  strainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  sativaBadge: { backgroundColor: '#B91C1C', borderWidth: 1, borderColor: '#B91C1C' },
  sativaText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },
  sativaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#DC2626' },
  indicaBadge: { backgroundColor: '#1D4ED8', borderWidth: 1, borderColor: '#1D4ED8' },
  indicaText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },
  indicaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#2563EB' },
  hybridBadge: { backgroundColor: '#000000ff', borderWidth: 1, borderColor: '#000000ff' },
  hybridText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },
  hybridDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#64748B' },
  strainDot: { width: 4, height: 4, borderRadius: 2 },
  strainText: { textTransform: 'uppercase' },

  saleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E11D48',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  saleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  // How many left / Sold out stock badges
  stockBadgeLow: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  stockBadgeSoldOut: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  stockBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  cardDetails: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0166dc',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    flex: 1,
  },
  weightBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  weightBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  productName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 16,
    minHeight: 32,
    marginBottom: 6,
  },

  // Key Specs Tags
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  specPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  sativaSpecPill: { backgroundColor: '#B91C1C', borderWidth: 1, borderColor: '#FECACA' },
  indicaSpecPill: { backgroundColor: '#1D4ED8', borderWidth: 1, borderColor: '#DBEAFE' },
  hybridSpecPill: { backgroundColor: '#000000', borderWidth: 1, borderColor: '#E2E8F0' },
  specDot: { width: 3.5, height: 3.5, borderRadius: 2 },
  specText: { fontSize: 8.5, fontWeight: '800', textTransform: 'uppercase' },

  thcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 3,
  },
  thcBadgeLabel: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: '600',
  },
  thcBadgeValue: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  cbdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 3,
  },
  cbdBadgeLabel: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: '600',
  },
  cbdBadgeValue: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryBadgePill: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  categoryTag: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },

  // Pricing
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceWrap: {
    flex: 1,
  },
  originalPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    textDecorationStyle: 'solid',
    textDecorationColor: '#94A3B8',
    marginRight: 4,
  },
  salePriceLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#E11D48',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  effectivePriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  salePriceText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#E11D48',
  },
  regularPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceCurrency: {
    fontSize: 9.5,
    color: '#94A3B8',
    fontWeight: '700',
  },
  savingsPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  savingsPillText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#059669',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0166dc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  addBtnSuccess: {
    backgroundColor: '#059669',
  },
  addBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },

  // ── Skeletons ───────────────────────────────────────────────────
  loadingGrid: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 30,
  },
  skeletonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E2E8F0',
  },
  skeletonBrand: {
    width: 60,
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonWeight: {
    width: 30,
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonTitleLine1: {
    width: '90%',
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 6,
  },
  skeletonTitleLine2: {
    width: '60%',
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 4,
  },
  skeletonSpecs: {
    width: 45,
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginTop: 8,
  },
  skeletonPrice: {
    width: 50,
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonAddBtn: {
    width: 30,
    height: 30,
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
  },

  // ── Empty State ─────────────────────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0166dc',
  },

  // ── Filter Modal ────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalResetBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  modalResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  modalTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginTop: 12,
    marginBottom: 12,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
  },
  modalTabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  modalTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modalTabBtnTextActive: {
    color: '#E11D48',
    fontWeight: '800',
  },
  modalBody: {
    maxHeight: 300,
  },
  filterOptionsGroup: {
    gap: 6,
    paddingBottom: 10,
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterOptionItemSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  filterOptionTextSelected: {
    color: '#E11D48',
    fontWeight: '800',
  },
  modalBrandSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
    gap: 6,
  },
  modalBrandInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  modalBottomRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalApplyBtn: {
    backgroundColor: '#E11D48',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
