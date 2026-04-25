"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { api, getUploadUrl } from "@/lib/api";
import { ProfessionListItem } from "@/types";
import { Spinner } from "@/components/ui/Spinner";

export default function CabinetProfessionsPage() {
  const { data: professions = [], isLoading } = useQuery({
    queryKey: ["professions"],
    queryFn: () => api.get<ProfessionListItem[]>("/professions").then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1">Профессии</h1>
        <p className="text-gray-500">Изучай профессии и открывай тесты и задания</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {professions.map((p) => (
          <Link key={p.id} href={`/professions/${p.id}`} className="card hover:shadow-md transition-shadow group overflow-hidden p-0">
            <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden relative">
              {p.images[0] ? (
                <img src={getUploadUrl(p.images[0].file_path)} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="flex items-center justify-center h-full text-5xl">🎯</div>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-bold mb-1 group-hover:text-primary-600 transition-colors">{p.title}</h3>
              {p.short_description && <p className="text-sm text-gray-500 line-clamp-2 mb-3">{p.short_description}</p>}
              <span className="text-primary-600 text-sm font-medium inline-flex items-center gap-1">
                Подробнее <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
