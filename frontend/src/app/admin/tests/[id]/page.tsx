"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Test } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { TestForm } from "@/components/test/TestForm";

export default function EditTestPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: test, isLoading } = useQuery({
    queryKey: ["test-admin", id],
    queryFn: () => api.get<Test>(`/tests/${id}/admin`).then((r) => r.data),
  });

  if (isLoading) return <Spinner />;
  if (!test) return <div className="text-center text-gray-500 py-16">Тест не найден</div>;

  return (
    <div>
      <Link href="/admin/tests" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> К тестам
      </Link>
      <h1 className="mb-6">Редактировать тест</h1>
      <TestForm test={test} onSuccess={() => router.push("/admin/tests")} />
    </div>
  );
}
