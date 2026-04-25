"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Mouse, Eye, EyeOff } from "lucide-react";
import { authApi, saveTokens } from "@/lib/auth";

const schema = z.object({
  phone: z.string().min(10, "Введите номер телефона"),
  password: z.string().min(1, "Введите пароль"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data);
      saveTokens(res);
      toast.success(`Добро пожаловать, ${res.user.name}!`);
      if (res.user.role === "admin" || res.user.role === "reviewer") {
        router.replace("/admin");
      } else {
        router.replace("/cabinet");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Ошибка входа");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary-700 font-bold text-2xl mb-2">
            <Mouse className="w-8 h-8" />
            С мышкой по жизни
          </Link>
          <p className="text-gray-500">Войдите в свой аккаунт</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Номер телефона</label>
              <input
                {...register("phone")}
                className="input"
                placeholder="+7 (999) 999-99-99"
                type="tel"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Пароль</label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPwd ? "text" : "password"}
                  className="input pr-12"
                  placeholder="Введите пароль"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full py-3.5" disabled={isSubmitting}>
              {isSubmitting ? "Входим..." : "Войти"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Нет аккаунта?{" "}
            <Link href="/auth/register" className="text-primary-600 font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
