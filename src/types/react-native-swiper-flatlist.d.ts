import React from 'react';
import { FlatListProps, ViewStyle, StyleProp } from 'react-native';

declare module 'react-native-swiper-flatlist' {
  export interface SwiperFlatListRefProps {
    getCurrentIndex: () => number;
    getPrevIndex: () => number;
    scrollToIndex: (item: { index: number; animated?: boolean }) => void;
    goToLastIndex: () => void;
    goToFirstIndex: () => void;
  }

  export interface SwiperFlatListProps<T = any> extends Partial<FlatListProps<T>> {
    autoplay?: boolean;
    autoplayDelay?: number;
    autoplayLoop?: boolean;
    autoplayLoopKeepAnimation?: boolean;
    autoplayInvertDirection?: boolean;
    showPagination?: boolean;
    index?: number;
    renderAll?: boolean;
    disableGesture?: boolean;
    paginationActiveColor?: string;
    paginationDefaultColor?: string;
    paginationStyle?: StyleProp<ViewStyle>;
    paginationStyleItem?: StyleProp<ViewStyle>;
    paginationStyleItemActive?: StyleProp<ViewStyle>;
    paginationStyleItemInactive?: StyleProp<ViewStyle>;
    onChangeIndex?: (item: { index: number; prevIndex: number }) => void;
    children?: React.ReactNode;
  }

  export const SwiperFlatList: React.ForwardRefExoticComponent<
    SwiperFlatListProps<any> & React.RefAttributes<SwiperFlatListRefProps>
  >;

  export default SwiperFlatList;
}

