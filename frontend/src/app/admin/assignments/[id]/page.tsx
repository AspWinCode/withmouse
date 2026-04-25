"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Assignment } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { AssignmentForm } from "@/components/assignment/AssignmentForm";

export default function EditAssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ["assignment-admin", id],
    queryFn: () => api.get<Assignment>(`/assignments/${id}`).then((r) => r.data),
  });

  if (isLoading) return <Spinner />;
  if (!assignment) return <div className="text-center text-gray-500 py-16">Задание не найдено</div>;

  return (
    <div>
      <Link href="/admin/assignments" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> К заданиям
      </Link>
      <h1 className="mb-6">Редактировать задание</h1>
      <AssignmentForm assignment={assignment} onSuccess={() => router.push("/admin/assignments")} />
    </div>
  );
}
