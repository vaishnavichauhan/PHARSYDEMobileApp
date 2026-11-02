import React, { useState, useEffect, useMemo, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { API_ENDPOINTS } from '../config/api';
import { Product } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useProductDetailStore } from '../store/productDetailStore';

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

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'all', name: 'All Items', backendName: '', icon: Sparkles },
  { id: 'flower', name: 'Dried Flower', backendName: 'Dried Flower', icon: Leaf },
  { id: 'preroll', name: 'Pre-Rolled', backendName: 'PRE-ROLLED', icon: Flame },
  { id: 'fortified', name: 'Fortified', backendName: 'FORTIFIED PRE-ROLLED', icon: Zap },
  { id: 'vape', name: 'Vapes', backendName: 'Vape', icon: Zap },
  { id: 'cartridge', name: '510 Carts', backendName: 'CARTRIDGE 510', icon: Layers },
  { id: 'edibles', name: 'Edibles', backendName: 'Edibles-Candy/Chocolate/Confec', icon: Cookie },
  { id: 'extracts', name: 'Extracts', backendName: 'Extracts Inhaled', icon: Droplets },
  { id: 'nicotine', name: 'Nicotine', backendName: 'Nicotine Vapes', icon: Package },
];

interface CategoriesScreenProps {
  navigation?: any;
}

