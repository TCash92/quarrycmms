/**
 * NetInfo mock for unit testing
 *
 * Provides controllable network connectivity state for sync tests.
 */

export type MockNetInfoState = {
  type:
    | 'wifi'
    | 'cellular'
    | 'none'
    | 'unknown'
    | 'bluetooth'
    | 'ethernet'
    | 'wimax'
    | 'vpn'
    | 'other';
  isConnected: boolean;
  isInternetReachable: boolean | null;
  details: {
    isConnectionExpensive?: boolean;
    cellularGeneration?: '2g' | '3g' | '4g' | '5g' | null;
    ssid?: string | null;
    strength?: number | null;
  } | null;
};

let currentNetworkState: MockNetInfoState = {
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: {
    isConnectionExpensive: false,
    ssid: 'TestWiFi',
    strength: 100,
  },
};

const listeners: Set<(state: MockNetInfoState) => void> = new Set();

/**
 * Set the mock network state (call in test setup)
 */
export function setMockNetworkState(state: Partial<MockNetInfoState>): void {
  currentNetworkState = { ...currentNetworkState, ...state };
  // Notify all listeners
  listeners.forEach(listener => listener(currentNetworkState));
}

/**
 * Simulate going offline
 */
export function goOffline(): void {
  setMockNetworkState({
    type: 'none',
    isConnected: false,
    isInternetReachable: false,
    details: null,
  });
}

/**
 * Simulate going online via WiFi
 */
export function goOnlineWifi(): void {
  setMockNetworkState({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      ssid: 'TestWiFi',
      strength: 100,
    },
  });
}

/**
 * Simulate going online via cellular
 */
export function goOnlineCellular(): void {
  setMockNetworkState({
    type: 'cellular',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: true,
      cellularGeneration: '4g',
    },
  });
}

/**
 * Simulate unstable connection (connected but not reachable)
 */
export function goUnstable(): void {
  setMockNetworkState({
    type: 'wifi',
    isConnected: true,
    isInternetReachable: false,
    details: {
      isConnectionExpensive: false,
      ssid: 'TestWiFi',
      strength: 20,
    },
  });
}

/**
 * Reset to default state (online via WiFi)
 */
export function resetNetworkState(): void {
  currentNetworkState = {
    type: 'wifi',
    isConnected: true,
    isInternetReachable: true,
    details: {
      isConnectionExpensive: false,
      ssid: 'TestWiFi',
      strength: 100,
    },
  };
  listeners.clear();
}

/**
 * Mock NetInfo module
 */
export const mockNetInfo = {
  fetch: jest.fn().mockImplementation(async () => currentNetworkState),
  addEventListener: jest.fn().mockImplementation((listener: (state: MockNetInfoState) => void) => {
    listeners.add(listener);
    // Return unsubscribe function
    return () => {
      listeners.delete(listener);
    };
  }),
  useNetInfo: jest.fn().mockReturnValue(currentNetworkState),
  NetInfoStateType: {
    unknown: 'unknown',
    none: 'none',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  },
  NetInfoCellularGeneration: {
    '2g': '2g',
    '3g': '3g',
    '4g': '4g',
    '5g': '5g',
  },
};
