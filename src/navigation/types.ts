import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

/**
 * Root stack parameter list
 * This will expand as we add more screens
 */
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
};

/**
 * Main tab navigator parameter list
 */
export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Assets: NavigatorScreenParams<AssetsStackParamList>;
  WorkOrders: NavigatorScreenParams<WorkOrdersStackParamList>;
  QuickLog: undefined;
};

/**
 * Home stack navigator parameter list
 */
export type HomeStackParamList = {
  HomeMain: undefined;
  SyncDetails: undefined;
  ComplianceReport: undefined;
  Settings: undefined;
  DatabaseReset: undefined;
  DeviceMigration: { mode: 'send' | 'receive' };
  Help: undefined;
};

/**
 * Assets stack navigator parameter list
 */
export type AssetsStackParamList = {
  AssetList: undefined;
  AssetDetail: { assetId: string };
};

/**
 * Work orders stack navigator parameter list
 */
export type WorkOrdersStackParamList = {
  WorkOrderList: undefined;
  CreateWorkOrder: { assetId?: string };
  WorkOrderDetail: { workOrderId: string };
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
 * Type helper for home stack screens
 */
export type HomeStackScreenProps<T extends keyof HomeStackParamList> = NativeStackScreenProps<
  HomeStackParamList,
  T
>;

/**
 * Type helper for assets stack screens
 */
export type AssetsStackScreenProps<T extends keyof AssetsStackParamList> = NativeStackScreenProps<
  AssetsStackParamList,
  T
>;

/**
 * Type helper for work orders stack screens
 */
export type WorkOrdersStackScreenProps<T extends keyof WorkOrdersStackParamList> =
  NativeStackScreenProps<WorkOrdersStackParamList, T>;

/**
 * Global declaration for useNavigation hook typing
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
