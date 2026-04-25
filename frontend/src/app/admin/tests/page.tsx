"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { TestListItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

export default function AdminTestsPage() {
  const qc = useQueryClient();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ["admin-tests"],
    queryFn: () => api.get<TestListItem[]>("/tests").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/tests/${id}`),
    onSuccess: () => {
      toast.success("Тест удалён");
      qc.invalidateQueries({ queryKey: ["admin-tests"] });
    },
    onError: () => toast.error("Ошибка удаления"),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-1">Тесты</h1>
          <p className="text-gray-500">{tests.length} тестов</p>
        </div>
        <Link href="/admin/tests/new" className="btn-primary">
          <Plus className="w-5 h-5" /> Создать тест
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Название</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Вопросов</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Попыток</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tests.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{t.title}</td>
                <td className="px-6 py-4 text-gray-500">{t.question_count}</td>
                <td className="px-6 py-4 text-gray-500">{t.max_attempts}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link href={`/admin/tests/${t.id}`} className="btn-ghost p-2">
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => confirm("Удалить тест?") && deleteMutation.mutate(t.id)}
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
        {tests.length === 0 && <p className="text-center text-gray-400 py-10">Тестов нет</p>}
      </div>
    </div>
  );
}
