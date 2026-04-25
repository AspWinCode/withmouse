"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, ClipboardList, FileText, Inbox, Users, LogOut, Mouse } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearTokens } from "@/lib/auth";
import { useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
  { href: "/admin/professions", label: "Профессии", icon: BookOpen },
  { href: "/admin/tests", label: "Тесты", icon: ClipboardList },
  { href: "/admin/assignments", label: "Задания", icon: FileText },
  { href: "/admin/submissions", label: "Ответы учеников", icon: Inbox },
  { href: "/admin/students", label: "Ученики", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    clearTokens();
    router.replace("/auth/login");
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col bg-gray-900 text-white min-h-screen">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Mouse className="w-6 h-6 text-primary-400" />
          <div>
            <p className="font-bold text-white text-sm">С мышкой по жизни</p>
            <p className="text-xs text-gray-400">Панель администратора</p>
          </div>
        </div>
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
                  ? "bg-primary-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-gray-800 w-full transition-all">
          <LogOut className="w-5 h-5" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
