import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  CircleUser,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Check,
  ShoppingCart,
  Sparkles,
  Crown,
  ArrowRight,
  ChevronRight,
  Flame,
  Leaf,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react-native';
import {
  useProductStore,
  SORT_LABELS,
  SortOption,
  Product,
} from '../store/productStore';
import { resolveImageUrl, API_ENDPOINTS } from '../config/api';
import { useCartStore } from '../store/cartStore';
import { useProductDetailStore } from '../store/productDetailStore';
import { useProfileStore } from '../store/profileStore';
import { useCuratedStore } from '../store/curatedStore';
import { navigate } from '../navigation/navigationRef';
import { SwiperFlatList } from 'react-native-swiper-flatlist';
import { getProductWeightDisplay } from '../utils/cannabisLimit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 14;
const BANNER_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const BANNER_HEIGHT = 180;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

const ALL_CANNABIS_QUERY =
  'CANNABIS PLANT SEEDS,CARTRIDGE 510,Disposable Vapes,Dried Flower,Edibles-Beverages Dried,Edibles-Beverages Liquid,Edibles-Candy/Chocolate/Confec,Extracts Ingested,Extracts Inhaled,FORTIFIED PRE-ROLLED,KIEF,MILLED/BLENDED,PRE-ROLLED,THC POUCHES,Topical Products,Vape';

const ALL_NICOTINE_QUERY =
  'Nicotine Closed Pods,Nicotine E-Juice,NICOTINE POUCHES / SNUS,Nicotine Vapes,vapes & e-juices,vaping accessories';

const HERO_IMAGES = [
  { id: '1', source: require('../assets/Images/hero1.png') },
  { id: '2', source: require('../assets/Images/hero2.png') },
  { id: '3', source: require('../assets/Images/hero3.png') },
];

export interface DynamicHomeSection {
  id: number;
  heading: string;
  sub_heading?: string | null;
  display_order?: number;
  products: Product[];
}

type HomeFilterTab = 'category' | 'strain' | 'price' | 'brand';
type HomePriceRange = 'all' | 'under-20' | '20-40' | '40-60' | 'above-60';

const HOME_PRICE_RANGE_OPTIONS: { id: HomePriceRange; label: string; min?: number; max?: number }[] = [
  { id: 'all', label: 'All Prices' },
  { id: 'under-20', label: 'Under $20', max: 20 },
  { id: '20-40', label: '$20 – $40', min: 20, max: 40 },
  { id: '40-60', label: '$40 – $60', min: 40, max: 60 },
  { id: 'above-60', label: '$60 & Above', min: 60 },
];

const HOME_SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'default', label: 'Featured / Default' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'name_asc', label: 'Name: A to Z' },
  { id: 'thc_desc', label: 'THC: High to Low' },
];

const HeroSwiper = React.memo(() => {
  return (
    <View style={styles.heroSection}>
      <SwiperFlatList
        autoplay
        autoplayDelay={3}
        autoplayLoop
        autoplayLoopKeepAnimation
        data={HERO_IMAGES}
        index={0}
        showPagination
        paginationActiveColor="#0166dc"
        paginationDefaultColor="#CBD5E1"
        paginationStyleItem={styles.paginationDot}
        paginationStyleItemActive={styles.paginationDotActive}
        paginationStyleItemInactive={styles.paginationDotInactive}
        paginationStyle={styles.paginationContainer}
        renderItem={({ item }: { item: (typeof HERO_IMAGES)[0] }) => (
          <View style={styles.slideItemContainer}>
            <View style={styles.bannerCard}>
              <Image
                source={item.source}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            </View>
          </View>
        )}
      />
    </View>
  );
});

