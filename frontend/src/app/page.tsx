import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { ArrowRight, BookOpen, ClipboardCheck, Star, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              С мышкой по жизни
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-10 leading-relaxed">
              Профориентационный портал для школьников. Изучай профессии, проходи тесты и открывай свой путь к призванию.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/professions" className="btn bg-white text-primary-700 hover:bg-primary-50 text-base px-8 py-4">
                Смотреть профессии
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/auth/register" className="btn bg-primary-500 text-white border-2 border-primary-400 hover:bg-primary-400 text-base px-8 py-4">
                Начать бесплатно
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Как это работает?
            </h2>
            <p className="text-gray-500 text-lg">Три простых шага к выбору профессии</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: BookOpen,
                color: "bg-blue-100 text-blue-600",
                title: "Изучай профессии",
                desc: "Погружайся в мир профессий: смотри видео, читай описания, узнавай о навыках и местах работы.",
              },
              {
                icon: ClipboardCheck,
                color: "bg-green-100 text-green-600",
                title: "Проходи тесты",
                desc: "Проверяй свои знания и склонности с помощью интерактивных тестов по каждой профессии.",
              },
              {
                icon: Star,
                color: "bg-orange-100 text-orange-600",
                title: "Выполняй задания",
                desc: "Решай практические задания, загружай работы и получай обратную связь от экспертов.",
              },
            ].map((f, i) => (
              <div key={i} className="text-center p-8 rounded-2xl bg-gray-50 hover:shadow-md transition-shadow">
                <div className={`inline-flex p-4 rounded-2xl ${f.color} mb-6`}>
                  <f.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Users className="w-12 h-12 text-primary-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Готов начать?</h2>
          <p className="text-gray-500 text-lg mb-8">
            Зарегистрируйся бесплатно и начни свой путь к выбору профессии прямо сейчас
          </p>
          <Link href="/auth/register" className="btn-primary text-base px-10 py-4">
            Зарегистрироваться бесплатно
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          © 2025 «С мышкой по жизни» — Профориентационный образовательный портал
        </div>
      </footer>
    </div>
  );
}
