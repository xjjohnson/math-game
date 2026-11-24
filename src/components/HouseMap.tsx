import { useEffect, useRef, useState, type Ref } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type HostInstance, type ScrollViewInstance } from 'react-native';

import { Text } from '@/components/AppText';
import { findRoomItem, FLOOR_COLORS, MAX_ROOMS, ROOM_KINDS, ROOM_NAME_MAX, type RoomKind, WALL_COLORS } from '@/constants/room';
import { colors, radius, spacing } from '@/constants/theme';
import type { AreaPaint, HouseRoom, Room } from '@/types';
import { areaAt, defaultRoomName, roomEmoji, roomName, roomsOfKind } from '@/utils/room';

/** Rooms on each floor of the House map. */
export const ROOMS_PER_FLOOR = 4;

/** What a room on the map shows: a few of its things and the faces of the buddies in it. */
export interface RoomPeek {
  things: string[];
  faces: string[];
}

/** A few emoji for each room: up to 6 things standing in it, and the buddies there. */
export function peekRooms(house: HouseRoom[], room: Room, buddies: { id: string; emoji: string; spot: { x: number } }[]): RoomPeek[] {
  const peeks: RoomPeek[] = house.map(() => ({ things: [], faces: [] }));
  const count = house.length;
  for (const t of room.things) {
    if (!t.placed || t.in) continue;
    const peek = peeks[areaAt(t.x, count)];
    const emoji = findRoomItem(t.itemId)?.emoji;
    if (peek && emoji && !emoji.startsWith('@') && peek.things.length < 6) peek.things.push(emoji);
  }
  for (const b of buddies) {
    const peek = peeks[areaAt(b.spot.x, count)];
    if (peek && !b.emoji.startsWith('@') && peek.faces.length < 4) peek.faces.push(b.emoji);
    else if (peek && peek.faces.length < 4) peek.faces.push('🙂');
  }
  return peeks;
}

interface Props {
  house: HouseRoom[];
  paint: AreaPaint[];
  peeks: RoomPeek[];
  /** The room in view, highlighted. */
  current: number;
  onPick: (slot: number) => void;
  onClose: () => void;
  /** Sending a thing or buddy to a room: its name. Then tapping a room only picks it. */
  sending?: string;
  /** The player's own home: rooms can be built, moved, renamed and taken away. */
  edit?: {
    coins: number;
    price: number;
    canRemove: (slot: number) => boolean;
    onBuild: (kind: RoomKind, name: string) => 'ok' | 'coins' | 'once' | 'full' | 'unknown';
    onMove: (from: number, to: number) => void;
    onRename: (slot: number, name: string) => void;
    onRemove: (slot: number) => void;
  };
}

/**
 * The whole home as a dollhouse cut open: floors of four rooms, the first floor at the
 * bottom, under a roof. Tap a room to go there. In your own home, hold a room to move,
 * rename or take it away, and tap + to build another.
 */
