"use client";
import { CabinetSidebar } from "@/components/layout/CabinetSidebar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/Spinner";

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth(true, "student");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Пока идёт редирект — не рендерим ничего
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1 max-w-screen overflow-hidden">
        <CabinetSidebar />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
