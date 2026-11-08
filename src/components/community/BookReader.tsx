import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/AppText';
import { colors, radius, spacing, TAP_TARGET } from '@/constants/theme';
import { speakText, stopSpeaking } from '@/utils/feedback';
import { ingredientsFor, pageWords, recipeByName, type Book, type Page } from '@/utils/libraryBooks';

interface Props {
  /** The book to show, or null when none is open. */
  book: Book | null;
  /** The book's color on the shelf. */
  cover?: string;
  onClose: () => void;
}

/** An open library book: one big page at a time, with arrows to turn, and a button that reads it aloud. */
export function BookReader({ book, cover, onClose }: Props) {
  const [page, setPage] = useState(0);
  const { width, height } = useWindowDimensions();

  // A new book opens at its first page.
  useEffect(() => {
    setPage(0);
    return stopSpeaking;
  }, [book]);

  if (!book) return null;
  const pages = book.pages;
  const at = Math.min(page, pages.length - 1);
  const last = at === pages.length - 1;
  // Sized from the screen's height, so a recipe page fits on a phone held sideways too.
  const big = Math.max(17, Math.min(40, Math.min(width, height) * 0.05));

  const turn = (by: number) => {
    stopSpeaking();
    setPage(Math.max(0, Math.min(pages.length - 1, at + by)));
  };
  const close = () => {
    stopSpeaking();
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} supportedOrientations={['landscape', 'portrait']}>
      <View style={styles.backdrop}>
        <View style={[styles.book, { width: Math.min(width - 24, 760), height: Math.min(height - 24, 620) }]}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {cover ? `${cover} ` : ''}
              {book.title}
            </Text>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close the book" style={styles.close}>
              <Text style={styles.closeText}>✖</Text>
            </Pressable>
          </View>

          <View style={styles.page}>
            <PageView page={pages[at]} big={big} />
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => turn(-1)}
              disabled={at === 0}
              accessibilityRole="button"
              accessibilityLabel="Page back"
              style={[styles.arrow, at === 0 && styles.off]}
            >
              <Text style={styles.arrowText}>◀</Text>
            </Pressable>
            <View style={styles.middle}>
              <Pressable
                onPress={() => speakText(pageWords(pages[at]), true)}
                accessibilityRole="button"
                accessibilityLabel="Read this page to me"
                style={styles.read}
              >
                <Text style={styles.readText}>🔊 Read to me</Text>
              </Pressable>
              <Text style={styles.count}>
                {at + 1} / {pages.length}
              </Text>
            </View>
            {last ? (
              <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="The end. Close the book" style={[styles.arrow, styles.end]}>
                <Text style={styles.endText}>The end</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => turn(1)} accessibilityRole="button" accessibilityLabel="Next page" style={styles.arrow}>
                <Text style={styles.arrowText}>▶</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PageView({ page, big }: { page: Page; big: number }) {
  if (page.kind === 'text') {
    return (
      <>
        <Text style={{ fontSize: big * 2.6, lineHeight: big * 3.1, textAlign: 'center' }}>{page.picture}</Text>
        <Text style={[styles.words, { fontSize: big, lineHeight: big * 1.35 }]}>{page.text}</Text>
      </>
    );
  }
  const recipe = recipeByName(page.recipe);
  if (!recipe) return null;
  const small = Math.round(big * 0.7);
  return (
    <>
      <Text style={[styles.secret, { fontSize: small }]}>⭐ Secret recipe ⭐</Text>
      <Text style={[styles.words, { fontSize: big, lineHeight: big * 1.3 }]}>
        {recipe.emoji} {recipe.name}
      </Text>
      <Text style={[styles.step, { fontSize: small }]}>1. Put in the bowl:</Text>
      <View style={styles.chips}>
        {recipe.needs.map((k) => (
          <View key={k} style={styles.chip}>
            <Text style={{ fontSize: small, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
              {ingredientsFor(k)
                .map((i) => `${i.emoji} ${i.name}`)
                .join('  or  ')}
            </Text>
          </View>
        ))}
      </View>
      <Text style={[styles.step, { fontSize: small }]}>2. Mix it on the mixer.</Text>
      <Text style={[styles.step, { fontSize: small }]}>3. Bake it in the hot oven!</Text>
    </>
  );
}

const PAPER = '#FFFBEF';
const LINE = '#5B3A24';

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,20,10,0.55)', alignItems: 'center', justifyContent: 'center' },
  book: { backgroundColor: PAPER, borderRadius: radius.lg, borderWidth: 4, borderColor: LINE, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 24, fontWeight: '900', color: colors.text },
  close: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFE3CF' },
  closeText: { fontSize: 24, fontWeight: '900', color: LINE },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  words: { fontWeight: '800', color: colors.text, textAlign: 'center' },
  secret: { fontWeight: '900', color: '#C2185B', textAlign: 'center' },
  step: { fontWeight: '800', color: colors.textMuted, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  chip: { backgroundColor: '#FFE9B8', borderRadius: radius.md, borderWidth: 2, borderColor: LINE, paddingHorizontal: 12, paddingVertical: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  arrow: { minWidth: TAP_TARGET * 1.3, height: TAP_TARGET, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  arrowText: { fontSize: 32, color: colors.primaryText, fontWeight: '900' },
  off: { backgroundColor: colors.disabled },
  end: { backgroundColor: colors.correct },
  endText: { fontSize: 22, color: colors.primaryText, fontWeight: '900' },
  middle: { flex: 1, alignItems: 'center', gap: 2 },
  read: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: '#EFE3CF', borderWidth: 2, borderColor: LINE },
  readText: { fontSize: 20, fontWeight: '800', color: LINE },
  count: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
});
