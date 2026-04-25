"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { TestListItem, TestAttemptListItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { ScoreBar } from "@/components/ui/ScoreBar";

export default function CabinetTestsPage() {
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: () => api.get<TestListItem[]>("/tests").then((r) => r.data),
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["attempts", "my"],
    queryFn: () => api.get<TestAttemptListItem[]>("/tests/attempts/my").then((r) => r.data),
  });

  const attemptMap = attempts.reduce<Record<number, TestAttemptListItem[]>>((acc, a) => {
    (acc[a.test_id] ??= []).push(a);
    return acc;
  }, {});

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1">Тесты</h1>
        <p className="text-gray-500">Проверяйте свои знания о профессиях</p>
      </div>

      {tests.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">Тесты пока не добавлены</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {tests.map((t) => {
            const testAttempts = attemptMap[t.id] || [];
            const best = testAttempts.reduce<TestAttemptListItem | null>(
              (b, a) => (!b || a.score / a.max_score > b.score / b.max_score ? a : b),
              null
            );

            return (
              <Link key={t.id} href={`/cabinet/tests/${t.id}`} className="card hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold group-hover:text-primary-600 transition-colors">{t.title}</h3>
                    {t.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.description}</p>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                </div>
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <span>{t.question_count} вопросов</span>
                  <span>Попыток: {testAttempts.length} / {t.max_attempts}</span>
                </div>
                {best && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Лучший результат</p>
                    <ScoreBar score={best.score} max={best.max_score} />
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
