import { Emitter, type Transport } from '@/services/multiplayer';
import { encodeMessage, parseMessage, type GameMessage } from '@/utils/multiplayer/protocol';
import { Nearby } from '../../modules/math-nearby';

/**
 * Transport over Google Nearby Connections (Android only). Null on the web and
 * in Expo Go, where the native module isn't there.
 */
export function createNearbyTransport(): Transport | null {
  return Nearby ? new NearbyTransport() : null;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

class NearbyTransport extends Emitter implements Transport {
  private readonly names = new Map<string, string>();
  private readonly codes = new Map<string, string>();
  private readonly subs = [
    Nearby!.addListener('onEndpointFound', ({ endpointId, name }) => {
      this.names.set(endpointId, name);
      this.emit('peerFound', { id: endpointId, name });
    }),
    Nearby!.addListener('onEndpointLost', ({ endpointId }) => this.emit('peerLost', { id: endpointId })),
    Nearby!.addListener('onConnectionRequest', ({ endpointId, name, authDigits }) => {
      this.names.set(endpointId, name);
      this.codes.set(endpointId, authDigits);
    }),
    Nearby!.addListener('onConnected', ({ endpointId }) => {
      this.emit('connected', {
        id: endpointId,
        name: this.names.get(endpointId) ?? 'Friend',
        code: this.codes.get(endpointId) ?? '',
      });
    }),
    Nearby!.addListener('onConnectionFailed', () => this.emit('error', "Couldn't connect. Try again.")),
    Nearby!.addListener('onDisconnected', ({ endpointId }) => this.emit('disconnected', { id: endpointId })),
    Nearby!.addListener('onMessage', ({ endpointId, text }) => {
      const parsed = parseMessage(text);
      if (parsed) this.emit('message', { id: endpointId, message: parsed });
    }),
  ];

  async host(name: string) {
    Nearby!.stop();
    await Nearby!.startHosting(name).catch((e) => this.fail(e));
  }

  async discover() {
    Nearby!.stop();
    await Nearby!.startFinding().catch((e) => this.fail(e));
  }

  async connect(name: string, peerId: string) {
    await Nearby!.connect(name, peerId).catch((e) => this.fail(e));
  }

  async send(msg: GameMessage, to?: string) {
    await Nearby!.send(to ?? null, encodeMessage(msg)).catch((e) => this.fail(e));
  }

  disconnect() {
    Nearby!.stop();
    this.subs.forEach((s) => s.remove());
  }

  private fail(e: unknown): never {
    const text = message(e);
    this.emit('error', text);
    throw new Error(text);
  }
}
