import React from 'react';
import {
  Layers,
  Droplets,
  Package,
  Zap,
  Flame,
} from 'lucide-react-native';
import CategoryCatalogScreen, { CatalogCategoryItem } from './CategoryCatalogScreen';

export const NICOTINE_CATEGORIES: CatalogCategoryItem[] = [
  {
    id: 'nicotine-closed-pods',
    name: 'Nicotine Closed Pods',
    backendName: 'Nicotine Closed Pods',
    icon: Layers,
  },
  {
    id: 'nicotine-e-juice',
    name: 'Nicotine E-juice',
    backendName: 'Nicotine E-Juice',
    icon: Droplets,
  },
  {
    id: 'nicotine-pouches-snus',
    name: 'Nicotine Pouches / Snus',
    backendName: 'NICOTINE POUCHES / SNUS',
    icon: Package,
  },
  {
    id: 'nicotine-vapes',
    name: 'Nicotine Vapes',
    backendName: 'Nicotine Vapes',
    icon: Zap,
  },
  {
    id: 'vapes-and-e-juices',
    name: 'Vapes and e-juices',
    backendName: 'vapes & e-juices',
    icon: Flame,
  },
  {
    id: 'vaping-accessories',
    name: 'Vaping accessories',
    backendName: 'vaping accessories',
    icon: Layers,
  },
];

const ALL_NICOTINE_QUERY =
  'Nicotine Closed Pods,Nicotine E-Juice,NICOTINE POUCHES / SNUS,Nicotine Vapes,vapes & e-juices,vaping accessories';

export default function NicotineScreen() {
  return (
    <CategoryCatalogScreen
      title="Nicotine"
      subtitle="Closed pods, e-juices, pouches & accessories"
      badgeText="Vapes & Nicotine Catalog"
      heroImage={require('../assets/Images/cannabis.png')}
      categories={NICOTINE_CATEGORIES}
      allCategoryBackendQuery={ALL_NICOTINE_QUERY}
      allCategoryLabel="All Nicotine"
      accentColor="#0284C7"
    />
  );
}

