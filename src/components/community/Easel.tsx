import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';

import { Text } from '@/components/AppText';
import { PaintingView } from '@/components/PaintingView';
import { PICTURE_KEY } from '@/constants/room';
import { easelBoard, useEaselPicture } from '@/services/easel';
import { townSession } from '@/services/townSession';
import { usePaintings, usePictures, type SavedPicture } from '@/store/paintings';
import { useActiveProfile, useProfiles } from '@/store/profiles';
import {
  BLANK_PAGE,
  BRUSH_SIZES,
  COLORING_PAGES,
  lastMine,
  levelForGrade,
  MAX_PAINT_POINTS,
  MY_PAINT_PREFIX,
  newPaintId,
  NUMBER_LEVELS,
  numberCheck,
  PAINT_COLORS,
  PAINT_NAMES,
  pageOf,
  PAPER_H,
  PAPER_W,
  regionAt,
  WHITE,
  type BrushAction,
  type ColoringPage,
  type NumberLevel,
} from '@/utils/easel';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Tool = 'brush' | 'fill' | 'eraser';
type Panel = 'pages' | 'pictures' | null;

/** A new point is added once the finger has moved this far (in paper units). */
const STEP = 5;
/** How often a growing line is sent to friends. */
const SEND_MS = 70;

interface Finger {
  stroke: BrushAction;
  sentAt: number;
}

/**
 * The School easel, opened full screen: paint on blank paper or a coloring
 * page with brushes and a paint bucket, color by number, save pictures and
 * hang them in the buddies' home. On a visit, friends paint the same paper.
 */
