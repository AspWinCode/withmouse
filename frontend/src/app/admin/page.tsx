"use client";
import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, ClipboardList, FileText, Inbox, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { DashboardStats } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get<DashboardStats>("/admin/dashboard").then((r) => r.data),
  });

  if (isLoading) return <Spinner />;
  if (!stats) return null;

  const cards = [
    { label: "Учеников", value: stats.total_students, icon: Users, color: "bg-blue-500", href: "/admin/students" },
    { label: "Профессий", value: stats.total_professions, icon: BookOpen, color: "bg-purple-500", href: "/admin/professions" },
    { label: "Тестов", value: stats.total_tests, icon: ClipboardList, color: "bg-green-500", href: "/admin/tests" },
    { label: "Заданий", value: stats.total_assignments, icon: FileText, color: "bg-orange-500", href: "/admin/assignments" },
    { label: "Ответов всего", value: stats.total_submissions, icon: Inbox, color: "bg-pink-500", href: "/admin/submissions" },
    { label: "Ожидают проверки", value: stats.pending_submissions, icon: Clock, color: "bg-yellow-500", href: "/admin/submissions?status=submitted" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1">Дашборд</h1>
        <p className="text-gray-500">Общая статистика портала</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((c, i) => (
          <Link key={i} href={c.href} className="card hover:shadow-md transition-shadow flex items-center gap-4">
            <div className={`${c.color} p-3 rounded-xl text-white`}>
              <c.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <h3 className="text-base mb-2">Попыток тестов сегодня</h3>
        <p className="text-3xl font-bold text-primary-600">{stats.test_attempts_today}</p>
      </div>
    </div>
  );
}
