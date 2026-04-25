"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { ArrowLeft, Upload, Download, FileText, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { Assignment, Submission } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ASSIGNMENT_TYPE_LABELS, formatDate } from "@/lib/utils";

export default function AssignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [textAnswer, setTextAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment", id],
    queryFn: () => api.get<Assignment>(`/assignments/${id}`).then((r) => r.data),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["submissions", "my"],
    queryFn: () => api.get<Submission[]>("/submissions/my").then((r) => r.data),
  });

  const mySubmission = submissions.find((s) => s.assignment_id === Number(id));

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setFile(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: 1 });

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append("assignment_id", id);
      if (textAnswer) fd.append("text_answer", textAnswer);
      if (file) fd.append("file", file);
      return api.post<Submission>("/submissions", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data);
    },
    onSuccess: () => {
      toast.success("Работа отправлена!");
      qc.invalidateQueries({ queryKey: ["submissions", "my"] });
      setTextAnswer("");
      setFile(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || "Ошибка отправки"),
  });

  if (isLoading) return <Spinner />;
  if (!assignment) return <div className="text-center text-gray-500 py-16">Задание не найдено</div>;

  return (
    <div>
      <Link href="/cabinet/assignments" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> Все задания
      </Link>

      <div className="max-w-3xl">
        <div className="mb-2 flex items-center gap-2">
          <span className="badge bg-primary-100 text-primary-700">{ASSIGNMENT_TYPE_LABELS[assignment.type]}</span>
          <span className="badge bg-gray-100 text-gray-700">Макс. {assignment.max_score} баллов</span>
        </div>
        <h1 className="mb-4">{assignment.title}</h1>
        {assignment.description && (
          <div className="card mb-6 bg-blue-50 border-blue-100">
            <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{assignment.description}</p>
          </div>
        )}

        {/* Files to download */}
        {assignment.files.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-base mb-3">Материалы для скачивания</h3>
            <div className="space-y-2">
              {assignment.files.map((f) => (
                <a
                  key={f.id}
                  href={`/api/assignments/${assignment.id}/files/${f.id}/download`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                >
                  <Download className="w-5 h-5 text-primary-600" />
                  <span>{f.original_name || "Скачать файл"}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Submission status */}
        {mySubmission && (
          <div className="card mb-6 border-l-4 border-l-primary-500">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base">Ваша работа</h3>
              <StatusBadge status={mySubmission.status} />
            </div>
            {mySubmission.score !== null && mySubmission.score !== undefined && (
              <p className="text-lg font-bold text-primary-700 mb-2">
                {mySubmission.score} / {assignment.max_score} баллов
              </p>
            )}
            {mySubmission.comment && (
              <div className="bg-gray-50 rounded-xl p-4 mt-3">
                <p className="text-xs text-gray-500 mb-1 font-medium">Комментарий проверяющего</p>
                <p className="text-sm text-gray-700">{mySubmission.comment}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">Отправлено: {formatDate(mySubmission.submitted_at)}</p>

            {mySubmission.status === "revision" && (
              <p className="text-sm text-orange-600 font-medium mt-3">
                Требуется доработка. Вы можете отправить новую версию ниже.
              </p>
            )}
          </div>
        )}

        {/* Submit form */}
        {(!mySubmission || mySubmission.status === "revision") && (
          <div className="card">
            <h3 className="text-base mb-4">
              {mySubmission ? "Отправить доработанную версию" : "Отправить решение"}
            </h3>

            {(assignment.type === "text" || assignment.type === "analytical") && (
              <div className="mb-4">
                <label className="label">Текстовый ответ</label>
                <textarea
                  className="input resize-none"
                  rows={5}
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Введите ваш ответ..."
                />
              </div>
            )}

            {(assignment.type === "file" || assignment.type === "analytical") && (
              <div className="mb-4">
                <label className="label">Файл</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary-400 bg-primary-50" : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                  {file ? (
                    <p className="text-sm font-medium text-primary-700">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">Перетащите файл или нажмите для выбора</p>
                      <p className="text-xs text-gray-400 mt-1">Макс. размер: 50 МБ</p>
                    </>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || (!textAnswer && !file)}
              className="btn-primary w-full py-3.5"
            >
              {mutation.isPending ? "Отправка..." : "Отправить работу"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
