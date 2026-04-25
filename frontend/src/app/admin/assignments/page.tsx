"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { AssignmentListItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/utils";

export default function AdminAssignmentsPage() {
  const qc = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["admin-assignments"],
    queryFn: () => api.get<AssignmentListItem[]>("/assignments").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/assignments/${id}`),
    onSuccess: () => {
      toast.success("Задание удалено");
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-1">Задания</h1>
          <p className="text-gray-500">{assignments.length} заданий</p>
        </div>
        <Link href="/admin/assignments/new" className="btn-primary">
          <Plus className="w-5 h-5" /> Создать задание
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Название</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Тип</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Макс. балл</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Статус</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assignments.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{a.title}</td>
                <td className="px-6 py-4 text-gray-500">{ASSIGNMENT_TYPE_LABELS[a.type]}</td>
                <td className="px-6 py-4 text-gray-500">{a.max_score}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${a.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {a.is_published ? "Опубликовано" : "Черновик"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/assignments/${a.id}`} className="btn-ghost p-2">
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => confirm("Удалить задание?") && deleteMutation.mutate(a.id)}
                      className="btn-ghost p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {assignments.length === 0 && <p className="text-center text-gray-400 py-10">Заданий нет</p>}
      </div>
    </div>
  );
}
