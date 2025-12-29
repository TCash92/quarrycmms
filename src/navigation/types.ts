import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

/**
 * Root stack parameter list
 * This will expand as we add more screens
 */
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  // Auth screens will be added in PR #4
  // Login: undefined;
};

/**
 * Main tab navigator parameter list
 * Placeholder for future tab implementation
 */
export type MainTabParamList = {
  Home: undefined;
  // These will be added in later PRs:
  // Assets: undefined;
  // WorkOrders: undefined;
  // QuickLog: undefined;
};

/**
 * Type helper for root stack screens
 */
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/**
 * Type helper for main tab screens
 */
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

/**
 * Global declaration for useNavigation hook typing
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