const HomeScreen = () => {
  // ── Local State & Refs (Primitive Hooks First) ───────────────
  const [showSortModal, setShowSortModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showHomeFilterModal, setShowHomeFilterModal] = useState(false);
  const [activeHomeFilterTab, setActiveHomeFilterTab] = useState<HomeFilterTab>('category');
  const [selectedStrain, setSelectedStrain] = useState<string | null>(null);
  const [backendStrains, setBackendStrains] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<HomePriceRange>('all');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [searchText, setSearchText] = useState('');

  // ── Zustand Store: Product State & Actions ───────────────────
  const products = useProductStore(state => state.products);
  const isLoading = useProductStore(state => state.isLoading);
  const isSearching = useProductStore(state => state.isSearching);
  const isRefreshing = useProductStore(state => state.isRefreshing);
  const searchQuery = useProductStore(state => state.searchQuery);
  const selectedCategory = useProductStore(state => state.selectedCategory);
  const selectedSort = useProductStore(state => state.selectedSort);
  const fetchProducts = useProductStore(state => state.fetchProducts);
  const refreshProducts = useProductStore(state => state.refreshProducts);
  const setSearchQuery = useProductStore(state => state.setSearchQuery);
  const setSelectedCategory = useProductStore(state => state.setSelectedCategory);
  const setSelectedSort = useProductStore(state => state.setSelectedSort);
  const resetFilters = useProductStore(state => state.resetFilters);

  // ── Zustand Store: Cart & Modals ─────────────────────────────
  const addToCart = useCartStore(state => state.addToCart);
  const openCart = useCartStore(state => state.openCart);
  const cartCount = useCartStore(state => state.totalCount);
  const openDetail = useProductDetailStore(state => state.openDetail);
  const openProfile = useProfileStore(state => state.openProfile);

  // ── Curated Store (New Arrivals & Best Sellers) ──────────────
  const openCuratedModal = useCuratedStore(state => state.openCuratedModal);
  const newArrivals = useCuratedStore(state => state.newArrivals);
  const bestSellers = useCuratedStore(state => state.bestSellers);
  const fetchNewArrivals = useCuratedStore(state => state.fetchNewArrivals);
  const fetchBestSellers = useCuratedStore(state => state.fetchBestSellers);
  const isLoadingNewArrivals = useCuratedStore(state => state.isLoadingNewArrivals);
  const isLoadingBestSellers = useCuratedStore(state => state.isLoadingBestSellers);

  const storeCategories = useProductStore(state => state.categories);
  const fetchCategories = useProductStore(state => state.fetchCategories);

  // ── Navigation & Category Showcase State ────────────────────
  const navigation = useNavigation<any>();
  const [cannabisProducts, setCannabisProducts] = useState<Product[]>([]);
  const [nicotineProducts, setNicotineProducts] = useState<Product[]>([]);
  const [isLoadingCategoryShowcase, setIsLoadingCategoryShowcase] = useState(false);

  // ── Dynamic Custom Home Sections State ──────────────────────
  const [homeSections, setHomeSections] = useState<DynamicHomeSection[]>([]);
  const [isLoadingHomeSections, setIsLoadingHomeSections] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  const fetchHomeSections = useCallback(async () => {
    try {
      setIsLoadingHomeSections(true);
      const res = await fetch(API_ENDPOINTS.homeSections);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data && data.success && Array.isArray(data.sections)) {
        setHomeSections(
          data.sections.filter(
            (s: DynamicHomeSection) => s && Array.isArray(s.products) && s.products.length > 0,
          ),
        );
      }
    } catch (err) {
      console.warn('Could not load dynamic home sections:', err);
    } finally {
      setIsLoadingHomeSections(false);
    }
  }, []);

  const navigateToCategory = useCallback((screenName: 'Cannabis' | 'Nicotine') => {
    try {
      if (navigation?.navigate) {
        navigation.navigate(screenName);
        return;
      }
    } catch {}
    navigate(screenName);
  }, [navigation]);

  const fetchCategoryShowcase = useCallback(async () => {
    try {
      setIsLoadingCategoryShowcase(true);
      const [resCannabis, resNicotine] = await Promise.all([
        fetch(`${API_ENDPOINTS.products}?category=${encodeURIComponent(ALL_CANNABIS_QUERY)}&limit=8&hasImage=true`),
        fetch(`${API_ENDPOINTS.products}?category=${encodeURIComponent(ALL_NICOTINE_QUERY)}&limit=8&hasImage=true`),
      ]);
      const jsonCannabis = await resCannabis.json();
      const jsonNicotine = await resNicotine.json();
      const listCannabis: Product[] = Array.isArray(jsonCannabis)
        ? jsonCannabis
        : Array.isArray(jsonCannabis?.products)
        ? jsonCannabis.products
        : [];
      const listNicotine: Product[] = Array.isArray(jsonNicotine)
        ? jsonNicotine
        : Array.isArray(jsonNicotine?.products)
        ? jsonNicotine.products
        : [];
      if (listCannabis.length > 0) setCannabisProducts(listCannabis);
      if (listNicotine.length > 0) setNicotineProducts(listNicotine);
    } catch (err) {
      console.warn('Failed to fetch home category showcase:', err);
    } finally {
      setIsLoadingCategoryShowcase(false);
    }
  }, []);

  const displayedCannabis = useMemo(() => {
    if (cannabisProducts.length > 0) return cannabisProducts.slice(0, 4);
    const catSet = new Set(ALL_CANNABIS_QUERY.split(',').map(c => c.trim().toLowerCase()));
    return products.filter(p => catSet.has((p.category || '').toLowerCase())).slice(0, 4);
  }, [cannabisProducts, products]);

  const displayedNicotine = useMemo(() => {
    if (nicotineProducts.length > 0) return nicotineProducts.slice(0, 4);
    const catSet = new Set(ALL_NICOTINE_QUERY.split(',').map(c => c.trim().toLowerCase()));
    return products.filter(p => catSet.has((p.category || '').toLowerCase())).slice(0, 4);
  }, [nicotineProducts, products]);

  // Use all categories from backend if loaded, fallback to derived set
  const categories = useMemo(() => {
    if (storeCategories && storeCategories.length > 1) {
      return storeCategories;
    }
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return ['All', ...Array.from(set)];
  }, [storeCategories, products]);

  // Load distinct categories, new arrivals, best sellers, category showcase & dynamic sections on mount
  useEffect(() => {
    fetchCategories();
    fetchNewArrivals();
    fetchBestSellers();
    fetchCategoryShowcase();
    fetchHomeSections();
  }, [fetchCategories, fetchNewArrivals, fetchBestSellers, fetchCategoryShowcase, fetchHomeSections]);

  const handleRefresh = useCallback(() => {
    refreshProducts();
    fetchNewArrivals();
    fetchBestSellers();
    fetchCategoryShowcase();
    fetchHomeSections();
  }, [refreshProducts, fetchNewArrivals, fetchBestSellers, fetchCategoryShowcase, fetchHomeSections]);

  // ── Reset Filters when navigating away to another screen or returning to Home ──
  useFocusEffect(
    useCallback(() => {
      // If returning to Home and filters are non-default, reset them
      const state = useProductStore.getState();
      if (
        state.selectedCategory !== 'All' ||
        state.selectedSort !== 'default' ||
        state.searchQuery !== ''
      ) {
        setSearchText('');
        resetFilters();
      }

      return () => {
        // Reset filters when navigating away from Home screen
        setSearchText('');
        resetFilters();
        setShowSortModal(false);
        setShowCategoryModal(false);
        setShowHomeFilterModal(false);
        setSelectedBrand(null);
        setSelectedPriceRange('all');
      };
    }, [resetFilters])
  );

  // Sync external filter resets to local search text
  useEffect(() => {
    if (searchQuery === '' && searchText !== '') {
      setSearchText('');
    }
  }, [searchQuery]);

  // Server-side search & filtering debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchText);
      fetchProducts({
        search: searchText,
        category: selectedCategory,
        sort: selectedSort,
        hasImage: true,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, selectedCategory, selectedSort, fetchProducts, setSearchQuery]);

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
        console.warn('Could not fetch backend strains on home:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // ── Extract Available Strains dynamically from backend + products ──
  const availableStrains = useMemo(() => {
    const strainSet = new Set<string>();

    backendStrains.forEach(s => {
      if (s && typeof s === 'string') {
        const clean = s.trim();
        if (clean && clean.toLowerCase() !== 'none' && clean.toLowerCase() !== 'others') {
          strainSet.add(clean);
        }
      }
    });

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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory && selectedCategory !== 'All') count++;
    if (selectedStrain) count++;
    if (selectedBrand) count++;
    if (selectedPriceRange !== 'all') count++;
    if (selectedSort !== 'default') count++;
    return count;
  }, [selectedCategory, selectedStrain, selectedBrand, selectedPriceRange, selectedSort]);

  const handleResetHomeFilters = () => {
    setSelectedCategory('All');
    setSelectedStrain(null);
    setSelectedBrand(null);
    setSelectedPriceRange('all');
    setSelectedSort('default');
    setBrandSearchQuery('');
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Client-side Category filter
    if (selectedCategory && selectedCategory !== 'All') {
      result = result.filter(p => p.category?.trim().toLowerCase() === selectedCategory.trim().toLowerCase());
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

    // 3. Price range filter
    if (selectedPriceRange !== 'all') {
      const range = HOME_PRICE_RANGE_OPTIONS.find(r => r.id === selectedPriceRange);
      if (range) {
        result = result.filter(p => {
          const price = parseFloat(p.retail_price || '0');
          if (range.min !== undefined && price < range.min) return false;
          if (range.max !== undefined && price > range.max) return false;
          return true;
        });
      }
    }

    // 4. Sort
    if (selectedSort === 'thc_desc') {
      result.sort((a, b) => parseFloat(b.thC_LEVEL || '0') - parseFloat(a.thC_LEVEL || '0'));
    } else if (selectedSort === 'price_asc') {
      result.sort((a, b) => parseFloat(a.retail_price || '0') - parseFloat(b.retail_price || '0'));
    } else if (selectedSort === 'price_desc') {
      result.sort((a, b) => parseFloat(b.retail_price || '0') - parseFloat(a.retail_price || '0'));
    } else if (selectedSort === 'name_asc') {
      result.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
    }

    return result;
  }, [products, selectedCategory, selectedBrand, selectedPriceRange, selectedSort]);

  // ── Header Component for FlatList ───────────────────────────
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* ── 1. Hero Carousel using react-native-swiper-flatlist ── */}
      <HeroSwiper />

      {/* ── 2. New Arrivals Section (Max 4 Cards + See More) ── */}
      <View style={styles.homeCuratedSection}>
        <View style={styles.homeCuratedHeader}>
          <View style={styles.homeCuratedTitleCol}>
            <View style={styles.homeCuratedBadgeRow}>
              <View style={[styles.homeCuratedBadge, styles.badgeNew]}>
                <Sparkles size={11} color="#3B82F6" />
                <Text style={styles.badgeTextNew}>FRESH DROPS</Text>
              </View>
            </View>
            <Text style={styles.homeCuratedTitle}>New Arrivals</Text>
            <Text style={styles.homeCuratedSub}>
              {newArrivals.length > 0
                ? `${newArrivals.length} fresh boutique arrivals`
                : 'Discover our latest craft drops'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.seeMoreHeaderBtn}
            onPress={() => openCuratedModal('new-arrivals')}
            activeOpacity={0.75}>
            <Text style={styles.seeMoreHeaderText}>See More</Text>
            <ChevronRight size={15} color="#0166dc" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {isLoadingNewArrivals && newArrivals.length === 0 ? (
          <View style={styles.curatedLoadingWrap}>
            <ActivityIndicator size="small" color="#0166dc" />
          </View>
        ) : (
          <View style={styles.homeCuratedGrid}>
            {newArrivals.slice(0, 4).map(item =>
              renderProductCard(item, `new-${item.pk || item.sku || item.product_name}`)
            )}
          </View>
        )}

        {/* <TouchableOpacity
          style={styles.seeMoreBottomBtn}
          onPress={() => openCuratedModal('new-arrivals')}
          activeOpacity={0.85}>
          <Text style={styles.seeMoreBottomBtnText}>See More New Arrivals</Text>
          <ArrowRight size={15} color="#0F172A" strokeWidth={2.4} />
        </TouchableOpacity> */}
      </View>

      {/* ── 3. Best Sellers Section (Max 4 Cards + See More) ── */}
      <View style={[styles.homeCuratedSection, styles.homeCuratedSectionBest]}>
        <View style={styles.homeCuratedHeader}>
          <View style={styles.homeCuratedTitleCol}>
            <View style={styles.homeCuratedBadgeRow}>
              <View style={[styles.homeCuratedBadge, styles.badgeBest]}>
                <Crown size={11} color="#F59E0B" />
                <Text style={styles.badgeTextBest}>TOP RATED</Text>
              </View>
            </View>
            <Text style={styles.homeCuratedTitle}>Best Sellers</Text>
            <Text style={styles.homeCuratedSub}>
              {bestSellers.length > 0
                ? `${bestSellers.length} community favorites`
                : 'Top requested craft picks'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.seeMoreHeaderBtn}
            onPress={() => openCuratedModal('best-sellers')}
            activeOpacity={0.75}>
            <Text style={[styles.seeMoreHeaderText, { color: '#B45309' }]}>See More</Text>
            <ChevronRight size={15} color="#B45309" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {isLoadingBestSellers && bestSellers.length === 0 ? (
          <View style={styles.curatedLoadingWrap}>
            <ActivityIndicator size="small" color="#F59E0B" />
          </View>
        ) : (
          <View style={styles.homeCuratedGrid}>
            {bestSellers.slice(0, 4).map(item =>
              renderProductCard(item, `best-${item.pk || item.sku || item.product_name}`)
            )}
          </View>
        )}

     
      </View>

      {/* ── 3.5. Dynamic Custom Sections (Configured via Home Page Section Master) ── */}
      {homeSections.map((sec, secIdx) => {
        const isExpanded = Boolean(expandedSections[sec.id]);
        const displayed = isExpanded ? sec.products : sec.products.slice(0, 4);
        const hasMore = sec.products.length > 4;

        return (
          <View
            key={`home-dynamic-sec-${sec.id}-${secIdx}`}
            style={[styles.homeCuratedSection, styles.homeCuratedSectionDynamic]}>
            <View style={styles.homeCuratedHeader}>
              <View style={styles.homeCuratedTitleCol}>
                <View style={styles.homeCuratedBadgeRow}>
                  <View style={[styles.homeCuratedBadge, styles.badgeDynamic]}>
                    <Sparkles size={11} color="#1D4ED8" />
                    <Text style={styles.badgeTextDynamic}>FEATURED</Text>
                  </View>
                </View>
                <Text style={styles.homeCuratedTitle}>{sec.heading}</Text>
                {sec.sub_heading ? (
                  <Text style={styles.homeCuratedSub}>{sec.sub_heading}</Text>
                ) : (
                  <Text style={styles.homeCuratedSub}>
                    {sec.products.length} hand-picked selections
                  </Text>
                )}
              </View>

              {hasMore && (
                <TouchableOpacity
                  style={styles.seeMoreHeaderBtn}
                  onPress={() =>
                    setExpandedSections(prev => ({
                      ...prev,
                      [sec.id]: !prev[sec.id],
                    }))
                  }
                  activeOpacity={0.75}>
                  <Text style={[styles.seeMoreHeaderText, { color: '#1D4ED8' }]}>
                    {isExpanded ? 'Show Less' : 'See More'}
                  </Text>
                  {isExpanded ? (
                    <ChevronUp size={15} color="#1D4ED8" strokeWidth={2.4} />
                  ) : (
                    <ChevronRight size={15} color="#1D4ED8" strokeWidth={2.4} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.homeCuratedGrid}>
              {displayed.map(item =>
                renderProductCard(item, `dynamic-${sec.id}-${item.pk || item.sku || item.product_name}`)
              )}
            </View>

            {hasMore && (
              <TouchableOpacity
                style={[styles.seeMoreBottomBtn, styles.seeMoreBottomBtnDynamic]}
                onPress={() =>
                  setExpandedSections(prev => ({
                    ...prev,
                    [sec.id]: !prev[sec.id],
                  }))
                }
                activeOpacity={0.85}>
                <Text style={styles.seeMoreBottomBtnText}>
                  {isExpanded ? 'Show Less' : `View All (${sec.products.length} Products)`}
                </Text>
                {isExpanded ? (
                  <ChevronUp size={15} color="#0F172A" strokeWidth={2.4} />
                ) : (
                  <ChevronDown size={15} color="#0F172A" strokeWidth={2.4} />
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* ── 4. Two Category Showcase Images (1. Cannabis & 2. Nicotine) ── */}
      <View style={styles.categoryShowcaseSection}>
        <View style={styles.categoryShowcaseHeader}>
          <Text style={styles.categoryShowcaseTitle}>Shop by Category</Text>
          <Text style={styles.categoryShowcaseSub}>Tap an image to browse the full collection</Text>
        </View>

        <View style={styles.categoryImagesRow}>
          {/* 1. Cannabis Image Card */}
          <TouchableOpacity
            style={[styles.categoryCard, styles.cannabisCard]}
            activeOpacity={0.85}
            onPress={() => navigateToCategory('Cannabis')}>
            <Image
              source={require('../assets/Images/Nicotine.png')}
              style={styles.categoryCardImage}
              resizeMode="cover"
            />
            <View style={styles.categoryCardOverlay}>
              <View style={[styles.categoryCardBadge, styles.cannabisBadge]}>
                <Leaf size={10} color="#3B82F6" />
                <Text style={styles.cannabisBadgeText}>CANNABIS</Text>
              </View>
              <View style={styles.categoryCardBottom}>
                <Text style={styles.categoryCardTitle}>Cannabis</Text>
                <View style={styles.categoryExplorePill}>
                  <Text style={styles.categoryExploreText}>Explore</Text>
                  <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* 2. Nicotine Image Card */}
          <TouchableOpacity
            style={[styles.categoryCard, styles.nicotineCard]}
            activeOpacity={0.85}
            onPress={() => navigateToCategory('Nicotine')}>
            <Image
              source={require('../assets/Images/cannabis.png')}
              style={styles.categoryCardImage}
              resizeMode="cover"
            />
            <View style={styles.categoryCardOverlay}>
              <View style={[styles.categoryCardBadge, styles.nicotineBadge]}>
                <Flame size={10} color="#38BDF8" />
                <Text style={styles.nicotineBadgeText}>NICOTINE</Text>
              </View>
              <View style={styles.categoryCardBottom}>
                <Text style={styles.categoryCardTitle}>Nicotine</Text>
                <View style={styles.categoryExplorePill}>
                  <Text style={styles.categoryExploreText}>Explore</Text>
                  <ChevronRight size={13} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 5. Cannabis Products Section (Max 4 Cards + See More) ── */}
      <View style={[styles.homeCuratedSection, styles.homeCuratedSectionCannabis]}>
        <View style={styles.homeCuratedHeader}>
          <View style={styles.homeCuratedTitleCol}>
            <View style={styles.homeCuratedBadgeRow}>
              <View style={[styles.homeCuratedBadge, styles.badgeCannabis]}>
                <Leaf size={11} color="#1D4ED8" />
                <Text style={styles.badgeTextCannabis}>PURE CANNABIS</Text>
              </View>
            </View>
            <Text style={styles.homeCuratedTitle}>Cannabis Products</Text>
            <Text style={styles.homeCuratedSub}>
              Craft flower, pre-rolls, edibles, vapes & extracts
            </Text>
          </View>

          <TouchableOpacity
            style={styles.seeMoreHeaderBtn}
            onPress={() => navigateToCategory('Cannabis')}
            activeOpacity={0.75}>
            <Text style={[styles.seeMoreHeaderText, { color: '#1D4ED8' }]}>See More</Text>
            <ChevronRight size={15} color="#1D4ED8" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {isLoadingCategoryShowcase && displayedCannabis.length === 0 ? (
          <View style={styles.curatedLoadingWrap}>
            <ActivityIndicator size="small" color="#1D4ED8" />
          </View>
        ) : (
          <View style={styles.homeCuratedGrid}>
            {displayedCannabis.slice(0, 4).map(item =>
              renderProductCard(item, `cannabis-${item.pk || item.sku || item.product_name}`)
            )}
          </View>
        )}

      
      </View>

      {/* ── 6. Nicotine Products Section (Max 4 Cards + See More) ── */}
      <View style={[styles.homeCuratedSection, styles.homeCuratedSectionNicotine]}>
        <View style={styles.homeCuratedHeader}>
          <View style={styles.homeCuratedTitleCol}>
            <View style={styles.homeCuratedBadgeRow}>
              <View style={[styles.homeCuratedBadge, styles.badgeNicotine]}>
                <Flame size={11} color="#0284C7" />
                <Text style={styles.badgeTextNicotine}>VAPES & PODS</Text>
              </View>
            </View>
            <Text style={styles.homeCuratedTitle}>Nicotine Products</Text>
            <Text style={styles.homeCuratedSub}>
              Closed pods, e-juices, pouches & accessories
            </Text>
          </View>

          <TouchableOpacity
            style={styles.seeMoreHeaderBtn}
            onPress={() => navigateToCategory('Nicotine')}
            activeOpacity={0.75}>
            <Text style={[styles.seeMoreHeaderText, { color: '#0284C7' }]}>See More</Text>
            <ChevronRight size={15} color="#0284C7" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {isLoadingCategoryShowcase && displayedNicotine.length === 0 ? (
          <View style={styles.curatedLoadingWrap}>
            <ActivityIndicator size="small" color="#0284C7" />
          </View>
        ) : (
          <View style={styles.homeCuratedGrid}>
            {displayedNicotine.slice(0, 4).map(item =>
              renderProductCard(item, `nicotine-${item.pk || item.sku || item.product_name}`)
            )}
          </View>
        )}

      </View>

      {/* ── 4. Section Title & Results Count with Right Filter Icon ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>All Products</Text>
          <Text style={styles.sectionSubtitle}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.allProductsFilterBtn,
            activeFiltersCount > 0 && styles.allProductsFilterBtnActive,
          ]}
          onPress={() => setShowHomeFilterModal(true)}
          activeOpacity={0.8}>
          <SlidersHorizontal
            size={16}
            color={activeFiltersCount > 0 ? '#0F172A' : '#1E293B'}
            strokeWidth={2.2}
          />
          <Text
            style={[
              styles.allProductsFilterBtnText,
              activeFiltersCount > 0 && styles.allProductsFilterBtnTextActive,
            ]}>
            Filter
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.allProductsFilterBadge}>
              <Text style={styles.allProductsFilterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filter Bar (shows when any filter is active) */}
      {activeFiltersCount > 0 && (
        <View style={styles.homeFilterStatusRow}>
          <Text style={styles.homeFilterStatusText}>
            Showing {filteredProducts.length} filtered items
          </Text>
          <TouchableOpacity
            style={styles.homeResetFilterBtn}
            onPress={handleResetHomeFilters}
            activeOpacity={0.7}>
            <RotateCcw size={12} color="#EF4444" strokeWidth={2} />
            <Text style={styles.homeResetFilterBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ── Product Card Item ───────────────────────────────────────
  const renderProductCard = (item: Product, key?: string) => {
    const strain = item.strain;

    // Strain badge color
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
      <View key={key || item.pk || item.sku || item.product_name} style={styles.productCard}>
        {/* Card Image Container – Tapping opens big image and details */}
        <TouchableOpacity
          style={styles.imageWrap}
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

          {/* Strain / Category Tag */}
          {strain ? (
            <View style={[styles.strainBadge, strainBadgeStyle]}>
              <Text style={[styles.strainText, strainTextStyle]}>{strain}</Text>
            </View>
          ) : item.category ? (
            <View style={[styles.strainBadge, styles.categoryBadge]}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {item.category}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {/* Card Body */}
        <View style={styles.cardBody}>
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

          {/* Product Title – Tapping opens detail view */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => openDetail(item)}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.product_name}
            </Text>
          </TouchableOpacity>

          {/* THC / CBD */}
          {item.thC_LEVEL ? (
            <View style={styles.thcRow}>
              <Text style={styles.thcLabel}>THC:</Text>
              <Text style={styles.thcValue}>{item.thC_LEVEL}%</Text>
            </View>
          ) : null}

          {/* Price & Add Button */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceText}>
                ${parseFloat(item.retail_price || '0').toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              activeOpacity={0.85}
              onPress={() => addToCart(item, 1, true)}>
              <Plus size={16} color="#0F172A" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => renderProductCard(item);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ── Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Left: Brand Logo */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/Images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Right: User Avatar */}
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.avatarButton}
            activeOpacity={0.7}
            onPress={() => openProfile()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CircleUser size={26} color="#0F172A" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Fixed Search Bar & Right-Side Cart (Stable & Non-Unmounting) ── */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchBar}>
          <Search size={18} color={MUTED} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Keyword or Product ID"
            placeholderTextColor={MUTED}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {isSearching ? (
            <ActivityIndicator size="small" color={ACCENT_DEEP} style={{ marginRight: 6 }} />
          ) : searchText.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setSearchText('');
                setSearchQuery('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearSearchBtn}>
              <X size={16} color={MUTED} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Right side of search: Cart Icon */}
        <TouchableOpacity
          style={styles.searchCartButton}
          onPress={openCart}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ShoppingCart size={22} color="#0F172A" strokeWidth={1.9} />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cartCount > 99 ? '99+' : cartCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Main FlatList Grid ────────────────────────────────── */}
      {isLoading && products.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={ACCENT_DEEP} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.pk || item.sku || item.product_name}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          renderItem={renderProductItem}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No Products Found</Text>
              <Text style={styles.emptySub}>
                Try adjusting your search query or category filters.
              </Text>
              {(searchQuery !== '' || selectedCategory !== 'All' || selectedSort !== 'default') && (
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={resetFilters}>
                  <Text style={styles.resetBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Sort Options Modal (Bottom Sheet Style) ────────────── */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sort Products</Text>

            {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.modalOption,
                  selectedSort === key && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSelectedSort(key);
                  setShowSortModal(false);
                }}>
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedSort === key && styles.modalOptionTextActive,
                  ]}>
                  {SORT_LABELS[key]}
                </Text>
                {selectedSort === key && (
                  <Check size={18} color={ACCENT_DEEP} strokeWidth={2.5} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Category Selection Modal (Bottom Sheet Style) ──────── */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Filter by Category</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.modalOption,
                    selectedCategory === cat && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryModal(false);
                  }}>
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedCategory === cat && styles.modalOptionTextActive,
                    ]}>
                    {cat}
                  </Text>
                  {selectedCategory === cat && (
                    <Check size={18} color={ACCENT_DEEP} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* ── All Products Filter Modal (Categories, Price & Sort, Brand) ── */}
      <Modal
        visible={showHomeFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHomeFilterModal(false)}>
        <View style={styles.homeFilterModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowHomeFilterModal(false)}
          />
          <View style={styles.homeFilterModalContainer}>
            {/* Modal Header */}
            <View style={styles.homeFilterModalHeader}>
              <View>
                <Text style={styles.homeFilterModalTitle}>Filter All Products</Text>
                <Text style={styles.homeFilterModalSubtitle}>
                  {filteredProducts.length} items found
                </Text>
              </View>

              <View style={styles.homeFilterModalHeaderActions}>
                {activeFiltersCount > 0 && (
                  <TouchableOpacity
                    style={styles.homeFilterModalResetBtn}
                    onPress={handleResetHomeFilters}
                    activeOpacity={0.7}>
                    <Text style={styles.homeFilterModalResetText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.homeFilterModalCloseBtn}
                  onPress={() => setShowHomeFilterModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={20} color="#0F172A" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Modal Body: Left Tab Sidebar + Right Options Content */}
            <View style={styles.homeFilterModalBody}>
              {/* Left Side: Filter Tabs */}
              <View style={styles.homeFilterTabsSidebar}>
                <TouchableOpacity
                  style={[
                    styles.homeFilterTabItem,
                    activeHomeFilterTab === 'category' && styles.homeFilterTabItemActive,
                  ]}
                  onPress={() => setActiveHomeFilterTab('category')}>
                  <Text
                    style={[
                      styles.homeFilterTabLabel,
                      activeHomeFilterTab === 'category' && styles.homeFilterTabLabelActive,
                    ]}>
                    Category
                  </Text>
                  {selectedCategory !== 'All' && <View style={styles.homeTabActiveDot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.homeFilterTabItem,
                    activeHomeFilterTab === 'strain' && styles.homeFilterTabItemActive,
                  ]}
                  onPress={() => setActiveHomeFilterTab('strain')}>
                  <Text
                    style={[
                      styles.homeFilterTabLabel,
                      activeHomeFilterTab === 'strain' && styles.homeFilterTabLabelActive,
                    ]}>
                    Strain
                  </Text>
                  {selectedStrain !== null && <View style={styles.homeTabActiveDot} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.homeFilterTabItem,
                    activeHomeFilterTab === 'price' && styles.homeFilterTabItemActive,
                  ]}
                  onPress={() => setActiveHomeFilterTab('price')}>
                  <Text
                    style={[
                      styles.homeFilterTabLabel,
                      activeHomeFilterTab === 'price' && styles.homeFilterTabLabelActive,
                    ]}>
                    Price & Sort
                  </Text>
                  {(selectedPriceRange !== 'all' || selectedSort !== 'default') && (
                    <View style={styles.homeTabActiveDot} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.homeFilterTabItem,
                    activeHomeFilterTab === 'brand' && styles.homeFilterTabItemActive,
                  ]}
                  onPress={() => setActiveHomeFilterTab('brand')}>
                  <Text
                    style={[
                      styles.homeFilterTabLabel,
                      activeHomeFilterTab === 'brand' && styles.homeFilterTabLabelActive,
                    ]}>
                    Brand
                  </Text>
                  {selectedBrand !== null && <View style={styles.homeTabActiveDot} />}
                </TouchableOpacity>
              </View>

              {/* Right Side: Options Content */}
              <View style={styles.homeFilterContentPane}>
                {/* 1. CATEGORY TAB */}
                {activeHomeFilterTab === 'category' && (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.homeFilterOptionsScroll}>
                    <Text style={styles.homeFilterSectionHeader}>Categories</Text>
                    {categories.map(cat => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.homeOptionRow,
                            isSelected && styles.homeOptionRowSelected,
                          ]}
                          onPress={() => setSelectedCategory(cat)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.homeOptionLabel,
                              isSelected && styles.homeOptionLabelSelected,
                            ]}
                            numberOfLines={2}>
                            {cat === 'All' ? 'All Categories' : cat}
                          </Text>
                          <View
                            style={[
                              styles.homeRadioCircle,
                              isSelected && styles.homeRadioCircleSelected,
                            ]}>
                            {isSelected && <View style={styles.homeRadioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* 2. STRAIN TAB (Hybrid, Indica, Sativa...) */}
                {activeHomeFilterTab === 'strain' && (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.homeFilterOptionsScroll}>
                    <Text style={styles.homeFilterSectionHeader}>Strain Type</Text>

                    {/* All Strains option */}
                    <TouchableOpacity
                      style={[
                        styles.homeOptionRow,
                        selectedStrain === null && styles.homeOptionRowSelected,
                      ]}
                      onPress={() => setSelectedStrain(null)}
                      activeOpacity={0.7}>
                      <Text
                        style={[
                          styles.homeOptionLabel,
                          selectedStrain === null && styles.homeOptionLabelSelected,
                        ]}>
                        All Strains
                      </Text>
                      <View
                        style={[
                          styles.homeRadioCircle,
                          selectedStrain === null && styles.homeRadioCircleSelected,
                        ]}>
                        {selectedStrain === null && <View style={styles.homeRadioDot} />}
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
                            styles.homeOptionRow,
                            isSelected && styles.homeOptionRowSelected,
                          ]}
                          onPress={() => setSelectedStrain(isSelected ? null : strainName)}
                          activeOpacity={0.7}>
                          <View style={styles.homeStrainOptionLeft}>
                            <View style={[styles.homeStrainColorDot, { backgroundColor: pillColor }]} />
                            <Text
                              style={[
                                styles.homeOptionLabel,
                                isSelected && styles.homeOptionLabelSelected,
                              ]}>
                              {strainName}
                            </Text>
                            <View style={[styles.homeStrainMiniBadge, { backgroundColor: pillBg }]}>
                              <Text style={[styles.homeStrainMiniBadgeText, { color: pillColor }]}>
                                {strainName.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.homeRadioCircle,
                              isSelected && styles.homeRadioCircleSelected,
                            ]}>
                            {isSelected && <View style={styles.homeRadioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* 3. PRICE & SORT TAB */}
                {activeHomeFilterTab === 'price' && (
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.homeFilterOptionsScroll}>
                    <Text style={styles.homeFilterSectionHeader}>Sort By</Text>
                    {HOME_SORT_OPTIONS.map(opt => {
                      const isSelected = selectedSort === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.homeOptionRow,
                            isSelected && styles.homeOptionRowSelected,
                          ]}
                          onPress={() => setSelectedSort(opt.id)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.homeOptionLabel,
                              isSelected && styles.homeOptionLabelSelected,
                            ]}>
                            {opt.label}
                          </Text>
                          <View
                            style={[
                              styles.homeRadioCircle,
                              isSelected && styles.homeRadioCircleSelected,
                            ]}>
                            {isSelected && <View style={styles.homeRadioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    <Text style={[styles.homeFilterSectionHeader, { marginTop: 18 }]}>
                      Price Range
                    </Text>
                    {HOME_PRICE_RANGE_OPTIONS.map(opt => {
                      const isSelected = selectedPriceRange === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.homeOptionRow,
                            isSelected && styles.homeOptionRowSelected,
                          ]}
                          onPress={() => setSelectedPriceRange(opt.id)}
                          activeOpacity={0.7}>
                          <Text
                            style={[
                              styles.homeOptionLabel,
                              isSelected && styles.homeOptionLabelSelected,
                            ]}>
                            {opt.label}
                          </Text>
                          <View
                            style={[
                              styles.homeRadioCircle,
                              isSelected && styles.homeRadioCircleSelected,
                            ]}>
                            {isSelected && <View style={styles.homeRadioDot} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* 3. BRAND TAB */}
                {activeHomeFilterTab === 'brand' && (
                  <View style={styles.homeBrandContentContainer}>
                    <View style={styles.homeBrandSearchRow}>
                      <Search size={14} color="#64748B" />
                      <TextInput
                        style={styles.homeBrandSearchInput}
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
                      contentContainerStyle={styles.homeFilterOptionsScroll}>
                      <TouchableOpacity
                        style={[
                          styles.homeOptionRow,
                          selectedBrand === null && styles.homeOptionRowSelected,
                        ]}
                        onPress={() => setSelectedBrand(null)}
                        activeOpacity={0.7}>
                        <Text
                          style={[
                            styles.homeOptionLabel,
                            selectedBrand === null && styles.homeOptionLabelSelected,
                          ]}>
                          All Brands
                        </Text>
                        <View
                          style={[
                            styles.homeRadioCircle,
                            selectedBrand === null && styles.homeRadioCircleSelected,
                          ]}>
                          {selectedBrand === null && <View style={styles.homeRadioDot} />}
                        </View>
                      </TouchableOpacity>

                      {filteredBrandsList.length === 0 ? (
                        <View style={styles.homeNoBrandsFound}>
                          <Text style={styles.homeNoBrandsText}>No matching brands</Text>
                        </View>
                      ) : (
                        filteredBrandsList.map(brandName => {
                          const isSelected = selectedBrand === brandName;
                          return (
                            <TouchableOpacity
                              key={brandName}
                              style={[
                                styles.homeOptionRow,
                                isSelected && styles.homeOptionRowSelected,
                              ]}
                              onPress={() => setSelectedBrand(isSelected ? null : brandName)}
                              activeOpacity={0.7}>
                              <Text
                                style={[
                                  styles.homeOptionLabel,
                                  isSelected && styles.homeOptionLabelSelected,
                                ]}
                                numberOfLines={1}>
                                {brandName}
                              </Text>
                              <View
                                style={[
                                  styles.homeRadioCircle,
                                  isSelected && styles.homeRadioCircleSelected,
                                ]}>
                                {isSelected && <View style={styles.homeRadioDot} />}
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
            <View style={styles.homeFilterModalFooter}>
              <TouchableOpacity
                style={styles.homeApplyFilterBtn}
                onPress={() => setShowHomeFilterModal(false)}
                activeOpacity={0.85}>
                <Text style={styles.homeApplyFilterBtnText}>
                  Apply Filters ({filteredProducts.length} Items)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Theme tokens (Pharsyde Light Theme - Matches Frontend) ─────
const BG = '#F8FAFC';
const CARD_BG = '#FFFFFF';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const ACCENT_GREEN = '#3B82F6';
const ACCENT_DEEP = '#0166dc';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  logoWrapper: {
    justifyContent: 'center',
  },
  logo: {
    width: 140,
    height: 38,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: ACCENT_GREEN,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },

  // FlatList content
  listContent: {
    paddingBottom: 110,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: CARD_GAP,
  },
  headerContent: {
    paddingTop: 16,
  },

  // Hero Section
  heroSection: {
    width: '100%',
    marginBottom: 16,
  },
  slideItemContainer: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCard: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  paginationContainer: {
    position: 'relative',
    marginTop: 10,
    bottom: undefined,
  },
  paginationDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  paginationDotActive: {
    width: 22,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT_DEEP,
  },
  paginationDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },

  // Search Bar & Cart Row
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 14,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchCartButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    position: 'relative',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },

  // Filter & Sort Row
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 10,
    marginBottom: 18,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
  },
  filterButtonActive: {
    borderColor: ACCENT_DEEP,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT,
  },
  filterButtonTextActive: {
    color: ACCENT_DEEP,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 6,
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: MUTED,
    fontWeight: '500',
    marginTop: 1,
  },
  allProductsFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  allProductsFilterBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  allProductsFilterBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  allProductsFilterBtnTextActive: {
    color: '#0F172A',
  },
  allProductsFilterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#0F172A',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  allProductsFilterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  homeFilterStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
  },
  homeFilterStatusText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  homeResetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  homeResetFilterBtnText: {
    fontSize: 11.5,
    color: '#EF4444',
    fontWeight: '700',
  },

  // Product Card
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  imageWrap: {
    width: '100%',
    height: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 0,
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
    fontSize: 36,
  },
  strainBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  strainText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sativaBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sativaText: {
    color: '#B45309',
  },
  indicaBadge: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  indicaText: {
    color: '#7E22CE',
  },
  hybridBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  hybridText: {
    color: '#1D4ED8',
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: BORDER,
    maxWidth: CARD_WIDTH - 50,
  },
  categoryBadgeText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
  },
  cardBody: {
    padding: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 6,
  },
  brandText: {
    flex: 1,
    fontSize: 11,
    color: MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weightBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weightBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT,
    lineHeight: 18,
    height: 36, // 2 lines
    marginBottom: 6,
  },
  thcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  thcLabel: {
    fontSize: 11,
    color: MUTED,
  },
  thcValue: {
    fontSize: 11,
    color: ACCENT_DEEP,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: TEXT,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading & Empty States
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(1, 102, 220, 0.3)',
  },
  resetBtnText: {
    color: ACCENT_DEEP,
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal / Dropdown Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
  modalOptionText: {
    fontSize: 14,
    color: TEXT,
    fontWeight: '500',
  },
  modalOptionTextActive: {
    color: ACCENT_DEEP,
    fontWeight: '700',
  },

  // Curated Cards (New Arrivals & Best Sellers on Home)
  homeCuratedSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
    marginTop: 18,
    marginBottom: 6,
  },
  homeCuratedSectionBest: {
    marginTop: 12,
  },
  homeCuratedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  homeCuratedTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  homeCuratedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  homeCuratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
  },
  badgeNew: {
    backgroundColor: '#1E3A8A',
    borderWidth: 1,
    borderColor: '#1E40AF',
  },
  badgeTextNew: {
    color: '#3B82F6',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  badgeBest: {
    backgroundColor: '#451A03',
    borderWidth: 1,
    borderColor: '#92400E',
  },
  badgeTextBest: {
    color: '#FBBF24',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  homeCuratedTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  homeCuratedSub: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  seeMoreHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seeMoreHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0166dc',
  },
  homeCuratedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  curatedLoadingWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeMoreBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  seeMoreBottomBtnBest: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  seeMoreBottomBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  curatedCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: CARD_GAP,
    marginTop: 6,
    marginBottom: 16,
  },
  curatedCard: {
    flex: 1,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  curatedCardNew: {
    backgroundColor: '#092612',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  curatedCardBest: {
    backgroundColor: '#261908',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  curatedCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  curatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  curatedBadgeNew: {
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  curatedBadgeBest: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  curatedBadgeTextNew: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  curatedBadgeTextBest: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  curatedCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  curatedCardSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
    marginBottom: 8,
  },
  curatedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  curatedActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#3B82F6',
  },

  // ── Two Category Showcase Images (1. Cannabis & 2. Nicotine) ──
  categoryShowcaseSection: {
    marginHorizontal: HORIZONTAL_PADDING,
    marginTop: 18,
    marginBottom: 4,
  },
  categoryShowcaseHeader: {
    marginBottom: 10,
  },
  categoryShowcaseTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  categoryShowcaseSub: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  categoryImagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: CARD_GAP,
  },
  categoryCard: {
    width: CARD_WIDTH,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cannabisCard: {
    borderWidth: 1.5,
    borderColor: '#0166dc',
  },
  nicotineCard: {
    borderWidth: 1.5,
    borderColor: '#0284C7',
  },
  categoryCardImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  categoryCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    padding: 10,
    justifyContent: 'space-between',
  },
  categoryCardBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cannabisBadge: {
    backgroundColor: 'rgba(30, 58, 138, 0.85)',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  cannabisBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#3B82F6',
    letterSpacing: 0.6,
  },
  nicotineBadge: {
    backgroundColor: 'rgba(8, 47, 73, 0.85)',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  nicotineBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 0.6,
  },
  categoryCardBottom: {
    gap: 6,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  categoryExplorePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  categoryExploreText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Cannabis & Nicotine Curated Product Sections ────────────
  homeCuratedSectionCannabis: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  badgeCannabis: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  badgeTextCannabis: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 0.6,
  },
  seeMoreBottomBtnCannabis: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },

  homeCuratedSectionNicotine: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  badgeNicotine: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  badgeTextNicotine: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0284C7',
    letterSpacing: 0.6,
  },
  seeMoreBottomBtnNicotine: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },

  // ── Dynamic Custom Home Sections Styles ─────────────────────
  homeCuratedSectionDynamic: {
    marginTop: 14,
  },
  badgeDynamic: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeTextDynamic: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  seeMoreBottomBtnDynamic: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
  },

  // ── Home Filter Modal Styles ─────────────────────────────────
  homeFilterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  homeFilterModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    overflow: 'hidden',
  },
  homeFilterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  homeFilterModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  homeFilterModalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  homeFilterModalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  homeFilterModalResetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  homeFilterModalResetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  homeFilterModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeFilterModalBody: {
    flex: 1,
    flexDirection: 'row',
  },
  homeFilterTabsSidebar: {
    width: 115,
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingTop: 8,
  },
  homeFilterTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  homeFilterTabItemActive: {
    backgroundColor: '#FFFFFF',
    borderRightWidth: 3,
    borderRightColor: '#3B82F6',
  },
  homeFilterTabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  homeFilterTabLabelActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  homeTabActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  homeFilterContentPane: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  homeFilterOptionsScroll: {
    padding: 14,
  },
  homeFilterSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  homeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  homeOptionRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  homeOptionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginRight: 8,
  },
  homeOptionLabelSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  homeRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeRadioCircleSelected: {
    borderColor: '#1D4ED8',
  },
  homeRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1D4ED8',
  },
  homeStrainOptionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  homeStrainColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  homeStrainMiniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  homeStrainMiniBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  homeBrandContentContainer: {
    flex: 1,
  },
  homeBrandSearchRow: {
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
  homeBrandSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
  },
  homeNoBrandsFound: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  homeNoBrandsText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  homeFilterModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  homeApplyFilterBtn: {
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
  homeApplyFilterBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
});

export default HomeScreen;
