import { VOICE_ITEMS } from '@/constants/shop';
import { makeProfile } from '@/test/fixtures';
import { buyItem, equipItem, isEquipped, voiceStyleFor } from '@/utils/shop';
import { rankVoices, voiceIdFor, type DeviceVoice } from '@/utils/voices';

const v = (identifier: string, language = 'en-US', quality = 'Default'): DeviceVoice => ({
  identifier,
  name: identifier,
  language,
  quality,
});

describe('picking device voices', () => {
  const voices = [
    v('en-us-x-sfg-network', 'en-US', 'Enhanced'),
    v('de-de-x-nfh-local', 'de-DE', 'Enhanced'),
    v('en-US-language'),
    v('en-gb-x-gba-local', 'en-GB', 'Enhanced'),
    v('en-us-x-tpf-local', 'en-US', 'Enhanced'),
    v('en-us-x-iol-local'),
  ];

  it('keeps offline English voices only, best first', () => {
    expect(rankVoices(voices).map((x) => x.identifier)).toEqual([
      'en-us-x-tpf-local',
      'en-gb-x-gba-local',
      'en-us-x-iol-local',
      'en-US-language',
    ]);
  });

  it('maps a style to a voice, falling back when the tablet has few', () => {
    const ranked = rankVoices(voices);
    const style = (pick: 'default' | 'best' | 'second') => ({ pick, pitch: 1, rate: 1, emoji: '', blurb: '' });
    expect(voiceIdFor(style('default'), ranked)).toBeUndefined();
    expect(voiceIdFor(style('best'), ranked)).toBe('en-us-x-tpf-local');
    expect(voiceIdFor(style('second'), ranked)).toBe('en-gb-x-gba-local');
    expect(voiceIdFor(style('second'), ranked.slice(0, 1))).toBe('en-us-x-tpf-local');
    expect(voiceIdFor(style('best'), [])).toBeUndefined();
  });
});

describe('voices in the shop', () => {
  it('has a free Classic voice everyone starts with', () => {
    const p = makeProfile();
    const classic = VOICE_ITEMS.find((i) => i.id === 'voice-classic')!;
    expect(classic.price).toBe(0);
    expect(isEquipped(p, classic)).toBe(true);
    expect(voiceStyleFor(p).pick).toBe('default');
  });

  it('buys a voice with coins and switches back for free', () => {
    const bought = buyItem(makeProfile({ coins: 100 }), 'voice-robot');
    expect(bought.ok).toBe(true);
    if (!bought.ok) return;
    expect(bought.profile.coins).toBe(40);
    expect(voiceStyleFor(bought.profile).pitch).toBeLessThan(1);
    const back = equipItem(bought.profile, 'voice-classic');
    expect(back.equipped.voice).toBe('voice-classic');
    expect(equipItem(back, 'voice-robot').equipped.voice).toBe('voice-robot');
  });

  it("can't buy a voice without enough coins", () => {
    expect(buyItem(makeProfile({ coins: 10 }), 'voice-teacher')).toEqual({ ok: false, reason: 'coins' });
  });

  it('keeps every voice style in a range the speech engine handles', () => {
    for (const item of VOICE_ITEMS) {
      if (item.category !== 'voice') throw new Error('not a voice');
      expect(item.voice.pitch).toBeGreaterThanOrEqual(0.3);
      expect(item.voice.pitch).toBeLessThanOrEqual(2);
      expect(item.voice.rate).toBeGreaterThanOrEqual(0.5);
      expect(item.voice.rate).toBeLessThanOrEqual(1.5);
    }
  });
});
