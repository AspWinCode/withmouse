"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/Spinner";
import { api, getUploadUrl } from "@/lib/api";
import { ProfessionListItem } from "@/types";

export default function ProfessionsPage() {
  const [search, setSearch] = useState("");

  const { data: professions = [], isLoading } = useQuery({
    queryKey: ["professions"],
    queryFn: () => api.get<ProfessionListItem[]>("/professions").then((r) => r.data),
  });

  const filtered = professions.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.short_description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="mb-2">Каталог профессий</h1>
          <p className="text-gray-500 text-lg">Исследуй мир профессий и найди своё призвание</p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-12"
            placeholder="Поиск профессии..."
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl font-medium">Профессии не найдены</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/professions/${p.id}`}
                className="card hover:shadow-md transition-all group overflow-hidden p-0"
              >
                <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 relative overflow-hidden">
                  {p.images[0] ? (
                    <img
                      src={getUploadUrl(p.images[0].file_path)}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-primary-300 text-6xl">🎯</div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {p.title}
                  </h3>
                  {p.short_description && (
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{p.short_description}</p>
                  )}
                  <div className="flex items-center text-primary-600 text-sm font-medium">
                    Узнать подробнее
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
