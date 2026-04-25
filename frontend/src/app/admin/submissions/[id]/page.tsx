"use client";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { SubmissionAdmin, SubmissionStatus } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, SUBMISSION_STATUS_LABELS } from "@/lib/utils";

type ReviewForm = { score: number; comment: string; status: SubmissionStatus };

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const { data: submission, isLoading } = useQuery({
    queryKey: ["submission-admin", id],
    queryFn: () => api.get<SubmissionAdmin>(`/submissions/${id}`).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<ReviewForm>({
    defaultValues: { score: 0, comment: "", status: "reviewing" },
  });

  // Обновляем форму когда загрузились данные (async useQuery)
  useEffect(() => {
    if (submission) {
      reset({
        score: submission.score ?? 0,
        comment: submission.comment ?? "",
        status: submission.status ?? "reviewing",
      });
    }
  }, [submission, reset]);

  const mutation = useMutation({
    mutationFn: (data: ReviewForm) =>
      api.patch<SubmissionAdmin>(`/submissions/${id}/review`, data).then((r) => r.data),
    onSuccess: (updated) => {
      toast.success("Оценка сохранена");
      qc.invalidateQueries({ queryKey: ["submission-admin", id] });
      qc.invalidateQueries({ queryKey: ["admin-submissions"] });
      // Обновляем форму с сохранёнными значениями
      reset({
        score: updated.score ?? 0,
        comment: updated.comment ?? "",
        status: updated.status,
      });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Ошибка"),
  });

  if (isLoading) return <Spinner />;
  if (!submission) return <div className="text-center text-gray-500 py-16">Работа не найдена</div>;

  return (
    <div>
      <Link
        href="/admin/submissions"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> К ответам
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Основная информация */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="mb-1">{submission.assignment_title}</h2>
                <p className="text-sm text-gray-500">
                  Ученик: <strong>{submission.student_name}</strong> ({submission.student_phone})
                </p>
              </div>
              <StatusBadge status={submission.status} />
            </div>
            <p className="text-xs text-gray-400">
              Отправлено: {formatDate(submission.submitted_at)}
              {submission.reviewed_at && ` · Проверено: ${formatDate(submission.reviewed_at)}`}
            </p>
          </div>

          {submission.text_answer && (
            <div className="card">
              <h3 className="text-base mb-3">Текстовый ответ</h3>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {submission.text_answer}
              </div>
            </div>
          )}

          {submission.file_path && (
            <div className="card">
              <h3 className="text-base mb-3">Загруженный файл</h3>
              <a
                href={`/api/submissions/${submission.id}/download`}
                className="flex items-center gap-3 p-4 bg-primary-50 rounded-xl text-primary-700 hover:bg-primary-100 transition-colors font-medium"
              >
                <Download className="w-5 h-5" />
                <span className="text-sm">{submission.original_file_name || "Скачать файл"}</span>
              </a>
            </div>
          )}
        </div>

        {/* Панель проверки */}
        <div>
          <div className="card sticky top-6">
            <h3 className="text-base mb-4">Проверка работы</h3>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <div>
                <label className="label">Статус</label>
                <select {...register("status")} className="input">
                  {(
                    ["submitted", "reviewing", "accepted", "revision", "rejected"] as SubmissionStatus[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {SUBMISSION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  Балл (макс. {submission.assignment_max_score})
                </label>
                <input
                  {...register("score", { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max={submission.assignment_max_score}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Комментарий для ученика</label>
                <textarea
                  {...register("comment")}
                  rows={4}
                  className="input resize-none"
                  placeholder="Напишите комментарий..."
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                {isSubmitting ? "Сохранение..." : "Сохранить оценку"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
