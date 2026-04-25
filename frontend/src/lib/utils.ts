import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SubmissionStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (match) {
    return `+${match[1]} (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
  }
  return phone;
}

export function getScorePercent(score: number, max: number): number {
  if (!max) return 0;
  return Math.round((score / max) * 100);
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "Отправлено",
  reviewing: "На проверке",
  accepted: "Принято",
  revision: "На доработку",
  rejected: "Не зачтено",
};

export const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  submitted: "bg-blue-100 text-blue-700",
  reviewing: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  revision: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
};

export const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  text: "Текстовый ответ",
  file: "Загрузка файла",
  analytical: "Аналитическое задание",
};
