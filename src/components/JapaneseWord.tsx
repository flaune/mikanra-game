import type { Progress } from '@/game/learning';
import { words, wordHelp } from '@/game/learning';
export default function JapaneseWord({ id, progress, revealed = false }: { id: string; progress: Progress; revealed?: boolean }) {
  const word = words.find(w => w.id === id); if (!word) return null;
  const help = wordHelp(progress,id,revealed);
  return <span className="adaptive-phrase"><ruby lang="ja">{word.japanese}{word.reading !== word.japanese && <rt>{word.reading}</rt>}</ruby>{help.romaji && <small>{word.romaji}</small>}{help.english && <small lang="en">{word.english}</small>}</span>;
}
