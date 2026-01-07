import WorkOrder from './WorkOrder';
import Asset from './Asset';
import MeterReading from './MeterReading';
import WorkOrderPhoto from './WorkOrderPhoto';

export { WorkOrder, Asset, MeterReading, WorkOrderPhoto };

// Model classes array for WatermelonDB adapter
export const modelClasses = [WorkOrder, Asset, MeterReading, WorkOrderPhoto];

// Re-export types
export type { WorkOrderPriority, WorkOrderStatus, FailureType, LocalSyncStatus } from './WorkOrder';
export type { AssetStatus } from './Asset';
