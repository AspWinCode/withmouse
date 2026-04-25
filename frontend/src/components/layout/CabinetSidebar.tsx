"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, BookOpen, ClipboardList, FileText, BarChart3, LogOut, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";

const links = [
  { href: "/cabinet", label: "Дашборд", icon: BarChart3, exact: true },
  { href: "/cabinet/professions", label: "Профессии", icon: BookOpen },
  { href: "/cabinet/tests", label: "Тесты", icon: ClipboardList },
  { href: "/cabinet/assignments", label: "Задания", icon: FileText },
  { href: "/cabinet/results", label: "Результаты", icon: Trophy },
  { href: "/cabinet/profile", label: "Профиль", icon: User },
];

export function CabinetSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearTokens();
    router.replace("/auth/login");
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col bg-white border-r border-gray-100 min-h-screen">
      <div className="p-6 border-b border-gray-100">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Личный кабинет</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-all"
        >
          <LogOut className="w-5 h-5" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
