"use client";
import { useRouter } from "next/navigation";
import { TestForm } from "@/components/test/TestForm";

export default function NewTestPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="mb-6">Новый тест</h1>
      <TestForm onSuccess={() => router.push("/admin/tests")} />
    </div>
  );
}
