"use client";
import { useRouter } from "next/navigation";
import { AssignmentForm } from "@/components/assignment/AssignmentForm";

export default function NewAssignmentPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="mb-6">Новое задание</h1>
      <AssignmentForm onSuccess={() => router.push("/admin/assignments")} />
    </div>
  );
}
