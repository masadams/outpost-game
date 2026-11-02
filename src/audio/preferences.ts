export const AUDIO_KEY = 'outpost.audio.v1';
export interface AudioPreferences { muted: boolean; volume: number }
export function parsePreferences(text: string | null): AudioPreferences {
  try {
    const value = JSON.parse(text ?? 'null');
    if (value && typeof value.muted === 'boolean' && typeof value.volume === 'number' && Number.isFinite(value.volume) && value.volume >= 0 && value.volume <= 1) return { muted: value.muted, volume: value.volume };
  } catch { /* Preferences are optional; corrupt storage never blocks play. */ }
  return { muted: false, volume: 0.35 };
}
