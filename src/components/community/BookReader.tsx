import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

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

/** Where each book was left, so a long chapter book opens where you stopped (until the app closes). */
const bookmarks = new Map<Book, number>();

/** An open library book: one big page at a time, with arrows to turn, and a button that reads it aloud. */
export function BookReader({ book, cover, onClose }: Props) {
  const [page, setPage] = useState(0);
  const { width, height } = useWindowDimensions();

  // A book opens where it was left, or at its first page.
  useEffect(() => {
    setPage(book ? (bookmarks.get(book) ?? 0) : 0);
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
    const next = Math.max(0, Math.min(pages.length - 1, at + by));
    bookmarks.set(book, next);
    setPage(next);
  };
  const close = () => {
    stopSpeaking();
    onClose();
  };
  const finish = () => {
    // Read to the end: next time it starts over.
    bookmarks.delete(book);
    close();
  };
  const words = pageWords(pages[at]);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close} supportedOrientations={['landscape', 'portrait']}>
      <View style={styles.backdrop}>
        <View style={[styles.book, { width: Math.min(width - 16, 1180), height: Math.min(height - 16, 900) }]}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {cover ? `${cover} ` : ''}
              {book.title}
              {book.grade ? <Text style={styles.grade}>{`  ${book.grade}`}</Text> : null}
            </Text>
            {words ? (
              <Pressable onPress={() => speakText(words, true)} accessibilityRole="button" accessibilityLabel="Read this page to me" style={styles.read}>
                <Text style={styles.readText}>🔊 Read to me</Text>
              </Pressable>
            ) : null}
            <Text style={styles.count}>
              {at + 1} / {pages.length}
            </Text>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close the book" style={styles.close}>
              <Text style={styles.closeText}>✖</Text>
            </Pressable>
          </View>

          {/* The arrows sit beside the page, so the page gets all the height a phone held sideways has. */}
          <View style={styles.body}>
            <Pressable
              onPress={() => turn(-1)}
              disabled={at === 0}
              accessibilityRole="button"
              accessibilityLabel="Page back"
              style={[styles.arrow, at === 0 && styles.off]}
            >
              <Text style={styles.arrowText}>◀</Text>
            </Pressable>
            <View style={pages[at].kind === 'picture' || pages[at].kind === 'chapter' ? styles.fullPage : styles.page}>
              <PageView key={at} page={pages[at]} big={big} />
            </View>
            {last ? (
              <Pressable onPress={finish} accessibilityRole="button" accessibilityLabel="The end. Close the book" style={[styles.arrow, styles.end]}>
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
  if (page.kind === 'picture') {
    return <Image source={page.image} style={styles.spread} resizeMode="contain" accessibilityLabel={page.text || 'A picture'} />;
  }
  if (page.kind === 'chapter') {
    // A picture page with a short caption shows the picture big; a page of words shows a smaller picture above them.
    const caption = page.text.length < 140 && !page.heading;
    const size = Math.max(16, Math.round(big * 0.72));
    if (caption && page.image) {
      return (
        <View style={styles.captionPage}>
          <Image source={page.image} style={styles.bigPicture} resizeMode="contain" />
          {page.text ? <Text style={[styles.caption, { fontSize: size, lineHeight: size * 1.45 }]}>{page.text}</Text> : null}
        </View>
      );
    }
    return (
      <ScrollView style={styles.chapterScroll} contentContainerStyle={styles.chapter}>
        {page.image ? <Image source={page.image} style={styles.smallPicture} resizeMode="contain" /> : null}
        {page.heading ? <Text style={[styles.heading, { fontSize: size * 1.3, lineHeight: size * 1.6 }]}>{page.heading}</Text> : null}
        {page.text.split('\n\n').map((para, i) => (
          <Text key={i} style={[styles.para, { fontSize: size, lineHeight: size * 1.45 }]}>
            {para}
          </Text>
        ))}
      </ScrollView>
    );
  }
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
  book: { backgroundColor: PAPER, borderRadius: radius.lg, borderWidth: 4, borderColor: LINE, padding: spacing.sm, gap: spacing.sm },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 22, fontWeight: '900', color: colors.text },
  close: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFE3CF' },
  closeText: { fontSize: 24, fontWeight: '900', color: LINE },
  page: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  fullPage: { flex: 1, alignSelf: 'stretch' },
  spread: { flex: 1, width: '100%' },
  chapterScroll: { flex: 1 },
  chapter: { gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.md },
  captionPage: { flex: 1, gap: spacing.sm, paddingBottom: spacing.sm },
  bigPicture: { flex: 1, width: '100%' },
  smallPicture: { width: '100%', height: 170 },
  heading: { fontWeight: '900', color: colors.text, textAlign: 'center' },
  para: { color: colors.text, fontWeight: '500' },
  caption: { color: colors.textMuted, fontWeight: '700', textAlign: 'center', fontStyle: 'italic' },
  grade: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  words: { fontWeight: '800', color: colors.text, textAlign: 'center' },
  secret: { fontWeight: '900', color: '#C2185B', textAlign: 'center' },
  step: { fontWeight: '800', color: colors.textMuted, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  chip: { backgroundColor: '#FFE9B8', borderRadius: radius.md, borderWidth: 2, borderColor: LINE, paddingHorizontal: 12, paddingVertical: 6 },
  arrow: { width: TAP_TARGET * 1.1, height: TAP_TARGET * 1.6, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32, color: colors.primaryText, fontWeight: '900' },
  off: { backgroundColor: colors.disabled },
  end: { backgroundColor: colors.correct },
  endText: { fontSize: 18, color: colors.primaryText, fontWeight: '900', textAlign: 'center' },
  read: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: '#EFE3CF', borderWidth: 2, borderColor: LINE },
  readText: { fontSize: 18, fontWeight: '800', color: LINE },
  count: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
});
