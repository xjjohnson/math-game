import { Emitter, type Transport } from '@/services/multiplayer';
import { encodeMessage, parseMessage, type GameMessage } from '@/utils/multiplayer/protocol';

/**
 * Two in-memory transports wired to each other, for tests and for trying the
 * game logic without phones. Messages go through the same encode/parse step as
 * real ones and are delivered synchronously.
 */
export function createMockPair(): [Transport, Transport] {
  const a = new MockTransport('phone-a');
  const b = new MockTransport('phone-b');
  a.other = b;
  b.other = a;
  return [a, b];
}

class MockTransport extends Emitter implements Transport {
  other!: MockTransport;
  hostingAs: string | null = null;
  private linked = false;

  constructor(readonly id: string) {
    super();
  }

  async host(name: string) {
    this.hostingAs = name;
  }

  async discover() {
    if (this.other.hostingAs) this.emit('peerFound', { id: this.other.id, name: this.other.hostingAs });
  }

  async connect(name: string, peerId: string) {
    if (peerId !== this.other.id || !this.other.hostingAs) throw new Error('Nobody is hosting');
    this.linked = this.other.linked = true;
    this.emit('connected', { id: this.other.id, name: this.other.hostingAs, code: '1234' });
    this.other.emit('connected', { id: this.id, name, code: '1234' });
  }

  async send(message: GameMessage) {
    if (!this.linked) throw new Error('No phone is connected yet');
    const parsed = parseMessage(encodeMessage(message));
    if (parsed) this.other.emit('message', { id: this.id, message: parsed });
  }

  disconnect() {
    this.hostingAs = null;
    if (!this.linked) return;
    this.linked = this.other.linked = false;
    this.other.emit('disconnected', { id: this.id });
  }
}
