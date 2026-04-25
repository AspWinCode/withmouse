import { getScorePercent, cn } from "@/lib/utils";

interface Props {
  score: number;
  max: number;
  showLabel?: boolean;
}

export function ScoreBar({ score, max, showLabel = true }: Props) {
  const pct = getScorePercent(score, max);
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-sm font-medium">
          <span>{score} / {max} баллов</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
