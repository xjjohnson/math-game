import type { ImageSourcePropType } from 'react-native';

/** One turn of a school book: a picture (for picture books, the whole printed spread), and its words. */
export interface SchoolPage {
  image?: ImageSourcePropType;
  /** A chapter's title, on the page where it starts. */
  heading?: string;
  /** The words, for reading aloud (and, in chapter books, for showing). */
  text: string;
}

/** A story from the Texas Bluebonnet Learning readers (see scripts/library-books/build.py). */
export interface SchoolBook {
  title: string;
  cover: string;
  level: 'easy' | 'harder';
  /** "Kindergarten", "Grade 1", ... */
  grade: string;
  /** The reader it comes from, for the credits page. */
  reader: string;
  /** "picture": the printed pages as they are. "chapter": words as text, with the pictures above. */
  style: 'picture' | 'chapter';
  pages: SchoolPage[];
}
