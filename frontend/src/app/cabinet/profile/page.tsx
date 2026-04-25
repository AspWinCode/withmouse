"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { authApi } from "@/lib/auth";
import { formatDate, formatPhone } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Минимум 2 символа"),
  password: z.string().optional(),
  confirm: z.string().optional(),
}).refine((d) => !d.password || d.password === d.confirm, {
  message: "Пароли не совпадают",
  path: ["confirm"],
});

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name || "" },
  });

  const onSubmit = async ({ name, password }: FormData) => {
    try {
      await authApi.updateMe({ name, ...(password ? { password } : {}) });
      toast.success("Профиль обновлён");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Ошибка");
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-1">Мой профиль</h1>
        <p className="text-gray-500">Управляйте своими данными</p>
      </div>

      <div className="max-w-lg">
        <div className="card mb-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <p className="font-bold text-lg">{user.name}</p>
            <p className="text-gray-500 text-sm">{formatPhone(user.phone)}</p>
            <p className="text-xs text-gray-400 mt-1">Зарегистрирован: {formatDate(user.created_at)}</p>
          </div>
        </div>

        <div className="card">
          <h3 className="text-base mb-6">Редактировать профиль</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Полное имя</label>
              <input {...register("name")} className="input" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Телефон</label>
              <input value={formatPhone(user.phone)} disabled className="input bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="label">Новый пароль (необязательно)</label>
              <input {...register("password")} type="password" className="input" placeholder="Оставьте пустым для сохранения текущего" />
            </div>
            <div>
              <label className="label">Повторите пароль</label>
              <input {...register("confirm")} type="password" className="input" />
              {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={isSubmitting}>
              {isSubmitting ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
