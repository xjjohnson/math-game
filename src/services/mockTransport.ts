import { Emitter, type Transport } from '@/services/multiplayer';
import { encodeMessage, parseMessage, type GameMessage } from '@/utils/multiplayer/protocol';

/**
 * In-memory phones on one pretend network, for tests and for trying the game
 * logic without phones. Like Nearby's star, guests link to one host. Messages
 * go through the same encode/parse step as real ones and arrive synchronously.
 */
export function createMockNetwork(count: number): Transport[] {
  const net: MockTransport[] = [];
  for (let i = 0; i < count; i++) net.push(new MockTransport(`phone-${i}`, net));
  return net;
}

export function createMockPair(): [Transport, Transport] {
  const [a, b] = createMockNetwork(2);
  return [a, b];
}

class MockTransport extends Emitter implements Transport {
  hostingAs: string | null = null;
  readonly links = new Set<MockTransport>();

  constructor(
    readonly id: string,
    private readonly net: MockTransport[],
  ) {
    super();
  }

  async host(name: string) {
    this.hostingAs = name;
  }

  async discover() {
    for (const phone of this.net) {
      if (phone !== this && phone.hostingAs) this.emit('peerFound', { id: phone.id, name: phone.hostingAs });
    }
  }

  async connect(name: string, peerId: string) {
    const host = this.net.find((p) => p.id === peerId);
    if (!host?.hostingAs) throw new Error('Nobody is hosting');
    this.links.add(host);
    host.links.add(this);
    this.emit('connected', { id: host.id, name: host.hostingAs, code: '1234' });
    host.emit('connected', { id: this.id, name, code: '1234' });
  }

  async send(message: GameMessage, to?: string) {
    const targets = [...this.links].filter((p) => to === undefined || p.id === to);
    if (!targets.length) throw new Error('No phone is connected yet');
    const parsed = parseMessage(encodeMessage(message));
    if (parsed) targets.forEach((p) => p.emit('message', { id: this.id, message: parsed }));
  }

  disconnect() {
    this.hostingAs = null;
    for (const p of this.links) {
      p.links.delete(this);
      p.emit('disconnected', { id: this.id });
    }
    this.links.clear();
  }
}
