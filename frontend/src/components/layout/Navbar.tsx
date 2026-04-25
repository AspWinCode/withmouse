"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Mouse } from "lucide-react";
import { clearTokens, isAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const auth = isAuthenticated();

  const links = [
    { href: "/", label: "Главная" },
    { href: "/professions", label: "Профессии" },
  ];

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary-700 text-lg">
            <Mouse className="w-6 h-6" />
            <span className="hidden sm:block">С мышкой по жизни</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary-600",
                  pathname === l.href ? "text-primary-600" : "text-gray-600"
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {auth ? (
              <>
                <Link href="/cabinet" className="btn-secondary py-2 px-4 text-sm">
                  Личный кабинет
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost py-2 px-4 text-sm">
                  Войти
                </Link>
                <Link href="/auth/register" className="btn-primary py-2 px-4 text-sm">
                  Регистрация
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white py-4 px-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block text-sm font-medium text-gray-700 py-2"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {auth ? (
            <Link href="/cabinet" className="btn-primary w-full" onClick={() => setOpen(false)}>
              Личный кабинет
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="btn-secondary w-full" onClick={() => setOpen(false)}>
                Войти
              </Link>
              <Link href="/auth/register" className="btn-primary w-full" onClick={() => setOpen(false)}>
                Регистрация
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
