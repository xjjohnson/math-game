import type { GameMessage } from '@/utils/multiplayer/protocol';

export interface Peer {
  id: string;
  name: string;
}

export interface TransportEvents {
  /** Another phone is hosting nearby (while finding). */
  peerFound: Peer;
  peerLost: { id: string };
  /** Connected; both phones show the same 4-digit code. A host gets one per guest. */
  connected: Peer & { code: string };
  disconnected: { id: string };
  message: { id: string; message: GameMessage };
  /** Something went wrong; the text is safe to show. */
  error: string;
}

/**
 * How phones talk: one host, any number of guests. Game screens only use this
 * interface, never a transport directly, so Nearby (Android), a mock (tests)
 * and later WebRTC (PC) are interchangeable.
 */
export interface Transport {
  host(name: string): Promise<void>;
  discover(): Promise<void>;
  connect(name: string, peerId: string): Promise<void>;
  /** To one peer, or to every connected peer when `to` is left out. */
  send(message: GameMessage, to?: string): Promise<void>;
  disconnect(): void;
  on<E extends keyof TransportEvents>(event: E, listener: (event: TransportEvents[E]) => void): () => void;
}

/** A tiny typed event hub the transports share. */
export class Emitter {
  // Typed at the edges (on/emit); stored loosely inside.
  private listeners = new Map<keyof TransportEvents, Set<(event: never) => void>>();

  on<E extends keyof TransportEvents>(event: E, listener: (event: TransportEvents[E]) => void): () => void {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(listener);
    return () => set.delete(listener);
  }

  emit<E extends keyof TransportEvents>(event: E, payload: TransportEvents[E]): void {
    this.listeners.get(event)?.forEach((listener) => (listener as (e: TransportEvents[E]) => void)(payload));
  }
}
