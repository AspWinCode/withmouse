"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { AssignmentListItem, Submission } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/utils";

export default function CabinetAssignmentsPage() {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => api.get<AssignmentListItem[]>("/assignments").then((r) => r.data),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["submissions", "my"],
    queryFn: () => api.get<Submission[]>("/submissions/my").then((r) => r.data),
  });

  const subMap = submissions.reduce<Record<number, Submission>>((acc, s) => {
    acc[s.assignment_id] = s;
    return acc;
  }, {});

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1">Задания</h1>
        <p className="text-gray-500">Выполняйте задания и получайте обратную связь</p>
      </div>

      {assignments.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Заданий пока нет</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {assignments.map((a) => {
            const sub = subMap[a.id];
            return (
              <Link key={a.id} href={`/cabinet/assignments/${a.id}`} className="card hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold mb-1 group-hover:text-primary-600 transition-colors truncate">{a.title}</h3>
                    <p className="text-sm text-gray-500">
                      {ASSIGNMENT_TYPE_LABELS[a.type]} · Макс. {a.max_score} баллов
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
                </div>
                {sub && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <StatusBadge status={sub.status} />
                    {sub.score !== null && sub.score !== undefined && (
                      <span className="text-sm font-medium text-gray-700">{sub.score} / {a.max_score}</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
