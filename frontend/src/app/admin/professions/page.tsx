"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { Profession, ProfessionListItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminProfessionsPage() {
  const qc = useQueryClient();

  const { data: professions = [], isLoading } = useQuery({
    queryKey: ["admin-professions"],
    queryFn: () => api.get<ProfessionListItem[]>("/professions?published_only=false").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/professions/${id}`),
    onSuccess: () => {
      toast.success("Профессия удалена");
      qc.invalidateQueries({ queryKey: ["admin-professions"] });
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-1">Профессии</h1>
          <p className="text-gray-500">{professions.length} профессий в базе</p>
        </div>
        <Link href="/admin/professions/new" className="btn-primary">
          <Plus className="w-5 h-5" /> Добавить
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Название</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Статус</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {professions.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{p.title}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${p.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.is_published ? "Опубликовано" : "Черновик"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/professions/${p.id}`} className="btn-ghost p-2" title="Просмотр">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link href={`/admin/professions/${p.id}`} className="btn-ghost p-2" title="Редактировать">
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => confirm("Удалить профессию?") && deleteMutation.mutate(p.id)}
                      className="btn-ghost p-2 text-red-500 hover:bg-red-50"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {professions.length === 0 && (
          <p className="text-center text-gray-400 py-10">Профессий нет</p>
        )}
      </div>
    </div>
  );
}
