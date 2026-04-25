"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, MapPin, Wrench, User as UserIcon } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/Spinner";
import { api, getUploadUrl } from "@/lib/api";
import { Profession, TestListItem, AssignmentListItem } from "@/types";
import { ASSIGNMENT_TYPE_LABELS } from "@/lib/utils";

export default function ProfessionPage() {
  const { id } = useParams<{ id: string }>();
  const [activeImage, setActiveImage] = useState(0);

  const { data: profession, isLoading } = useQuery({
    queryKey: ["profession", id],
    queryFn: () => api.get<Profession>(`/professions/${id}`).then((r) => r.data),
  });

  const { data: tests = [] } = useQuery({
    queryKey: ["tests", { profession_id: id }],
    queryFn: () =>
      api.get<TestListItem[]>(`/tests?profession_id=${id}`).then((r) => r.data).catch(() => []),
    enabled: !!id,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", { profession_id: id }],
    queryFn: () =>
      api.get<AssignmentListItem[]>(`/assignments?profession_id=${id}`).then((r) => r.data).catch(() => []),
    enabled: !!id,
  });

  if (isLoading) return <div className="min-h-screen"><Navbar /><Spinner /></div>;
  if (!profession) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="p-8 text-center text-gray-500">Профессия не найдена</div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/professions" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Все профессии
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* Gallery */}
          <div>
            {profession.images.length > 0 ? (
              <div>
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100 mb-3">
                  <img
                    src={getUploadUrl(profession.images[activeImage]?.file_path)}
                    alt={profession.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                {profession.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {profession.images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImage(i)}
                        className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                          i === activeImage ? "border-primary-500" : "border-transparent"
                        }`}
                      >
                        <img src={getUploadUrl(img.file_path)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-7xl">
                🎯
              </div>
            )}

            {(profession.video_url || profession.video_file) && (
              <div className="mt-4">
                {profession.video_file ? (
                  <video controls className="w-full rounded-2xl">
                    <source src={getUploadUrl(profession.video_file)} />
                  </video>
                ) : (
                  <a
                    href={profession.video_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl text-red-700 hover:bg-red-100 transition-colors font-medium"
                  >
                    <Play className="w-6 h-6" />
                    Смотреть видео о профессии
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="mb-4">{profession.title}</h1>
            {profession.short_description && (
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">{profession.short_description}</p>
            )}
            {profession.description && (
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                {profession.description}
              </div>
            )}
          </div>
        </div>

        {/* Blocks */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {profession.what_does && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-xl"><UserIcon className="w-5 h-5 text-blue-600" /></div>
                <h3 className="text-base">Чем занимается</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{profession.what_does}</p>
            </div>
          )}
          {profession.skills && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-xl"><Wrench className="w-5 h-5 text-green-600" /></div>
                <h3 className="text-base">Навыки</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{profession.skills}</p>
            </div>
          )}
          {profession.where_works && (
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-xl"><MapPin className="w-5 h-5 text-orange-600" /></div>
                <h3 className="text-base">Где работает</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{profession.where_works}</p>
            </div>
          )}
        </div>

        {tests.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4">Тесты по профессии</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {tests.map((t) => (
                <Link key={t.id} href={`/cabinet/tests/${t.id}`} className="card hover:shadow-md transition-shadow">
                  <h3 className="text-base mb-2">{t.title}</h3>
                  <p className="text-sm text-gray-500">Вопросов: {t.question_count} · Попытки: {t.max_attempts}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {assignments.length > 0 && (
          <div>
            <h2 className="mb-4">Задания</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {assignments.map((a) => (
                <Link key={a.id} href={`/cabinet/assignments/${a.id}`} className="card hover:shadow-md transition-shadow">
                  <h3 className="text-base mb-2">{a.title}</h3>
                  <p className="text-sm text-gray-500">{ASSIGNMENT_TYPE_LABELS[a.type]} · Макс. балл: {a.max_score}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