export function Easel({ visible, onClose }: Props) {
  const picture = useEaselPicture();
  const profile = useActiveProfile();
  const pictures = usePictures(profile?.id);
  const savePicture = usePaintings((s) => s.save);
  const removeSaved = usePaintings((s) => s.remove);
  const hangPicture = useProfiles((s) => s.hangPicture);
  const takeDown = useProfiles((s) => s.removePicture);
  const { width, height } = useWindowDimensions();
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState(1);
  const [size, setSize] = useState(1);
  const [panel, setPanel] = useState<Panel>(null);
  const [note, setNote] = useState<string | null>(null);
  const [flash, setFlash] = useState<Set<number> | null>(null);
  /** The saved picture this one was opened from, so Save keeps it in the same place. */
  const [openedId, setOpenedId] = useState<string | null>(null);
  const fingers = useRef(new Map<number, Finger>());
  const origin = useRef({ x: 0, y: 0 });
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const page = pageOf(picture.page);
  const numbers = picture.lv !== null;
  const hung = new Set((profile?.room.things ?? []).filter((t) => t.placed && t.key.startsWith(PICTURE_KEY)).map((t) => t.key.slice(PICTURE_KEY.length)));

  // A fresh sheet (from anyone on the visit) is a new picture.
  useEffect(() => {
    if (picture.actions.length === 0) setOpenedId(null);
  }, [picture.actions.length]);
  useEffect(() => () => {
    if (noteTimer.current) clearTimeout(noteTimer.current);
  }, []);

  const say = (text: string, ms = 2600) => {
    setNote(text);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), ms);
  };

  // The paper takes what is left once the tools have their room.
  const [room, setRoom] = useState({ w: width, h: height * 0.6 });
  const paperW = Math.max(120, Math.min(room.w - 24, ((room.h - 16) * PAPER_W) / PAPER_H));
  const paperH = (paperW * PAPER_H) / PAPER_W;

  const toPaper = (pageX: number, pageY: number) => ({
    x: Math.round(Math.min(PAPER_W, Math.max(0, ((pageX - origin.current.x) / paperW) * PAPER_W))),
    y: Math.round(Math.min(PAPER_H, Math.max(0, ((pageY - origin.current.y) / paperH) * PAPER_H))),
  });
  const onPaper = (pageX: number, pageY: number) => {
    const dx = pageX - origin.current.x;
    const dy = pageY - origin.current.y;
    return dx >= 0 && dx <= paperW && dy >= 0 && dy <= paperH;
  };

  const share = (f: Finger, force = false) => {
    const now = Date.now();
    if (!force && now - f.sentAt < SEND_MS) {
      // Show it here straight away; friends get it with the next send.
      easelBoard().put([f.stroke]);
      return;
    }
    f.sentAt = now;
    townSession().paint([f.stroke]);
  };

  const begin = (id: number, pageX: number, pageY: number) => {
    if (fingers.current.has(id) || !onPaper(pageX, pageY)) return;
    const at = toPaper(pageX, pageY);
    if (tool === 'fill') {
      const r = regionAt(page, at.x, at.y);
      const fills = picture.actions.filter((a) => a.k === 'f' && a.r === r);
      const now = fills.length ? (fills[fills.length - 1] as { c: number }).c : WHITE;
      if (now !== color) townSession().paint([{ id: newPaintId(), k: 'f', r, c: color }]);
      return;
    }
    const c = tool === 'eraser' ? WHITE : color;
    const f: Finger = { stroke: { id: newPaintId(), k: 's', c, w: size, p: [at.x, at.y] }, sentAt: 0 };
    fingers.current.set(id, f);
    share(f, true);
  };

  const drag = (id: number, pageX: number, pageY: number) => {
    const f = fingers.current.get(id);
    if (!f) return;
    const at = toPaper(pageX, pageY);
    const p = f.stroke.p;
    if (Math.hypot(at.x - p[p.length - 2], at.y - p[p.length - 1]) < STEP) return;
    if (p.length >= MAX_PAINT_POINTS * 2) {
      // A long line carries on as a new one, so no single message gets too big.
      share(f, true);
      f.stroke = { ...f.stroke, id: newPaintId(), p: [p[p.length - 2], p[p.length - 1], at.x, at.y] };
      f.sentAt = 0;
    } else {
      f.stroke = { ...f.stroke, p: [...p, at.x, at.y] };
    }
    share(f);
  };

  const finish = (id: number) => {
    const f = fingers.current.get(id);
    if (!f) return;
    fingers.current.delete(id);
    share(f, true);
  };

  const touches = (e: GestureResponderEvent) => (e.nativeEvent.changedTouches?.length ? e.nativeEvent.changedTouches : [e.nativeEvent]);
  const handlers = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      origin.current = { x: e.nativeEvent.pageX - e.nativeEvent.locationX, y: e.nativeEvent.pageY - e.nativeEvent.locationY };
      begin(Number(e.nativeEvent.identifier), e.nativeEvent.pageX, e.nativeEvent.pageY);
    },
    onResponderStart: (e: GestureResponderEvent) => touches(e).forEach((t) => begin(Number(t.identifier), t.pageX, t.pageY)),
    onResponderMove: (e: GestureResponderEvent) =>
      (e.nativeEvent.touches?.length ? e.nativeEvent.touches : [e.nativeEvent]).forEach((t) => drag(Number(t.identifier), t.pageX, t.pageY)),
    onResponderEnd: (e: GestureResponderEvent) => touches(e).forEach((t) => finish(Number(t.identifier))),
    onResponderRelease: () => [...fingers.current.keys()].forEach(finish),
    onResponderTerminate: () => [...fingers.current.keys()].forEach(finish),
  };

  const undo = () => {
    const id = lastMine(picture.actions, MY_PAINT_PREFIX);
    if (id) townSession().undoPaint(id);
    else say('Nothing of yours to undo.');
  };

  const newSheet = (p: ColoringPage, lv: NumberLevel | null) => {
    townSession().newPaper(p.id, lv);
    setOpenedId(null);
    setPanel(null);
    setFlash(null);
    if (lv !== null) {
      setTool('fill');
      say('Work out each sum, then fill that area with the color that has the answer.', 4000);
    } else if (p.id !== 'blank') setTool('fill');
    else setTool('brush');
  };

  const save = () => {
    if (!profile) return say('Pick a player first, then you can save.');
    if (!picture.actions.length) return say('Paint something first!');
    const { id, dropped } = savePicture(profile.id, picture, openedId ?? undefined, hung);
    if (dropped) takeDown(profile.id, dropped);
    setOpenedId(id);
    say(dropped ? 'Saved! Your oldest picture made room for it.' : 'Saved to 🖼️ My pictures!');
  };

  const check = () => {
    const { total, wrong } = numberCheck(picture);
    if (!total) return;
    if (!wrong.length) {
      setFlash(null);
      say('🎉 You did it! Every area is the right color!', 4000);
      return;
    }
    setFlash(new Set(wrong));
    setTimeout(() => setFlash(null), 2500);
    say(wrong.length === 1 ? 'Just 1 area to go! It is flashing red.' : `${wrong.length} areas to go. They are flashing red.`);
  };

  const open = (p: SavedPicture) => {
    townSession().newPaper(p.page, p.lv, p.actions);
    setOpenedId(p.id);
    setPanel(null);
    setTool(p.page === 'blank' ? 'brush' : 'fill');
  };

  const hang = (p: SavedPicture) => {
    if (!profile) return;
    const result = hangPicture(profile.id, p.id);
    say(result === 'ok' ? '🖼️ It is hanging in your buddy’s home!' : result === 'already' ? 'That one is already hanging up.' : 'Your buddy’s home is full. Put something away first.');
  };

  const remove = (p: SavedPicture) => {
    if (!profile) return;
    removeSaved(profile.id, p.id);
    takeDown(profile.id, p.id);
    if (openedId === p.id) setOpenedId(null);
  };

  const chooseTool = (t: Tool) => {
    setTool(t);
    if (t === 'fill') say('Tap an area to fill it with paint.');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            🎨 {page.id === 'blank' ? 'Easel' : `${page.emoji} ${page.name}`}
            {numbers ? ` · ${NUMBER_LEVELS[picture.lv!].name} numbers` : ''}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close the easel" style={styles.close}>
            <Text style={styles.closeText}>✖</Text>
          </Pressable>
        </View>

        <View style={styles.paperRow} onLayout={(e) => setRoom({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={[styles.paper, { width: paperW, height: paperH }]} {...handlers} accessibilityLabel="Paper. Paint on it with your finger.">
            <PaintingView picture={picture} width={paperW} numbers flash={flash ?? undefined} />
          </View>
          {note ? (
            <View style={styles.note} pointerEvents="none">
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tools}>
          <View style={styles.row}>
            <ToolButton label="🖌️ Paint" on={tool === 'brush'} onPress={() => chooseTool('brush')} />
            <ToolButton label="🪣 Fill" on={tool === 'fill'} onPress={() => chooseTool('fill')} />
            <ToolButton label="🧽 Rub out" on={tool === 'eraser'} onPress={() => chooseTool('eraser')} />
            <View style={styles.sizes}>
              {BRUSH_SIZES.map((s, i) => (
                <Pressable
                  key={s}
                  onPress={() => {
                    setSize(i);
                    if (tool === 'fill') setTool('brush');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={['Thin brush', 'Medium brush', 'Thick brush'][i]}
                  accessibilityState={{ selected: size === i }}
                  style={[styles.size, size === i && tool !== 'fill' && styles.sizeOn]}
                >
                  <View style={{ width: 6 + i * 8, height: 6 + i * 8, borderRadius: 20, backgroundColor: tool === 'eraser' ? '#BDBDBD' : PAINT_COLORS[color] }} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.palette}>
            {PAINT_COLORS.map((c, i) =>
              i === WHITE ? null : (
                <Pressable
                  key={c}
                  onPress={() => {
                    setColor(i);
                    if (tool === 'eraser') setTool('brush');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={numbers ? `${PAINT_NAMES[i]}, number ${i}` : PAINT_NAMES[i]}
                  accessibilityState={{ selected: color === i }}
                  style={[styles.swatch, { backgroundColor: c }, color === i && tool !== 'eraser' && styles.swatchOn]}
                >
                  {numbers ? <Text style={[styles.swatchNumber, i === 9 && { color: '#FFFFFF' }]}>{i}</Text> : null}
                </Pressable>
              ),
            )}
          </View>

          <View style={styles.row}>
            <ActionButton label="↩️ Undo" onPress={undo} />
            <ActionButton label="📄 New" onPress={() => setPanel('pages')} />
            {numbers ? <ActionButton label="✅ Check" onPress={check} /> : null}
            <ActionButton label="💾 Save" onPress={save} />
            <ActionButton label="🖼️ Mine" onPress={() => setPanel('pictures')} />
          </View>
        </View>

        {panel === 'pages' ? (
          <PagePicker
            startLevel={levelForGrade(profile?.grade ?? 1)}
            hasPaint={picture.actions.length > 0}
            onPick={newSheet}
            onClose={() => setPanel(null)}
          />
        ) : null}
        {panel === 'pictures' ? (
          <MyPictures pictures={pictures} hung={hung} onOpen={open} onHang={hang} onDelete={remove} onClose={() => setPanel(null)} />
        ) : null}
      </View>
    </Modal>
  );
}

function ToolButton({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.tool, on && styles.toolOn]}>
      <Text style={[styles.toolText, on && styles.toolTextOn]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

/** Choose a fresh sheet: blank paper, or a coloring page to color freely or by numbers. */
function PagePicker({
  startLevel,
  hasPaint,
  onPick,
  onClose,
}: {
  startLevel: NumberLevel;
  hasPaint: boolean;
  onPick: (page: ColoringPage, lv: NumberLevel | null) => void;
  onClose: () => void;
}) {
  const [byNumber, setByNumber] = useState(false);
  const [level, setLevel] = useState<NumberLevel>(startLevel);
  const { width } = useWindowDimensions();
  const thumb = Math.min(130, (Math.min(width, 700) - 80) / 3);
  return (
    <View style={styles.panel}>
      <View style={styles.panelBox}>
        <View style={styles.header}>
          <Text style={styles.title}>📄 New paper</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Text style={styles.closeText}>✖</Text>
          </Pressable>
        </View>
        {hasPaint ? <Text style={styles.warn}>This picture goes away. Tap 💾 Save first to keep it!</Text> : null}
        <View style={styles.row}>
          <ToolButton label="🖍️ Color it in" on={!byNumber} onPress={() => setByNumber(false)} />
          <ToolButton label="🔢 Color by number" on={byNumber} onPress={() => setByNumber(true)} />
        </View>
        {byNumber ? (
          <View style={styles.row}>
            {NUMBER_LEVELS.map((l) => (
              <ToolButton key={l.id} label={`${l.name}  ${l.hint}`} on={level === l.id} onPress={() => setLevel(l.id)} />
            ))}
          </View>
        ) : null}
        <ScrollView contentContainerStyle={styles.grid}>
          {(byNumber ? COLORING_PAGES : [BLANK_PAGE, ...COLORING_PAGES]).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onPick(p, byNumber ? level : null)}
              accessibilityRole="button"
              accessibilityLabel={byNumber ? `${p.name}, color by number` : p.name}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
            >
              <PaintingView picture={{ page: p.id, lv: null, actions: [] }} width={thumb} style={styles.cardPaper} />
              <Text style={styles.cardText}>
                {p.emoji} {p.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/** The player's saved pictures: open one again, hang it in the buddies' home, or throw it away. */
function MyPictures({
  pictures,
  hung,
  onOpen,
  onHang,
  onDelete,
  onClose,
}: {
  pictures: SavedPicture[];
  hung: ReadonlySet<string>;
  onOpen: (p: SavedPicture) => void;
  onHang: (p: SavedPicture) => void;
  onDelete: (p: SavedPicture) => void;
  onClose: () => void;
}) {
  const [sure, setSure] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const thumb = Math.min(150, (Math.min(width, 700) - 80) / 3);
  return (
    <View style={styles.panel}>
      <View style={styles.panelBox}>
        <View style={styles.header}>
          <Text style={styles.title}>🖼️ My pictures</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Text style={styles.closeText}>✖</Text>
          </Pressable>
        </View>
        {pictures.length === 0 ? <Text style={styles.warn}>No pictures yet. Paint one and tap 💾 Save!</Text> : null}
        <ScrollView contentContainerStyle={styles.grid}>
          {pictures.map((p) => (
            <View key={p.id} style={styles.card}>
              <Pressable onPress={() => onOpen(p)} accessibilityRole="button" accessibilityLabel="Open this picture">
                <PaintingView picture={p} width={thumb} style={styles.cardPaper} />
              </Pressable>
              <View style={styles.cardButtons}>
                <Pressable onPress={() => onOpen(p)} accessibilityRole="button" style={styles.small}>
                  <Text style={styles.smallText}>✏️ Open</Text>
                </Pressable>
                <Pressable onPress={() => onHang(p)} accessibilityRole="button" style={styles.small}>
                  <Text style={styles.smallText}>{hung.has(p.id) ? '✅ Up' : '🖼️ Hang'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (sure === p.id) onDelete(p);
                    else setSure(p.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={sure === p.id ? 'Yes, throw it away' : 'Throw away'}
                  style={[styles.small, sure === p.id && styles.danger]}
                >
                  <Text style={[styles.smallText, sure === p.id && { color: '#FFFFFF' }]}>{sure === p.id ? 'Sure?' : '🗑️'}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF1C9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  title: { flex: 1, fontSize: 22, fontWeight: '900', color: '#3B2B25' },
  close: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3B2B25' },
  closeText: { fontSize: 20, fontWeight: '900', color: '#3B2B25' },
  paperRow: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  paper: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#A86B45', overflow: 'hidden' },
  note: { position: 'absolute', bottom: 12, left: 16, right: 16, alignItems: 'center' },
  noteText: { backgroundColor: 'rgba(59,43,37,0.9)', color: '#FFFFFF', fontSize: 17, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, overflow: 'hidden', textAlign: 'center' },
  tools: { paddingHorizontal: 10, paddingBottom: 12, gap: 8, backgroundColor: '#A86B45', paddingTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' },
  tool: { minHeight: 48, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#FFF3D6', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  toolOn: { borderColor: '#FFEB3B', backgroundColor: '#FFFFFF' },
  toolText: { fontSize: 16, fontWeight: '800', color: '#3B2B25' },
  toolTextOn: { fontWeight: '900' },
  sizes: { flexDirection: 'row', gap: 6 },
  size: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF3D6', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  sizeOn: { borderColor: '#FFEB3B', backgroundColor: '#FFFFFF' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 5, borderColor: '#FFEB3B', transform: [{ scale: 1.12 }] },
  swatchNumber: { fontSize: 17, fontWeight: '900', color: '#1B1B3A' },
  action: { minHeight: 48, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#FFFFFF', justifyContent: 'center', borderWidth: 2, borderColor: '#3B2B25' },
  actionText: { fontSize: 16, fontWeight: '900', color: '#3B2B25' },
  panel: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  panelBox: { width: '100%', maxWidth: 720, maxHeight: '94%', backgroundColor: '#FFF8E7', borderRadius: 20, padding: 8, gap: 8, borderWidth: 3, borderColor: '#3B2B25' },
  warn: { fontSize: 16, fontWeight: '800', color: '#BF360C', textAlign: 'center', paddingHorizontal: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', paddingBottom: 12 },
  card: { alignItems: 'center', gap: 4, padding: 6, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E0C9A6' },
  cardPaper: { borderWidth: 1, borderColor: '#BDBDBD' },
  cardText: { fontSize: 15, fontWeight: '800', color: '#3B2B25' },
  cardButtons: { flexDirection: 'row', gap: 4 },
  small: { minHeight: 40, paddingHorizontal: 8, borderRadius: 10, backgroundColor: '#FFF3D6', justifyContent: 'center' },
  smallText: { fontSize: 14, fontWeight: '800', color: '#3B2B25' },
  danger: { backgroundColor: '#E53935' },
});