const CategoriesScreen = ({ navigation: propNavigation }: CategoriesScreenProps) => {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;

  // Navigation
  const handleBack = () => {
    if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Home');
    }
  };

  // Cart Store & Actions
  const cartItemCount = useCartStore(state => state.totalCount);
  const addToCart = useCartStore(state => state.addToCart);
  const openCart = useCartStore(state => state.openCart);

  // Product Detail Store
  const openDetail = useProductDetailStore(state => state.openDetail);

  // Sidebar toggle state (dynamically closes when a category is selected)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Categories & Selected state
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem>(DEFAULT_CATEGORIES[0]);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search in categories
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [addedPopupId, setAddedPopupId] = useState<string | null>(null);

  // Fetch all categories from backend to make sure all available ones are included
  useEffect(() => {
    const discoverCategories = async () => {
      try {
        const res = await fetch(`${API_ENDPOINTS.products}?limit=300`);
        const json = await res.json();
        const list: Product[] = Array.isArray(json)
          ? json
          : Array.isArray(json.products)
          ? json.products
          : [];
        if (list.length > 0) {
          const found = new Set<string>();
          list.forEach(p => {
            if (p.category && p.category.trim()) found.add(p.category.trim());
          });

          // Build dynamic list preserving defaults
          const existingBackendNames = new Set(DEFAULT_CATEGORIES.map(c => c.backendName));
          const additional: CategoryItem[] = [];
          found.forEach(cat => {
            if (!existingBackendNames.has(cat)) {
              additional.push({
                id: cat.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                name: cat,
                backendName: cat,
                icon: Package,
              });
            }
          });
          if (additional.length > 0) {
            setCategories([...DEFAULT_CATEGORIES, ...additional]);
          }
        }
      } catch (err) {
        console.warn('Failed to discover categories:', err);
      }
    };

    discoverCategories();
  }, []);

  // Fetch products for currently selected category
  const fetchProductsForCategory = async (backendCategory: string, isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const url = backendCategory
        ? `${API_ENDPOINTS.products}?category=${encodeURIComponent(backendCategory)}&limit=100`
        : `${API_ENDPOINTS.products}?limit=100`;
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
    fetchProductsForCategory(selectedCategory.backendName);
  }, [selectedCategory]);

  const handleRefresh = () => {
    fetchProductsForCategory(selectedCategory.backendName, true);
  };

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      const name = p.product_name?.toLowerCase() || '';
      const brand = p.brand?.toLowerCase() || '';
      const sku = p.sku?.toLowerCase() || '';
      return name.includes(q) || brand.includes(q) || sku.includes(q);
    });
  }, [products, searchQuery]);

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1, true);
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
            color={isSelected ? '#488203' : '#64748B'}
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
      <View style={[styles.productCard, !isSidebarOpen && styles.productCardFull]}>
        {/* Card Image Area – Clicking opens big image & details */}
        <TouchableOpacity
          style={[styles.imageContainer, !isSidebarOpen && styles.imageContainerFull]}
          activeOpacity={0.9}
          onPress={() => openDetail(item)}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>🌿</Text>
            </View>
          )}

          {/* Strain Tag */}
          {strain ? (
            <View style={[styles.strainBadge, strainBadgeStyle]}>
              <Text style={[styles.strainText, strainTextStyle]}>{strain}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Card Details */}
        <View style={styles.cardDetails}>
          {item.brand ? (
            <Text style={styles.brandText} numberOfLines={1}>
              {item.brand}
            </Text>
          ) : null}

          <TouchableOpacity activeOpacity={0.8} onPress={() => openDetail(item)}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
          </TouchableOpacity>

          {item.thC_LEVEL ? (
            <Text style={styles.thcText}>THC: {item.thC_LEVEL}%</Text>
          ) : null}

          {/* Price & Add Button */}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              ${parseFloat(item.retail_price || '0').toFixed(2)}
            </Text>

            <TouchableOpacity
              style={[styles.addBtn, isAdded && styles.addBtnSuccess]}
              onPress={() => handleAddToCart(item)}
              activeOpacity={0.85}>
              {isAdded ? (
                <Check size={14} color="#0F172A" strokeWidth={3} />
              ) : (
                <Plus size={14} color="#0F172A" strokeWidth={2.5} />
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
        <TouchableOpacity
          style={[styles.iconButton, styles.backButton]}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
        </TouchableOpacity>

        {/* Center: Title (in bounded non-blocking wrapper) */}
        <View style={styles.headerTitleWrap} pointerEvents="none">
          <Text style={styles.headerTitle} numberOfLines={1}>
            Categories
          </Text>
        </View>

        {/* Right: Categories Toggle, Search & Cart Icons */}
        <View style={styles.rightActions}>
          {/* <TouchableOpacity
            style={[styles.iconButton, isSidebarOpen && styles.iconButtonActive]}
            onPress={() => setIsSidebarOpen(prev => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <SlidersHorizontal
              size={18}
              color={isSidebarOpen ? '#488203' : '#0F172A'}
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
              color={showSearch ? '#488203' : '#0F172A'}
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
              <SlidersHorizontal size={13} color="#488203" strokeWidth={2.2} />
              <Text style={styles.categoryToggleBtnText}>
                {isSidebarOpen ? 'Hide' : 'Categories'}
              </Text>
              {isSidebarOpen ? (
                <ChevronLeft size={14} color="#488203" strokeWidth={2.2} />
              ) : (
                <ChevronRight size={14} color="#488203" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>

          {/* Product Grid / Loading / Empty */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#488203" />
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
const ACCENT = '#8EF705';
const ACCENT_DEEP = '#488203';
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
    position: 'relative',
    zIndex: 10,
  },
  backButton: {
    zIndex: 25,
    elevation: 6,
  },
  headerTitleWrap: {
    position: 'absolute',
    left: 60,
    right: 120,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: TEXT,
    letterSpacing: 0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: 'rgba(142, 247, 5, 0.18)',
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
    backgroundColor: 'rgba(142, 247, 5, 0.18)',
    borderColor: 'rgba(72, 130, 3, 0.3)',
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
    backgroundColor: 'rgba(142, 247, 5, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(72, 130, 3, 0.25)',
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
    paddingBottom: 24,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },

  /* ── Product Card ── */
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productCardFull: {
    width: FULL_CARD_WIDTH,
  },
  imageContainer: {
    width: '100%',
    height: 100,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 4,
  },
  imageContainerFull: {
    height: 125,
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
  strainBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  strainText: {
    fontSize: 8.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sativaBadge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  sativaText: {
    color: '#B45309',
  },
  indicaBadge: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
  },
  indicaText: {
    color: '#7E22CE',
  },
  hybridBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  hybridText: {
    color: '#047857',
  },

  /* Card Details */
  cardDetails: {
    padding: 8,
  },
  brandText: {
    fontSize: 9.5,
    color: MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  productName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: TEXT,
    lineHeight: 15,
    minHeight: 30,
  },
  thcText: {
    fontSize: 10,
    color: ACCENT_DEEP,
    fontWeight: '600',
    marginTop: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: TEXT,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSuccess: {
    backgroundColor: '#22C55E',
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
    backgroundColor: 'rgba(142, 247, 5, 0.2)',
  },
  clearSearchText: {
    fontSize: 11,
    fontWeight: '600',
    color: ACCENT_DEEP,
  },
});

export default CategoriesScreen;
