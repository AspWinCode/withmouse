"use client";
import { useRouter } from "next/navigation";
import { ProfessionForm } from "@/components/profession/ProfessionForm";

export default function NewProfessionPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="mb-6">Новая профессия</h1>
      <ProfessionForm onSuccess={() => router.push("/admin/professions")} />
    </div>
  );
}
