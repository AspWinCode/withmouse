import { SubmissionStatus } from "@/types";
import { SUBMISSION_STATUS_LABELS, SUBMISSION_STATUS_COLORS, cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={cn("badge", SUBMISSION_STATUS_COLORS[status])}>
      {SUBMISSION_STATUS_LABELS[status]}
    </span>
  );
}
