import { requireOptionalNativeModule, type EventSubscription } from 'expo';
import { Platform } from 'react-native';

export interface NearbyEvents {
  /** Another phone running Math Game is hosting nearby. */
  onEndpointFound: (event: { endpointId: string; name: string }) => void;
  onEndpointLost: (event: { endpointId: string }) => void;
  /** A connection is starting; both phones show the same authDigits. */
  onConnectionRequest: (event: {
    endpointId: string;
    name: string;
    authDigits: string;
    incoming: boolean;
  }) => void;
  onConnected: (event: { endpointId: string }) => void;
  onConnectionFailed: (event: { endpointId: string; status: number }) => void;
  onDisconnected: (event: { endpointId: string }) => void;
  onMessage: (event: { endpointId: string; text: string }) => void;
}

interface NativeNearby {
  startHosting(name: string): Promise<void>;
  startFinding(): Promise<void>;
  connect(name: string, endpointId: string): Promise<void>;
  /** Sends to one phone, or to every connected phone when endpointId is null. */
  send(endpointId: string | null, text: string): Promise<void>;
  stop(): void;
  addListener<E extends keyof NearbyEvents>(event: E, listener: NearbyEvents[E]): EventSubscription;
}

/**
 * Google Nearby Connections, from the native module in this folder. It is
 * null on the web and in Expo Go, which don't include the module.
 */
export const Nearby: NativeNearby | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<NativeNearby>('MathNearby') : null;
