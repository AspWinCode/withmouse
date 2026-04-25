"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, ClipboardList, FileText, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Submission, TestAttemptListItem } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatDate } from "@/lib/utils";

export default function CabinetDashboard() {
  const { user } = useAuth();

  const { data: submissions = [] } = useQuery({
    queryKey: ["submissions", "my"],
    queryFn: () => api.get<Submission[]>("/submissions/my").then((r) => r.data),
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["attempts", "my"],
    queryFn: () => api.get<TestAttemptListItem[]>("/tests/attempts/my").then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1">Привет, {user?.name?.split(" ")[0]}! 👋</h1>
        <p className="text-gray-500">Ваш личный кабинет</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: "Тестов пройдено", value: attempts.length, icon: ClipboardList, color: "text-blue-600 bg-blue-100" },
          { label: "Заданий отправлено", value: submissions.length, icon: FileText, color: "text-green-600 bg-green-100" },
          {
            label: "Принято работ",
            value: submissions.filter((s) => s.status === "accepted").length,
            icon: CheckCircle,
            color: "text-orange-600 bg-orange-100",
          },
        ].map((s, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.color}`}>
              <s.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent attempts */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">Последние тесты</h2>
            <Link href="/cabinet/tests" className="text-sm text-primary-600 hover:underline">Все тесты</Link>
          </div>
          {attempts.length === 0 ? (
            <div className="card text-center text-gray-400 py-8">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Вы ещё не проходили тестов</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.slice(0, 5).map((a) => (
                <div key={a.id} className="card py-4">
                  <p className="font-medium text-sm mb-2">{a.test_title}</p>
                  <ScoreBar score={a.score} max={a.max_score} />
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(a.started_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent submissions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">Отправленные работы</h2>
            <Link href="/cabinet/assignments" className="text-sm text-primary-600 hover:underline">Все задания</Link>
          </div>
          {submissions.length === 0 ? (
            <div className="card text-center text-gray-400 py-8">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Вы ещё не отправляли работ</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.slice(0, 5).map((s) => (
                <div key={s.id} className="card py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Задание #{s.assignment_id}</p>
                    <p className="text-xs text-gray-400">{formatDate(s.submitted_at)}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={s.status} />
                    {s.score !== undefined && s.score !== null && (
                      <p className="text-sm font-medium mt-1">{s.score} баллов</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