export function HouseMap({ house, paint, peeks, current, onPick, onClose, sending, edit }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [building, setBuilding] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const slots = house.length + (edit && !sending && house.length < MAX_ROOMS ? 1 : 0);
  const floors: number[][] = [];
  for (let i = 0; i < slots; i += ROOMS_PER_FLOOR) floors.push(Array.from({ length: Math.min(ROOMS_PER_FLOOR, slots - i) }, (_, k) => i + k));
  // The first floor is at the bottom, like a real house.
  floors.reverse();

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 0);
    return () => clearTimeout(t);
  }, []);

  const tapRoom = (slot: number) => {
    if (sending || !edit) return onPick(slot);
    if (picked === null) return onPick(slot);
    if (picked === slot) return setPicked(null);
    // A room is picked up: tapping another room's spot moves it there.
    edit.onMove(picked, slot);
    setPicked(null);
  };

  const title = sending ? `Where should the ${sending} go?` : building ? 'Build a new room' : picked !== null ? `Tap where the ${roomName(house[picked])} should go` : 'Tap a room to go there';

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the house map" style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <Text style={styles.closeText}>✖️</Text>
          </Pressable>
        </View>
        {edit && !sending && picked === null && !building ? <Text style={styles.hint}>Hold a room to move, rename or take it away.</Text> : null}

        {building && edit ? (
          <BuildPanel house={house} edit={edit} onDone={(slot) => {
            setBuilding(false);
            if (slot !== null) onPick(slot);
          }} />
        ) : (
          <ScrollView ref={scroll} style={styles.houseScroll} contentContainerStyle={styles.house}>
            <View style={styles.roof}>
              <View style={styles.roofShape} />
              <View style={styles.chimney} />
            </View>
            <View style={styles.walls}>
              {floors.map((row) => (
                <View key={row[0]} style={styles.floor}>
                  {row.map((slot) =>
                    slot >= house.length ? (
                      <Pressable
                        key="build"
                        onPress={() => setBuilding(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Build a new room for ${edit?.price ?? 0} coins`}
                        style={({ pressed }) => [styles.tile, styles.build, pressed && styles.pressed]}
                      >
                        <Text style={styles.plus}>➕</Text>
                        <Text style={styles.buildText}>Build a room</Text>
                        <Text style={styles.buildPrice}>🪙 {edit?.price ?? 0}</Text>
                      </Pressable>
                    ) : (
                      <RoomTile
                        key={house[slot].id}
                        room={house[slot]}
                        paint={paint[slot]}
                        peek={peeks[slot]}
                        here={slot === current}
                        picked={slot === picked}
                        onPress={() => tapRoom(slot)}
                        onLongPress={edit && !sending ? () => setPicked(slot) : undefined}
                      />
                    ),
                  )}
                  {Array.from({ length: ROOMS_PER_FLOOR - row.length }, (_, k) => (
                    <View key={`yard-${k}`} style={[styles.tile, styles.empty]} />
                  ))}
                </View>
              ))}
            </View>
            <View style={styles.ground} />
          </ScrollView>
        )}

        {edit && picked !== null && !building ? (
          <RoomTools
            key={house[picked]?.id}
            room={house[picked]}
            slot={picked}
            last={house.length - 1}
            canRemove={edit.canRemove(picked)}
            onMove={(to) => {
              edit.onMove(picked, to);
              setPicked(to);
            }}
            onRename={(name) => edit.onRename(picked, name)}
            onRemove={() => {
              edit.onRemove(picked);
              setPicked(null);
            }}
            onDone={() => setPicked(null)}
          />
        ) : null}
      </View>
    </View>
  );
}

interface TileProps {
  room: HouseRoom;
  paint: AreaPaint | undefined;
  peek: RoomPeek | undefined;
  here: boolean;
  picked: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

function RoomTile({ room, paint, peek, here, picked, onPress, onLongPress }: TileProps) {
  const wall = WALL_COLORS[paint?.wall ?? 0] ?? WALL_COLORS[0];
  const floor = FLOOR_COLORS[paint?.floor ?? 0] ?? FLOOR_COLORS[0];
  const outside = room.look === 'backyard';
  const name = roomName(room);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`${name}${here ? ', you are here' : ''}`}
      accessibilityState={{ selected: here }}
      style={({ pressed }) => [styles.tile, here && styles.here, picked && styles.picked, pressed && styles.pressed]}
    >
      <View style={[styles.tileWall, { backgroundColor: outside ? '#BFE6FF' : wall }]}>
        <Text style={styles.tileEmoji}>{roomEmoji(room)}</Text>
        <Text style={styles.tileThings} numberOfLines={1}>
          {peek?.things.join('') ?? ''}
        </Text>
      </View>
      <View style={[styles.tileFloor, { backgroundColor: floor }]}>
        <Text style={styles.tileFaces} numberOfLines={1}>
          {peek?.faces.join('') ?? ''}
        </Text>
      </View>
      <Text style={styles.tileName} numberOfLines={1}>
        {here ? '📍 ' : ''}
        {name}
      </Text>
    </Pressable>
  );
}

interface ToolsProps {
  room: HouseRoom;
  slot: number;
  last: number;
  canRemove: boolean;
  onMove: (to: number) => void;
  onRename: (name: string) => void;
  onRemove: () => void;
  onDone: () => void;
}

/** What can be done to the room that is held: move it along, rename it, or (a built room) take it away. */
function RoomTools({ room, slot, last, canRemove, onMove, onRename, onRemove, onDone }: ToolsProps) {
  const [name, setName] = useState(roomName(room));
  const [sure, setSure] = useState(false);
  return (
    <View style={styles.tools}>
      <View style={styles.toolRow}>
        <Chip label="⬅️ Left" disabled={slot === 0} onPress={() => onMove(slot - 1)} />
        <Chip label="Right ➡️" disabled={slot === last} onPress={() => onMove(slot + 1)} />
        <Chip label="✅ Done" onPress={onDone} />
      </View>
      <View style={styles.toolRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          onEndEditing={() => onRename(name)}
          onSubmitEditing={() => onRename(name)}
          maxLength={ROOM_NAME_MAX}
          accessibilityLabel="Room name"
          style={styles.input}
          returnKeyType="done"
        />
        <Chip label="✏️ Name it" onPress={() => onRename(name)} />
      </View>
      {canRemove ? (
        <View style={styles.toolRow}>
          <Chip
            label={sure ? '🗑️ Tap again: take it away' : '🗑️ Take this room away'}
            danger
            onPress={() => {
              if (sure) onRemove();
              else setSure(true);
            }}
          />
        </View>
      ) : null}
      {canRemove && sure ? <Text style={styles.hint}>Everything in it goes to the toy box. Coins don't come back.</Text> : null}
    </View>
  );
}

interface BuildProps {
  house: HouseRoom[];
  edit: NonNullable<Props['edit']>;
  /** Built (the new room's slot) or backed out (null). */
  onDone: (slot: number | null) => void;
}

/** Pick a kind of room, name it, and buy it (the button asks twice). */
function BuildPanel({ house, edit, onDone }: BuildProps) {
  const [kind, setKind] = useState<RoomKind | null>(null);
  const [name, setName] = useState('');
  const [sure, setSure] = useState(false);
  const [note, setNote] = useState('');
  const short = Math.max(0, edit.price - edit.coins);
  const full = house.length >= MAX_ROOMS;
  return (
    <ScrollView style={styles.houseScroll} contentContainerStyle={styles.buildPanel}>
      <Text style={styles.buildHead}>{`A new room costs 🪙 ${edit.price}.`}</Text>
      {short > 0 ? <Text style={styles.hint}>{`You need ${short} more coins. Play a round to earn them!`}</Text> : null}
      {full ? <Text style={styles.hint}>The house is as big as it can get!</Text> : null}
      <View style={styles.kinds}>
        {ROOM_KINDS.map((k) => {
          const taken = !!k.once && roomsOfKind(house, k.id).length > 0;
          return (
            <Pressable
              key={k.id}
              disabled={taken}
              onPress={() => {
                setKind(k.id);
                setName(defaultRoomName(house, k.id));
                setSure(false);
                setNote('');
              }}
              accessibilityRole="button"
              accessibilityLabel={taken ? `${k.name}: you have one already` : k.name}
              accessibilityState={{ selected: kind === k.id, disabled: taken }}
              style={({ pressed }) => [styles.kind, kind === k.id && styles.kindOn, taken && styles.kindTaken, pressed && styles.pressed]}
            >
              <Text style={styles.kindEmoji}>{k.emoji}</Text>
              <Text style={styles.kindName} numberOfLines={1}>
                {k.name}
              </Text>
              {taken ? <Text style={styles.kindNote}>Have one</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {kind ? (
        <>
          <Text style={styles.label}>Name your room</Text>
          <TextInput value={name} onChangeText={setName} maxLength={ROOM_NAME_MAX} accessibilityLabel="Name of the new room" style={styles.input} returnKeyType="done" />
        </>
      ) : null}
      {note ? <Text style={styles.hint}>{note}</Text> : null}
      <View style={styles.toolRow}>
        <Chip label="⬅️ Back" onPress={() => onDone(null)} />
        <Chip
          label={!kind ? 'Pick a room' : sure ? 'Tap again to build' : `Build it for 🪙 ${edit.price}`}
          disabled={!kind || short > 0 || full}
          go
          onPress={() => {
            if (!kind) return;
            if (!sure) return setSure(true);
            const r = edit.onBuild(kind, name);
            if (r === 'ok') return onDone(house.length);
            setSure(false);
            setNote(r === 'coins' ? 'Not enough coins yet.' : r === 'once' ? 'You already have one of those.' : 'That room can’t be built right now.');
          }}
        />
      </View>
    </ScrollView>
  );
}

interface PillProps {
  room: HouseRoom | undefined;
  slot: number;
  count: number;
  onGo: (slot: number) => void;
  onOpen: () => void;
  /** The pill's button, measured as a drop spot for sending things to another room. */
  pillRef?: Ref<HostInstance>;
  onPillLayout?: () => void;
}

/** The room you're in, with arrows to the rooms beside it; tap the name for the House map. */
export function RoomPill({ room, slot, count, onGo, onOpen, pillRef, onPillLayout }: PillProps) {
  const name = room ? roomName(room) : 'Room';
  return (
    <View style={styles.pill}>
      <Pressable
        onPress={() => onGo(slot - 1)}
        disabled={slot <= 0}
        accessibilityRole="button"
        accessibilityLabel="Room to the left"
        style={({ pressed }) => [styles.arrow, slot <= 0 && styles.arrowOff, pressed && styles.pressed]}
      >
        <Text style={styles.arrowText}>◀</Text>
      </Pressable>
      <Pressable
        ref={pillRef}
        onLayout={onPillLayout}
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${name}, room ${slot + 1} of ${count}. Open the house map`}
        style={({ pressed }) => [styles.pillName, pressed && styles.pressed]}
      >
        <Text style={styles.pillText} numberOfLines={1}>
          {`${room ? roomEmoji(room) : '🏠'} ${name}`}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onGo(slot + 1)}
        disabled={slot >= count - 1}
        accessibilityRole="button"
        accessibilityLabel="Room to the right"
        style={({ pressed }) => [styles.arrow, slot >= count - 1 && styles.arrowOff, pressed && styles.pressed]}
      >
        <Text style={styles.arrowText}>▶</Text>
      </Pressable>
    </View>
  );
}

function Chip({ label, onPress, disabled, danger, go }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean; go?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.chip, go && styles.chipGo, danger && styles.chipDanger, disabled && styles.chipOff, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, (go || danger) && !disabled && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const ROOF = '#B5523B';

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 },
  arrow: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 2, borderColor: colors.border },
  arrowOff: { opacity: 0.35 },
  arrowText: { fontSize: 18, color: colors.text },
  pillName: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingHorizontal: 10, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.95)', borderWidth: 2, borderColor: colors.border, flexShrink: 1, minWidth: 0 },
  pillText: { fontSize: 16, fontWeight: '900', color: colors.text, flexShrink: 1 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20, 22, 50, 0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.sm, zIndex: 50 },
  sheet: { width: '100%', maxWidth: 720, maxHeight: '96%', backgroundColor: colors.background, borderRadius: radius.lg, borderWidth: 3, borderColor: colors.border, padding: spacing.sm, gap: spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 20, fontWeight: '900', color: colors.text },
  close: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  closeText: { fontSize: 20 },
  hint: { fontSize: 15, color: colors.textMuted, fontWeight: '700' },
  houseScroll: { flexGrow: 0 },
  house: { alignItems: 'stretch', paddingBottom: spacing.xs },
  roof: { height: 54, alignItems: 'center', justifyContent: 'flex-end' },
  roofShape: { alignSelf: 'stretch', marginHorizontal: 10, height: 40, backgroundColor: ROOF, borderTopLeftRadius: 60, borderTopRightRadius: 60, borderWidth: 3, borderColor: '#7A2F20' },
  chimney: { position: 'absolute', right: '22%', top: 2, width: 22, height: 34, backgroundColor: '#8D3F2D', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  walls: { backgroundColor: '#E9D3B4', borderWidth: 3, borderColor: '#7A5236', padding: 4, gap: 4 },
  floor: { flexDirection: 'row', gap: 4 },
  ground: { height: 12, backgroundColor: '#7CB86A', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  tile: { flex: 1, minHeight: 96, borderRadius: 6, borderWidth: 2, borderColor: '#7A5236', overflow: 'hidden', backgroundColor: colors.surface },
  empty: { backgroundColor: 'transparent', borderColor: 'transparent' },
  here: { borderColor: colors.primary, borderWidth: 4 },
  picked: { borderColor: colors.accentStrong, borderWidth: 4, transform: [{ scale: 1.05 }] },
  tileWall: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  tileFloor: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tileEmoji: { fontSize: 22 },
  tileThings: { fontSize: 12 },
  tileFaces: { fontSize: 14 },
  tileName: { fontSize: 13, fontWeight: '800', color: colors.text, textAlign: 'center', paddingHorizontal: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
  build: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', backgroundColor: '#FFF3D6', gap: 2 },
  plus: { fontSize: 24 },
  buildText: { fontSize: 13, fontWeight: '900', color: colors.text, textAlign: 'center' },
  buildPrice: { fontSize: 13, fontWeight: '800', color: colors.accentStrong },
  tools: { gap: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 2, borderTopColor: colors.border },
  toolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, alignItems: 'center' },
  input: { flexGrow: 1, minWidth: 160, minHeight: 48, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.sm, fontSize: 18, color: colors.text },
  chip: { minHeight: 48, paddingHorizontal: 14, borderRadius: 24, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipGo: { backgroundColor: colors.correct, borderColor: colors.correct },
  chipDanger: { backgroundColor: colors.wrong, borderColor: colors.wrong },
  chipOff: { backgroundColor: colors.disabled, borderColor: colors.disabled, borderStyle: 'dashed' },
  chipText: { fontSize: 16, fontWeight: '800', color: colors.text },
  chipTextOn: { color: '#FFFFFF' },
  pressed: { opacity: 0.75 },
  buildPanel: { gap: spacing.sm, paddingBottom: spacing.sm },
  buildHead: { fontSize: 18, fontWeight: '900', color: colors.text },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  kind: { width: 104, minHeight: 84, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 4 },
  kindOn: { borderColor: colors.primary, borderWidth: 4, backgroundColor: '#E8ECFF' },
  kindTaken: { opacity: 0.5, borderStyle: 'dashed' },
  kindEmoji: { fontSize: 28 },
  kindName: { fontSize: 14, fontWeight: '800', color: colors.text },
  kindNote: { fontSize: 12, color: colors.textMuted },
  label: { fontSize: 16, fontWeight: '800', color: colors.text },
});
