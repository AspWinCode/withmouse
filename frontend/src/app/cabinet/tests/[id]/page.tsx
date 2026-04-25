"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { Test, TestAttempt, TestAttemptListItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { formatDate } from "@/lib/utils";

export default function TestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<number, { selected: number[]; open: string }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<TestAttempt | null>(null);

  const { data: test, isLoading } = useQuery({
    queryKey: ["test", id],
    queryFn: () => api.get<Test>(`/tests/${id}`).then((r) => r.data),
  });

  const { data: myAttempts = [] } = useQuery({
    queryKey: ["test-attempts", id],
    queryFn: () => api.get<TestAttempt[]>(`/tests/${id}/attempts/my`).then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post<TestAttempt>(`/tests/${id}/attempt`, payload).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["test-attempts", id] });
      qc.invalidateQueries({ queryKey: ["attempts", "my"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Ошибка отправки"),
  });

  if (isLoading) return <Spinner />;
  if (!test) return <div className="text-center text-gray-500 py-16">Тест не найден</div>;

  const canAttempt = myAttempts.length < test.max_attempts;

  const handleSelect = (qId: number, optId: number, multi: boolean) => {
    setAnswers((prev) => {
      const cur = prev[qId] || { selected: [], open: "" };
      let selected;
      if (multi) {
        selected = cur.selected.includes(optId)
          ? cur.selected.filter((x) => x !== optId)
          : [...cur.selected, optId];
      } else {
        selected = [optId];
      }
      return { ...prev, [qId]: { ...cur, selected } };
    });
  };

  const handleSubmit = () => {
    const payload = {
      answers: test.questions.map((q) => ({
        question_id: q.id,
        selected_options: answers[q.id]?.selected || [],
        open_answer: answers[q.id]?.open || undefined,
      })),
    };
    mutation.mutate(payload);
  };

  if (submitted && result) {
    return (
      <div>
        <Link href="/cabinet/tests" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Все тесты
        </Link>
        <div className="card max-w-2xl mx-auto text-center py-10">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="mb-2">Тест завершён!</h2>
          <p className="text-gray-500 mb-6">{test.title}</p>
          <div className="max-w-sm mx-auto mb-6">
            <ScoreBar score={result.score} max={result.max_score} />
          </div>
          <div className="flex justify-center gap-4">
            <Link href="/cabinet/tests" className="btn-secondary">К тестам</Link>
            {canAttempt && (
              <button onClick={() => { setSubmitted(false); setResult(null); setAnswers({}); }} className="btn-primary">
                Попробовать снова
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/cabinet/tests" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Все тесты
      </Link>

      <div className="mb-6">
        <h1 className="mb-2">{test.title}</h1>
        {test.description && <p className="text-gray-500">{test.description}</p>}
        <div className="flex gap-4 mt-3 text-sm text-gray-500">
          <span>{test.questions.length} вопросов</span>
          <span>Попыток: {myAttempts.length} / {test.max_attempts}</span>
        </div>
      </div>

      {/* Past results */}
      {myAttempts.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-base mb-4">История прохождений</h3>
          <div className="space-y-3">
            {myAttempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{formatDate(a.completed_at || a.started_at)}</span>
                <ScoreBar score={a.score} max={a.max_score} showLabel />
              </div>
            ))}
          </div>
        </div>
      )}

      {!canAttempt ? (
        <div className="card text-center py-10 text-gray-500">
          <XCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p>Вы использовали все попытки ({test.max_attempts})</p>
        </div>
      ) : (
        <div className="space-y-6">
          {test.questions.sort((a, b) => a.order - b.order).map((q, qi) => (
            <div key={q.id} className="card">
              <p className="font-semibold mb-1 text-xs text-primary-600 uppercase tracking-wide">
                Вопрос {qi + 1} · {q.points} балл{q.points !== 1 ? "а" : ""}
              </p>
              <p className="font-medium text-gray-900 mb-4">{q.text}</p>

              {q.type === "open" ? (
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Введите ваш ответ..."
                  value={answers[q.id]?.open || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: { ...(prev[q.id] || { selected: [] }), open: e.target.value },
                    }))
                  }
                />
              ) : (
                <div className="space-y-2">
                  {q.options.sort((a, b) => a.order - b.order).map((opt) => {
                    const selected = answers[q.id]?.selected?.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelect(q.id, opt.id, q.type === "multiple")}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                          selected
                            ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="inline-flex items-center gap-3">
                          <span className={`w-5 h-5 rounded-${q.type === "multiple" ? "md" : "full"} border-2 flex-shrink-0 transition-colors ${
                            selected ? "border-primary-500 bg-primary-500" : "border-gray-300"
                          }`} />
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="btn-primary px-8 py-3.5"
            >
              {mutation.isPending ? "Отправка..." : "Завершить тест"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
