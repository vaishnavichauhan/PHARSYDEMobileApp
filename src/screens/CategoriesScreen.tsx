import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Sparkles,
  Leaf,
  Flame,
  Zap,
  Layers,
  Cookie,
  Droplets,
  Package,
  Plus,
  X,
  Check,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { API_ENDPOINTS, resolveImageUrl } from '../config/api';
import { Product, useProductStore } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useProductDetailStore } from '../store/productDetailStore';
import { getProductWeightDisplay } from '../utils/cannabisLimit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = 92;
const RIGHT_PANE_WIDTH = SCREEN_WIDTH - SIDEBAR_WIDTH;
const CARD_GAP = 8;
const CARD_WIDTH = (RIGHT_PANE_WIDTH - 20 - CARD_GAP) / 2;
const FULL_CARD_WIDTH = (SCREEN_WIDTH - 24 - CARD_GAP) / 2;

interface CategoryItem {
  id: string;
  name: string;
  backendName: string;
  icon: any;
}

const ALL_CATEGORY: CategoryItem = {
  id: 'all',
  name: 'All Items',
  backendName: '',
  icon: Sparkles,
};

const getCategoryIcon = (categoryName: string) => {
  const lower = categoryName.toLowerCase();
  if (lower.includes('flower') || lower.includes('bud')) return Leaf;
  if (lower.includes('roll')) return Flame;
  if (lower.includes('vape') || lower.includes('cartridge')) return Zap;
  if (lower.includes('edible') || lower.includes('cand') || lower.includes('choc')) return Cookie;
  if (lower.includes('extract') || lower.includes('rosin') || lower.includes('oil') || lower.includes('kief')) return Droplets;
  if (lower.includes('topical') || lower.includes('balm') || lower.includes('bath') || lower.includes('lotion')) return Sparkles;
  if (lower.includes('access') || lower.includes('pod') || lower.includes('lighter')) return Layers;
  return Package;
};

interface CategoriesScreenProps {
  navigation?: any;
}

