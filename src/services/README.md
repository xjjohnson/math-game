Multiplayer transports. Game logic talks only to the `Transport` interface in `multiplayer.ts`, never to a transport directly.

- `multiplayer.ts`: the `Transport` interface, `Peer`, and a small typed event emitter.
- `mockTransport.ts`: `createMockPair()`, two linked in-memory transports for tests.
- `nearbyTransport.ts`: Google Nearby Connections on Android (null on the web and in Expo Go).
- WebRTC for PC play is Phase 9.

Messages are defined in `src/utils/multiplayer/protocol.ts`; match rules (Race, Co-op) in `match.ts`, with the host acting as referee.
