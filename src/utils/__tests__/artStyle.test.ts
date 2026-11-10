import { INK, inkWidth, shade, tint } from '@/constants/artStyle';

describe('art style', () => {
  it('darkens a colour for its shadow side', () => {
    expect(shade('#FFFFFF')).toBe('#D1CDC5');
    expect(shade('#000000')).toBe('#000000');
  });

  it('reads short hex and leaves odd colours alone', () => {
    expect(shade('#FFF')).toBe(shade('#FFFFFF'));
    expect(shade('rgba(0,0,0,0.5)')).toBe('rgba(0,0,0,0.5)');
  });

  it('lightens toward white', () => {
    expect(tint('#000000', 0.5)).toBe('#808080');
    expect(tint('#FFFFFF')).toBe('#FFFFFF');
  });

  it('keeps outlines at least 2 px', () => {
    expect(inkWidth(40)).toBe(2);
    expect(inkWidth(250)).toBe(4);
    expect(INK).toMatch(/^#[0-9A-F]{6}$/);
  });
});