const ProductCardSkeleton = ({ pulseAnim, isSidebarOpen }: { pulseAnim: Animated.Value; isSidebarOpen: boolean }) => (
  <Animated.View style={[styles.productCard, !isSidebarOpen && styles.productCardFull, { opacity: pulseAnim }]}>
    <View style={[styles.skeletonImage, !isSidebarOpen && styles.skeletonImageFull]} />
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

const CategoriesScreen = ({ navigation: propNavigation }: CategoriesScreenProps) => {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;

  // Navigation - left arrow returns directly to Home screen
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
      console.warn('Categories back navigation error:', err);
    }
  };

  // ── Local State (Primitive Hooks First) ──────────────────────
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [categories, setCategories] = useState<CategoryItem[]>([ALL_CATEGORY]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem>(ALL_CATEGORY);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedPopupId, setAddedPopupId] = useState<string | null>(null);

  // ── Pulse Animation for Skeletons ────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
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

  // ── Zustand Stores ───────────────────────────────────────────
  const storeCategories = useProductStore(state => state.categories);
  const fetchStoreCategories = useProductStore(state => state.fetchCategories);
  const cartItemCount = useCartStore(state => state.totalCount);
  const addToCart = useCartStore(state => state.addToCart);
  const openCart = useCartStore(state => state.openCart);
  const openDetail = useProductDetailStore(state => state.openDetail);

  // Load real categories dynamically from backend API / productStore
  useEffect(() => {
    let isMounted = true;

    const loadRealCategories = async () => {
      try {
        const res = await fetch(`${API_ENDPOINTS.categories}?hasImage=true`);
        const json = await res.json();
        const categoryList: string[] = Array.isArray(json?.categories) ? json.categories : [];

        if (isMounted && categoryList.length > 0) {
          const dynamicCategories: CategoryItem[] = [
            ALL_CATEGORY,
            ...categoryList
              .filter(cat => cat && typeof cat === 'string' && cat.trim())
              .map(cat => {
                const trimmed = cat.trim();
                return {
                  id: trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                  name: trimmed,
                  backendName: trimmed,
                  icon: getCategoryIcon(trimmed),
                };
              }),
          ];
          setCategories(dynamicCategories);
        }
      } catch (err) {
        console.warn('Failed to load real categories from backend:', err);
      }
    };

    loadRealCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Reset Filters when navigating away to another screen or returning ──
  useFocusEffect(
    useCallback(() => {
      // If returning to Categories and filters/search were dirty, reset to default All Items
      setSelectedCategory(prev => (prev.id !== ALL_CATEGORY.id ? ALL_CATEGORY : prev));
      setSearchQuery('');
      setShowSearch(false);
      setIsSidebarOpen(true);

      return () => {
        // Reset category and search filters when navigating away from Categories screen
        setSelectedCategory(ALL_CATEGORY);
        setSearchQuery('');
        setShowSearch(false);
        setIsSidebarOpen(true);
      };
    }, [])
  );

  // Fetch products for currently selected category and search query
  const fetchProductsForCategory = async (
    backendCategory: string,
    search: string = '',
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
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      params.append('hasImage', 'true');
      params.append('limit', '100');

      const url = `${API_ENDPOINTS.products}?${params.toString()}`;
      const res = await fetch(url);
      const json = await res.json();
      const list: Product[] = Array.isArray(json)
        ? json
        : Array.isArray(json.products)
        ? json.products
        : Array.isArray(json.data)
        ? json.data
        : [];
      setProducts(list);
    } catch (err) {
      console.warn('Failed to fetch products for category:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProductsForCategory(selectedCategory.backendName, searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery]);

  const handleRefresh = () => {
    fetchProductsForCategory(selectedCategory.backendName, searchQuery, true);
  };

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      const name = p.product_name?.toLowerCase() || '';
      const brand = p.brand?.toLowerCase() || '';
      const sku = p.sku?.toLowerCase() || '';
      const cat = p.category?.toLowerCase() || '';
      return name.includes(q) || brand.includes(q) || sku.includes(q) || cat.includes(q);
    });
  }, [products, searchQuery]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1, false);
    const id = product.pk || product.sku;
    setAddedPopupId(id);
    setTimeout(() => {
      setAddedPopupId(prev => (prev === id ? null : prev));
    }, 1200);
  };

  // Select category and dynamically close left side
  const handleSelectCategory = (item: CategoryItem) => {
    setSelectedCategory(item);
    setIsSidebarOpen(false);
  };

  // Render left sidebar category item
  const renderCategoryItem = ({ item }: { item: CategoryItem }) => {
    const isSelected = selectedCategory.id === item.id;
    const IconComponent = item.icon;

    return (
      <TouchableOpacity
        style={[
          styles.categorySidebarItem,
          isSelected && styles.categorySidebarItemActive,
        ]}
        onPress={() => handleSelectCategory(item)}
        activeOpacity={0.75}>
        {/* Left Green Active Bar */}
        {isSelected && <View style={styles.activeIndicatorBar} />}

        {/* Circular Icon Container */}
        <View
          style={[
            styles.categoryIconCircle,
            isSelected && styles.categoryIconCircleActive,
          ]}>
          <IconComponent
            size={20}
            color={isSelected ? '#0166dc' : '#64748B'}
            strokeWidth={isSelected ? 2.3 : 1.8}
          />
        </View>

        {/* Category Label */}
        <Text
          style={[
            styles.categoryLabel,
            isSelected && styles.categoryLabelActive,
          ]}
          numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render right pane product card
  const renderProductItem = ({ item }: { item: Product }) => {
    const isAdded = addedPopupId === (item.pk || item.sku || item.product_name);
    const rawStrain = item.strain;
    const isNoneStrain =
      !rawStrain ||
      typeof rawStrain !== 'string' ||
      rawStrain.trim().toLowerCase() === 'none' ||
      rawStrain.trim().toLowerCase() === 'null' ||
      rawStrain.trim().toLowerCase() === 'n/a';
    const strain = isNoneStrain ? null : rawStrain.trim();

    // 1) Indica: Blue, Hybrid: Black, Sativa: Red
    let strainBadgeStyle = styles.hybridBadge;
    let strainTextStyle = styles.hybridText;
    let strainDotStyle = styles.hybridDot;
    if (strain) {
      const lower = strain.toLowerCase();
      if (lower.includes('sativa')) {
        strainBadgeStyle = styles.sativaBadge;
        strainTextStyle = styles.sativaText;
        strainDotStyle = styles.sativaDot;
      } else if (lower.includes('indica')) {
        strainBadgeStyle = styles.indicaBadge;
        strainTextStyle = styles.indicaText;
        strainDotStyle = styles.indicaDot;
      }
    }

    const priceNum = parseFloat(item.retail_price || '0');

    return (
      <View style={[styles.productCard, !isSidebarOpen && styles.productCardFull]}>
        {/* Card Image Area – Clicking opens big image & details */}
        <TouchableOpacity
          style={[styles.imageContainer, !isSidebarOpen && styles.imageContainerFull]}
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

          {/* 2) Highlighted Strain Tag */}
          {strain ? (
            <View style={[styles.strainBadge, strainBadgeStyle]}>
              <View style={[styles.strainDot, strainDotStyle]} />
              <Text style={[styles.strainText, strainTextStyle]}>{strain}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* 3) Card Details */}
        <View style={styles.cardDetails}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText} numberOfLines={1}>
              {item.brand?.trim() || 'PHARSYDE'}
            </Text>
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

          {/* Key Specs: THC / Category */}
          <View style={styles.specsRow}>
            {parseFloat(item.thC_LEVEL || '0') > 0 ? (
              <View style={styles.thcBadge}>
                <Text style={styles.thcBadgeLabel}>THC</Text>
                <Text style={styles.thcBadgeValue}>
                  {parseFloat(item.thC_LEVEL || '0').toFixed(1)}%
                </Text>
              </View>
            ) : (
              <View style={styles.categoryBadgePill}>
                <Text style={styles.categoryTag} numberOfLines={1}>
                  {item.category || selectedCategory.name}
                </Text>
              </View>
            )}
          </View>

          {/* Price & Add Button */}
          <View style={styles.priceRow}>
            <View style={styles.priceWrap}>
              <Text style={styles.priceText}>
                ${priceNum.toFixed(2)}
              </Text>
              <Text style={styles.priceCurrency}>CAD</Text>
            </View>

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
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Left: Back Arrow */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Center: Title */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Categories
          </Text>
        </View>

        {/* Right: Search & Cart Icons */}
        <View style={styles.rightActions}>
          {/* <TouchableOpacity
            style={[styles.iconButton, isSidebarOpen && styles.iconButtonActive]}
            onPress={() => setIsSidebarOpen(prev => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <SlidersHorizontal
              size={18}
              color={isSidebarOpen ? '#0166dc' : '#0F172A'}
              strokeWidth={2}
            />
          </TouchableOpacity> */}

          <TouchableOpacity
            style={[styles.iconButton, showSearch && styles.iconButtonActive]}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Search
              size={20}
              color={showSearch ? '#0166dc' : '#0F172A'}
              strokeWidth={2}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={openCart}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ShoppingCart size={20} color="#0F172A" strokeWidth={2} />
            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Expandable Search Bar ──────────────────────────────── */}
      {showSearch && (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Search size={16} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search in ${selectedCategory.name}...`}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ── Split Layout: Left Categories / Right Products ────── */}
      <View style={styles.splitLayout}>
        {/* ── 1. Left Sidebar: Categories List (Dynamically closes on category select) ── */}
        {isSidebarOpen && (
          <View style={styles.sidebarContainer}>
            <FlatList
              data={categories}
              keyExtractor={item => item.id}
              renderItem={renderCategoryItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sidebarContent}
            />
          </View>
        )}

        {/* ── 2. Right Pane: Products Grid ─────────────────────── */}
        <View style={styles.rightPane}>
          {/* Right Pane Category Header with Toggle Button */}
          <View style={styles.rightPaneHeader}>
            <View style={styles.categoryTitleWrap}>
              <Text style={styles.categoryTitle}>{selectedCategory.name}</Text>
              <Text style={styles.categorySubtitle}>
                {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.categoryToggleBtn}
              onPress={() => setIsSidebarOpen(prev => !prev)}
              activeOpacity={0.75}>
              <SlidersHorizontal size={13} color="#0166dc" strokeWidth={2.2} />
              <Text style={styles.categoryToggleBtnText}>
                {isSidebarOpen ? 'Hide' : 'Categories'}
              </Text>
              {isSidebarOpen ? (
                <ChevronLeft size={14} color="#0166dc" strokeWidth={2.2} />
              ) : (
                <ChevronRight size={14} color="#0166dc" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Product Grid / Loading / Empty */}
          {isLoading && products.length === 0 ? (
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <ProductCardSkeleton key={i} pulseAnim={pulseAnim} isSidebarOpen={isSidebarOpen} />
              ))}
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
                  <Text style={styles.emptyTitle}>No Products</Text>
                  <Text style={styles.emptySub}>
                    {searchQuery
                      ? 'No items match your search'
                      : 'No items currently in this category'}
                  </Text>
                  {searchQuery ? (
                    <TouchableOpacity
                      style={styles.clearSearchBtn}
                      onPress={() => setSearchQuery('')}>
                      <Text style={styles.clearSearchText}>Clear Search</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const BG = '#F8FAFC';
const SIDEBAR_BG = '#F1F5F9';
const CARD_BG = '#FFFFFF';
const ACCENT = '#3B82F6';
const ACCENT_DEEP = '#0166dc';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerLeft: {
    width: 84,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.3,
  },
  rightActions: {
    width: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    zIndex: 20,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  iconButtonActive: {
    borderColor: ACCENT_DEEP,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: ACCENT,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  searchBarContainer: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT,
    paddingVertical: 0,
  },

  /* ── Split Layout ── */
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },

  /* ── Left Sidebar ── */
  sidebarContainer: {
    width: SIDEBAR_WIDTH,
    backgroundColor: SIDEBAR_BG,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  sidebarContent: {
    paddingVertical: 6,
    paddingBottom: 110,
  },
  categorySidebarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categorySidebarItemActive: {
    backgroundColor: '#FFFFFF',
  },
  activeIndicatorBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3.5,
    backgroundColor: ACCENT_DEEP,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryIconCircleActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderColor: 'rgba(1, 102, 220, 0.3)',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 14,
  },
  categoryLabelActive: {
    color: ACCENT_DEEP,
    fontWeight: '700',
  },

  /* ── Right Products Pane ── */
  rightPane: {
    flex: 1,
    backgroundColor: BG,
  },
  rightPaneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  categoryTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  categoryToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.25)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
  categoryToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: ACCENT_DEEP,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.2,
  },
  categorySubtitle: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  productsListContent: {
    padding: 10,
    paddingBottom: 110,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  /* ── Product Card ── */
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  productCardFull: {
    width: FULL_CARD_WIDTH,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  imageContainerFull: {
    aspectRatio: 1,
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
    fontSize: 28,
  },

  // 1 & 2) Highlighted Strain Badges: Indica = Blue, Hybrid = Black, Sativa = Red
  strainBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  strainDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  strainText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sativaBadge: {
    backgroundColor: '#DC2626',
    borderColor: '#EF4444',
  },
  sativaText: {
    color: '#FFFFFF',
  },
  sativaDot: {
    backgroundColor: '#FCA5A5',
  },
  indicaBadge: {
    backgroundColor: '#1D4ED8',
    borderColor: '#3B82F6',
  },
  indicaText: {
    color: '#FFFFFF',
  },
  indicaDot: {
    backgroundColor: '#93C5FD',
  },
  hybridBadge: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  hybridText: {
    color: '#FFFFFF',
  },
  hybridDot: {
    backgroundColor: '#94A3B8',
  },

  /* Card Details */
  cardDetails: {
    padding: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: 4,
  },
  brandText: {
    flex: 1,
    fontSize: 9.5,
    color: '#0166dc',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  weightBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weightBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#475569',
  },
  productName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 15,
    minHeight: 30,
    marginBottom: 4,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  thcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 2,
  },
  thcBadgeLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
  },
  thcBadgeValue: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#0166dc',
  },
  categoryBadgePill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTag: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  priceCurrency: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0166dc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0166dc',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addBtnSuccess: {
    backgroundColor: '#16A34A',
  },

  // Skeleton Styles
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: CARD_GAP,
    paddingBottom: 24,
  },
  skeletonImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E2E8F0',
  },
  skeletonImageFull: {
    aspectRatio: 1,
  },
  skeletonBrand: {
    width: 50,
    height: 9,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  skeletonWeight: {
    width: 35,
    height: 9,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  skeletonTitleLine1: {
    width: '90%',
    height: 10,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginTop: 5,
  },
  skeletonTitleLine2: {
    width: '60%',
    height: 10,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginTop: 3,
  },
  skeletonSpecs: {
    width: 45,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    marginTop: 6,
    marginBottom: 4,
  },
  skeletonPrice: {
    width: 45,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  skeletonAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },

  /* States */
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 11.5,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 16,
  },
  clearSearchBtn: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  clearSearchText: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT_DEEP,
  },
});

export default CategoriesScreen;
