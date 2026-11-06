import React from 'react';
import {
  Leaf,
  Zap,
  Cookie,
  Droplets,
  Flame,
  Sparkles,
  Package,
} from 'lucide-react-native';
import CategoryCatalogScreen, { CatalogCategoryItem } from './CategoryCatalogScreen';

export const CANNABIS_CATEGORIES: CatalogCategoryItem[] = [
  {
    id: 'cannabis-plant-seeds',
    name: 'CANNABIS PLANT SEEDS',
    backendName: 'CANNABIS PLANT SEEDS',
    icon: Leaf,
  },
  {
    id: 'cartridge-510',
    name: 'CARTRIDGE 510',
    backendName: 'CARTRIDGE 510',
    icon: Zap,
  },
  {
    id: 'disposable-vapes',
    name: 'Disposable Vapes',
    backendName: 'Disposable Vapes',
    icon: Zap,
  },
  {
    id: 'dried-flower',
    name: 'Dried Flower',
    backendName: 'Dried Flower',
    icon: Leaf,
  },
  {
    id: 'edibles-beverages-dried',
    name: 'Edibles-Beverages Dried',
    backendName: 'Edibles-Beverages Dried',
    icon: Cookie,
  },
  {
    id: 'edibles-beverages-liquid',
    name: 'Edibles-Beverages Liquid',
    backendName: 'Edibles-Beverages Liquid',
    icon: Droplets,
  },
  {
    id: 'edibles-candy-chocolate-confections',
    name: 'Edibles-Candy/Chocolate/Confections',
    backendName: 'Edibles-Candy/Chocolate/Confec',
    icon: Cookie,
  },
  {
    id: 'extracts-ingested',
    name: 'Extracts Ingested',
    backendName: 'Extracts Ingested',
    icon: Droplets,
  },
  {
    id: 'extracts-inhaled',
    name: 'Extracts Inhaled',
    backendName: 'Extracts Inhaled',
    icon: Flame,
  },
  {
    id: 'fortified-pre-rolled',
    name: 'FORTIFIED PRE-ROLLED',
    backendName: 'FORTIFIED PRE-ROLLED',
    icon: Flame,
  },
  {
    id: 'kief',
    name: 'KIEF',
    backendName: 'KIEF',
    icon: Sparkles,
  },
  {
    id: 'milled-blended',
    name: 'MILLED/BLENDED',
    backendName: 'MILLED/BLENDED',
    icon: Leaf,
  },
  {
    id: 'none',
    name: 'NONE',
    backendName: 'Accessories,NONE',
    icon: Package,
  },
  {
    id: 'pre-rolled',
    name: 'PRE-ROLLED',
    backendName: 'PRE-ROLLED',
    icon: Flame,
  },
  {
    id: 'thc-pouches',
    name: 'THC POUCHES',
    backendName: 'THC POUCHES',
    icon: Package,
  },
  {
    id: 'topical-products',
    name: 'Topical Products',
    backendName: 'Topical Products',
    icon: Sparkles,
  },
  {
    id: 'vape',
    name: 'Vape',
    backendName: 'Vape',
    icon: Zap,
  },
];

const ALL_CANNABIS_QUERY =
  'CANNABIS PLANT SEEDS,CARTRIDGE 510,Disposable Vapes,Dried Flower,Edibles-Beverages Dried,Edibles-Beverages Liquid,Edibles-Candy/Chocolate/Confec,Extracts Ingested,Extracts Inhaled,FORTIFIED PRE-ROLLED,KIEF,MILLED/BLENDED,NONE,Accessories,PRE-ROLLED,THC POUCHES,Topical Products,Vape';

export default function CannabisScreen() {
  return (
    <CategoryCatalogScreen
      title="Cannabis"
      subtitle="Flower, pre-rolls, edibles, vapes & extracts"
      badgeText="Pure Manitoba Cannabis"
      heroImage={require('../assets/Images/Nicotine.png')}
      categories={CANNABIS_CATEGORIES}
      allCategoryBackendQuery={ALL_CANNABIS_QUERY}
      allCategoryLabel="All Cannabis"
      accentColor="#0166dc"
      showCannabisLimitBar={true}
    />
  );
}

