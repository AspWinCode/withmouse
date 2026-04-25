"use client";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { Upload, Trash2, Download } from "lucide-react";
import { api } from "@/lib/api";
import { Assignment, ProfessionListItem } from "@/types";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/utils";

interface Props {
  assignment?: Assignment;
  onSuccess: () => void;
}

type FormData = {
  title: string;
  description: string;
  type: "text" | "file" | "analytical";
  max_score: number;
  profession_id: string;
  is_published: boolean;
};

export function AssignmentForm({ assignment, onSuccess }: Props) {
  const qc = useQueryClient();
  const isEdit = !!assignment;
  const [file, setFile] = useState<File | null>(null);

  const { data: professions = [] } = useQuery({
    queryKey: ["professions-select"],
    queryFn: () => api.get<ProfessionListItem[]>("/professions?published_only=false").then((r) => r.data),
  });

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      title: assignment?.title || "",
      description: assignment?.description || "",
      type: assignment?.type || "text",
      max_score: assignment?.max_score || 100,
      profession_id: String(assignment?.profession_id || ""),
      is_published: assignment?.is_published ?? true,
    },
  });

  const onDrop = useCallback((files: File[]) => files[0] && setFile(files[0]), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: 1 });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => api.delete(`/assignments/${assignment!.id}/files/${fileId}`),
    onSuccess: () => {
      toast.success("Файл удалён");
      qc.invalidateQueries({ queryKey: ["assignment-admin", String(assignment!.id)] });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        profession_id: data.profession_id ? parseInt(data.profession_id) : null,
      };

      let assignId = assignment?.id;

      if (isEdit) {
        await api.patch(`/assignments/${assignId}`, payload);
      } else {
        const res = await api.post<Assignment>("/assignments", payload);
        assignId = res.data.id;
      }

      if (file && assignId) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/assignments/${assignId}/files`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success(isEdit ? "Задание обновлено" : "Задание создано");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Ошибка сохранения");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="card space-y-4">
        <div>
          <label className="label">Название задания *</label>
          <input {...register("title")} className="input" required />
        </div>
        <div>
          <label className="label">Описание / условие</label>
          <textarea {...register("description")} rows={5} className="input resize-none" placeholder="Опишите условие задания..." />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Тип задания</label>
            <select {...register("type")} className="input">
              {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Максимальный балл</label>
            <input {...register("max_score", { valueAsNumber: true })} type="number" min="1" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Профессия</label>
          <select {...register("profession_id")} className="input">
            <option value="">— Без профессии —</option>
            {professions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input {...register("is_published")} type="checkbox" className="w-4 h-4 rounded" />
          <span className="text-sm font-medium text-gray-700">Опубликовано</span>
        </label>
      </div>

      {/* Files */}
      <div className="card">
        <h3 className="text-base mb-4">Материалы для учеников</h3>
        {assignment?.files && assignment.files.length > 0 && (
          <div className="space-y-2 mb-4">
            {assignment.files.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <a
                  href={`/api/assignments/${assignment.id}/files/${f.id}/download`}
                  className="flex items-center gap-2 text-sm text-primary-700 hover:underline"
                >
                  <Download className="w-4 h-4" />
                  {f.original_name || "Файл"}
                </a>
                <button
                  type="button"
                  onClick={() => deleteFileMutation.mutate(f.id)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary-400 bg-primary-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">
            {file ? file.name : "Добавить файл (Excel, PDF, Word, CSV...)"}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary px-8" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение..." : isEdit ? "Сохранить" : "Создать задание"}
        </button>
        <button type="button" onClick={onSuccess} className="btn-secondary px-6">
          Отмена
        </button>
      </div>
    </form>
  );
}
