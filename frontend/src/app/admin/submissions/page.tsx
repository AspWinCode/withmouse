"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { SubmissionAdmin, SubmissionStatus } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, SUBMISSION_STATUS_LABELS } from "@/lib/utils";
import Link from "next/link";
import { Eye } from "lucide-react";

const statuses: (SubmissionStatus | "")[] = ["", "submitted", "reviewing", "accepted", "revision", "rejected"];

export default function AdminSubmissionsPage() {
  const [status, setStatus] = useState<SubmissionStatus | "">("");
  const qc = useQueryClient();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-submissions", status],
    queryFn: () =>
      api.get<SubmissionAdmin[]>(`/submissions${status ? `?status=${status}` : ""}`).then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="mb-1">Ответы учеников</h1>
          <p className="text-gray-500">{submissions.length} работ</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
              status === s
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s ? SUBMISSION_STATUS_LABELS[s] : "Все"}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Ученик</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Задание</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Дата</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Статус</th>
              <th className="text-left px-6 py-4 font-medium text-gray-500">Балл</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium">{s.student_name}</p>
                  <p className="text-gray-400 text-xs">{s.student_phone}</p>
                </td>
                <td className="px-6 py-4 max-w-[200px]">
                  <p className="truncate">{s.assignment_title}</p>
                </td>
                <td className="px-6 py-4 text-gray-500">{formatDate(s.submitted_at)}</td>
                <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                <td className="px-6 py-4">
                  {s.score !== null && s.score !== undefined ? (
                    <span className="font-medium">{s.score} / {s.assignment_max_score}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/admin/submissions/${s.id}`} className="btn-ghost p-2">
                    <Eye className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && (
          <p className="text-center text-gray-400 py-10">Работ нет</p>
        )}
      </div>
    </div>
  );
}
