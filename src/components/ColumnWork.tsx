import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { PencilDigit } from '@/components/PencilDigit';
import { colors, radius } from '@/constants/theme';
import type { Problem } from '@/types';
import type { ColumnEntry, ColumnLayout, ColumnRow } from '@/utils/columnEntry';

interface Props {
  problem: Problem;
  layout: ColumnLayout;
  symbol: string;
  /** Ink color from the card style. */
  ink: string;
  correctColor: string;
  /** The player's boxes; null shows a plain "?" (when answering with choice buttons). */
  entry: ColumnEntry | null;
  reveal: boolean;
  /** Free mode: the player picks boxes. Show-my-work mode moves along by itself. */
  selectable?: boolean;
  /** Show-my-work: digits typed so far for the current box, e.g. the 1 of 13. */
  pending?: string;
  /** Show-my-work: carries glide up from the box they came from. */
  flyCarries?: boolean;
  /** Show-my-work: every column is done, so no box is highlighted. */
  finished?: boolean;
  allowNegative?: boolean;
  onSelect?: (row: ColumnRow, col: number) => void;
  onToggleSign?: () => void;
}

/** Bigger boxes when there are few columns; all of them fit a phone either way. */
const cellSize = (columns: number) => (columns <= 4 ? 52 : columns <= 5 ? 46 : 40);
const PENCIL = '#55556B';

/**
 * A problem written in columns, like on paper: carry boxes on top, the two
 * numbers, a line, and one answer box per column.
 */
export function ColumnWork({
  problem,
  layout,
  symbol,
  ink,
  correctColor,
  entry,
  reveal,
  selectable = true,
  pending = '',
  flyCarries = false,
  finished = false,
  allowNegative,
  onSelect,
  onToggleSign,
}: Props) {
  const cell = cellSize(layout.width);
  const rowHeight = Math.round(cell * 1.05);
  const font = { fontSize: Math.round(cell * 0.82), lineHeight: rowHeight, color: ink };
  const pencil = { fontSize: Math.round(cell * 0.95), lineHeight: rowHeight, color: ink };
  const box = { width: cell, height: Math.round(cell * 1.15) };
  const cols = Array.from({ length: layout.width }, (_, i) => i);
  const answer = String(Math.abs(problem.answer)).split('');
  const revealed = [...Array<null>(layout.width - answer.length).fill(null), ...answer];
  const typing = entry !== null && !reveal;
  const subtract = problem.operation === 'subtract';
  // How far a carry travels: from the answer box one column right, up past both numbers.
  const carryFrom = { x: cell, y: rowHeight * 2 + 14 + box.height / 2 + 6 };

  const digitRow = (digits: (string | null)[], lead: string | null, struck?: (i: number) => boolean) => (
    <View style={styles.row}>
      <Text style={[styles.digit, font, { width: cell }]}>{lead ?? ''}</Text>
      {digits.map((d, i) => (
        <Text
          key={i}
          style={[styles.digit, font, { width: cell }, struck?.(i) && d !== null && styles.struck]}
        >
          {d ?? ''}
        </Text>
      ))}
    </View>
  );

  return (
    <View style={styles.wrap}>
      {entry ? (
        <View style={styles.row}>
          <Text style={[styles.carryHint, { width: cell }]}>{subtract ? 'borrow' : 'carry'}</Text>
          {cols.map((i) => {
            const selected = typing && selectable && entry.cursor.row === 'carry' && entry.cursor.col === i;
            const mark = entry.carries[i];
            return (
              <Pressable
                key={i}
                disabled={!typing || !selectable}
                onPress={() => onSelect?.('carry', i)}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={`Work box above the ${placeName(layout.width - 1 - i)}${mark ? `, ${mark}` : ''}`}
                style={[styles.carryCell, { width: cell }]}
              >
                <View style={[styles.carryBox, selectable && styles.carryBoxDashed, selected && styles.selected]}>
                  {mark ? (
                    <PencilDigit
                      key={mark}
                      text={mark}
                      style={styles.carryText}
                      from={flyCarries && !subtract ? carryFrom : undefined}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {digitRow(layout.a, null, subtract && entry ? (i) => entry.carries[i] !== null : undefined)}
      {digitRow(layout.b, symbol)}
      <View style={[styles.line, { backgroundColor: ink, width: cell * (layout.width + 1) }]} />

      <View style={styles.row}>
        {entry && allowNegative && typing ? (
          <Pressable
            onPress={onToggleSign}
            accessibilityRole="button"
            accessibilityLabel={entry.negative ? 'Minus sign on. Tap to remove' : 'Tap to make the answer negative'}
            style={[styles.answerBox, box, styles.signBox]}
          >
            <Text style={[styles.digit, font, !entry.negative && styles.faint]}>−</Text>
          </Pressable>
        ) : (
          <Text style={[styles.digit, font, { width: cell, color: reveal ? correctColor : ink }]}>
            {(reveal ? problem.answer < 0 : entry?.negative) ? '−' : ''}
          </Text>
        )}
        {entry === null && !reveal ? (
          <Text style={[styles.digit, font, { width: cell * layout.width, textAlign: 'right' }]}>?</Text>
        ) : (
          cols.map((i) => {
            const current = typing && !finished && entry.cursor.row === 'answer' && entry.cursor.col === i;
            const value = reveal ? revealed[i] : entry?.digits[i];
            const shown = current && pending ? pending : value;
            return (
              <Pressable
                key={i}
                disabled={!typing || !selectable}
                onPress={() => onSelect?.('answer', i)}
                accessibilityRole="button"
                accessibilityLabel={`Answer box, ${placeName(layout.width - 1 - i)}${shown ? `, ${shown}` : ', empty'}`}
                style={[styles.answerBox, box, current && styles.selected, reveal && styles.revealBox]}
              >
                {shown ? (
                  reveal ? (
                    <Text style={[styles.digit, font, { color: correctColor }]}>{shown}</Text>
                  ) : (
                    <PencilDigit
                      key={`${shown}-${current && pending ? 'pending' : 'set'}`}
                      text={shown}
                      style={[pencil, current && pending ? { color: PENCIL } : null]}
                    />
                  )
                ) : null}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands'];
const placeName = (power: number) => PLACES[power] ?? `place ${power + 1}`;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  digit: { fontWeight: '900', textAlign: 'center', fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through', opacity: 0.45 },
  carryHint: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  carryCell: { alignItems: 'center' },
  carryBox: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carryBoxDashed: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.disabled },
  carryText: { fontSize: 24, lineHeight: 30, color: PENCIL },
  line: { height: 5, borderRadius: 3, marginVertical: 4 },
  answerBox: {
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  signBox: { borderStyle: 'dashed', borderColor: colors.disabled },
  selected: { borderColor: colors.primary, borderWidth: 4, backgroundColor: '#E8ECFF', borderStyle: 'solid' },
  revealBox: { borderColor: 'transparent' },
  faint: { opacity: 0.25 },
});
