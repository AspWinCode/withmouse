"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Profession } from "@/types";
import { Spinner } from "@/components/ui/Spinner";
import { ProfessionForm } from "@/components/profession/ProfessionForm";

export default function EditProfessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: profession, isLoading } = useQuery({
    queryKey: ["profession-admin", id],
    queryFn: () => api.get<Profession>(`/professions/${id}`).then((r) => r.data),
  });

  if (isLoading) return <Spinner />;
  if (!profession) return <div className="text-center text-gray-500 py-16">Профессия не найдена</div>;

  return (
    <div>
      <Link href="/admin/professions" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm">
        <ArrowLeft className="w-4 h-4" /> К профессиям
      </Link>
      <h1 className="mb-6">Редактировать профессию</h1>
      <ProfessionForm profession={profession} onSuccess={() => router.push("/admin/professions")} />
    </div>
  );
}
