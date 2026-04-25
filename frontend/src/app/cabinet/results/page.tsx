"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Submission, TestAttemptListItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatDate } from "@/lib/utils";
import { ClipboardList, FileText } from "lucide-react";
import Link from "next/link";

export default function ResultsPage() {
  const { data: submissions = [], isLoading: loadSubs } = useQuery({
    queryKey: ["submissions", "my"],
    queryFn: () => api.get<Submission[]>("/submissions/my").then((r) => r.data),
  });

  const { data: attempts = [], isLoading: loadAttempts } = useQuery({
    queryKey: ["attempts", "my"],
    queryFn: () => api.get<TestAttemptListItem[]>("/tests/attempts/my").then((r) => r.data),
  });

  if (loadSubs || loadAttempts) return <Spinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1">Мои результаты</h1>
        <p className="text-gray-500">История тестов и проверенных заданий</p>
      </div>

      {/* Test results */}
      <section className="mb-10">
        <h2 className="text-lg mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary-500" /> Результаты тестов
        </h2>
        {attempts.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <p>Вы ещё не проходили тестов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((a) => (
              <div key={a.id} className="card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/cabinet/tests/${a.test_id}`}
                      className="font-semibold hover:text-primary-600 transition-colors"
                    >
                      {a.test_title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(a.started_at)}</p>
                  </div>
                  <div className="w-full sm:w-48 shrink-0">
                    <ScoreBar score={a.score} max={a.max_score} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submission results */}
      <section>
        <h2 className="text-lg mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" /> Оценённые задания
        </h2>
        {submissions.filter((s) => s.status !== "submitted").length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <p>Проверенных работ пока нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions
              .filter((s) => s.status !== "submitted")
              .map((s) => (
                <div key={s.id} className="card">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/cabinet/assignments/${s.assignment_id}`}
                        className="font-semibold hover:text-primary-600 transition-colors"
                      >
                        Задание #{s.assignment_id}
                      </Link>
                      <p className="text-xs text-gray-400 mt-1">
                        Отправлено: {formatDate(s.submitted_at)}
                        {s.reviewed_at && ` · Проверено: ${formatDate(s.reviewed_at)}`}
                      </p>
                      {s.comment && (
                        <div className="mt-3 bg-blue-50 rounded-xl px-4 py-3 text-sm text-gray-700 border border-blue-100">
                          <span className="text-xs font-semibold text-blue-600 block mb-1">
                            Комментарий проверяющего
                          </span>
                          {s.comment}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={s.status} />
                      {s.score !== null && s.score !== undefined && (
                        <span className="text-lg font-bold text-primary-700">
                          {s.score} баллов
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
