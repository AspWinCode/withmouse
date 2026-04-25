"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { User } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate, formatPhone } from "@/lib/utils";
import { Users } from "lucide-react";

export default function AdminStudentsPage() {
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: () => api.get<User[]>("/admin/students").then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1">Ученики</h1>
        <p className="text-gray-500">{students.length} зарегистрированных учеников</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Имя</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Телефон</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Статус</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Зарегистрирован</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{s.name}</td>
                <td className="px-6 py-4 text-gray-500">{formatPhone(s.phone)}</td>
                <td className="px-6 py-4">
                  <span className={`badge ${s.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {s.is_active ? "Активен" : "Заблокирован"}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{formatDate(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {students.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Учеников пока нет</p>
          </div>
        )}
      </div>
    </div>
  );
}
