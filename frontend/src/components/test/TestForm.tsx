"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { api } from "@/lib/api";
import { Test, QuestionType, ProfessionListItem } from "@/types";

interface Props {
  test?: Test;
  onSuccess: () => void;
}

type OptionData = { text: string; is_correct: boolean };
type QuestionData = { type: QuestionType; text: string; points: number; options: OptionData[] };
type FormData = {
  title: string;
  description: string;
  max_attempts: number;
  profession_id: string;
  is_published: boolean;
  questions: QuestionData[];
};

export function TestForm({ test, onSuccess }: Props) {
  const qc = useQueryClient();
  const isEdit = !!test;

  const { data: professions = [] } = useQuery({
    queryKey: ["professions-select"],
    queryFn: () => api.get<ProfessionListItem[]>("/professions?published_only=false").then((r) => r.data),
  });

  const { register, control, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      title: test?.title || "",
      description: test?.description || "",
      max_attempts: test?.max_attempts || 3,
      profession_id: String(test?.profession_id || ""),
      is_published: test?.is_published ?? true,
      questions: test?.questions.map((q) => ({
        type: q.type,
        text: q.text,
        points: q.points,
        options: (q as any).options?.map((o: any) => ({ text: o.text, is_correct: o.is_correct })) || [],
      })) || [],
    },
  });

  const { fields: questionFields, append: addQuestion, remove: removeQuestion } = useFieldArray({
    control,
    name: "questions",
  });

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        profession_id: data.profession_id ? parseInt(data.profession_id) : null,
        questions: data.questions.map((q, i) => ({ ...q, order: i })),
      };

      if (isEdit) {
        // Update test info
        await api.patch(`/tests/${test.id}`, {
          title: payload.title,
          description: payload.description,
          max_attempts: payload.max_attempts,
          profession_id: payload.profession_id,
          is_published: payload.is_published,
        });
        // Delete and re-add questions
        for (const q of test.questions) {
          await api.delete(`/tests/${test.id}/questions/${q.id}`);
        }
        for (const q of payload.questions) {
          await api.post(`/tests/${test.id}/questions`, q);
        }
      } else {
        await api.post("/tests", payload);
      }

      toast.success(isEdit ? "Тест обновлён" : "Тест создан");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Ошибка сохранения");
    }
  };

  const addOption = (qIdx: number) => {
    const cur = watch(`questions.${qIdx}.options`) || [];
    setValue(`questions.${qIdx}.options`, [...cur, { text: "", is_correct: false }]);
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const cur = watch(`questions.${qIdx}.options`) || [];
    setValue(`questions.${qIdx}.options`, cur.filter((_, i) => i !== oIdx));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      {/* Basic info */}
      <div className="card space-y-4">
        <h3 className="text-base">Основная информация</h3>
        <div>
          <label className="label">Название теста *</label>
          <input {...register("title")} className="input" required />
        </div>
        <div>
          <label className="label">Описание</label>
          <textarea {...register("description")} rows={2} className="input resize-none" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Профессия</label>
            <select {...register("profession_id")} className="input">
              <option value="">— Без профессии —</option>
              {professions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Максимум попыток</label>
            <input {...register("max_attempts", { valueAsNumber: true })} type="number" min="1" className="input" />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input {...register("is_published")} type="checkbox" className="w-4 h-4 rounded" />
          <span className="text-sm font-medium text-gray-700">Опубликован</span>
        </label>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base">Вопросы ({questionFields.length})</h3>
        </div>

        {questionFields.map((field, qi) => {
          const qType = watch(`questions.${qi}.type`);
          const options = watch(`questions.${qi}.options`) || [];

          return (
            <div key={field.id} className="card">
              <div className="flex items-start gap-3 mb-4">
                <GripVertical className="w-5 h-5 text-gray-300 mt-1 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="label">Вопрос {qi + 1} *</label>
                      <input {...register(`questions.${qi}.text`)} className="input" required />
                    </div>
                    <div>
                      <label className="label">Тип</label>
                      <select {...register(`questions.${qi}.type`)} className="input">
                        <option value="single">Один ответ</option>
                        <option value="multiple">Несколько</option>
                        <option value="open">Открытый</option>
                      </select>
                    </div>
                  </div>
                  <div className="w-24">
                    <label className="label">Баллов</label>
                    <input {...register(`questions.${qi}.points`, { valueAsNumber: true })} type="number" min="1" className="input" />
                  </div>

                  {/* Options */}
                  {(qType === "single" || qType === "multiple") && (
                    <div className="space-y-2">
                      <label className="label">Варианты ответов</label>
                      {options.map((_, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input
                            {...register(`questions.${qi}.options.${oi}.is_correct`)}
                            type="checkbox"
                            className="w-4 h-4"
                            title="Правильный ответ"
                          />
                          <input
                            {...register(`questions.${qi}.options.${oi}.text`)}
                            className="input flex-1"
                            placeholder={`Вариант ${oi + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(qi, oi)}
                            className="p-2 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(qi)}
                        className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Добавить вариант
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(qi)}
                  className="p-2 text-red-400 hover:text-red-600 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => addQuestion({ type: "single", text: "", points: 1, options: [] })}
          className="btn-secondary w-full"
        >
          <Plus className="w-5 h-5" /> Добавить вопрос
        </button>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary px-8" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение..." : isEdit ? "Сохранить" : "Создать тест"}
        </button>
        <button type="button" onClick={onSuccess} className="btn-secondary px-6">
          Отмена
        </button>
      </div>
    </form>
  );
}
