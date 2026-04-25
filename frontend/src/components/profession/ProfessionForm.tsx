"use client";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { Upload, Trash2 } from "lucide-react";
import { api, getUploadUrl } from "@/lib/api";
import { Profession } from "@/types";

interface Props {
  profession?: Profession;
  onSuccess: () => void;
}

type FormData = {
  title: string;
  short_description: string;
  description: string;
  what_does: string;
  skills: string;
  where_works: string;
  video_url: string;
  is_published: string;
};

export function ProfessionForm({ profession, onSuccess }: Props) {
  const qc = useQueryClient();
  const isEdit = !!profession;
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      title: profession?.title || "",
      short_description: profession?.short_description || "",
      description: profession?.description || "",
      what_does: profession?.what_does || "",
      skills: profession?.skills || "",
      where_works: profession?.where_works || "",
      video_url: profession?.video_url || "",
      is_published: String(profession?.is_published ?? 1),
    },
  });

  const onImgDrop = useCallback((files: File[]) => files[0] && setImgFile(files[0]), []);
  const onVideoDrop = useCallback((files: File[]) => files[0] && setVideoFile(files[0]), []);

  const imgDropzone = useDropzone({ onDrop: onImgDrop, accept: { "image/*": [] }, maxFiles: 1 });
  const videoDropzone = useDropzone({ onDrop: onVideoDrop, accept: { "video/*": [] }, maxFiles: 1 });

  const deleteImageMutation = useMutation({
    mutationFn: (imgId: number) => api.delete(`/professions/${profession!.id}/images/${imgId}`),
    onSuccess: () => {
      toast.success("Изображение удалено");
      qc.invalidateQueries({ queryKey: ["profession-admin", String(profession!.id)] });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      let profId = profession?.id;

      const payload = {
        ...data,
        is_published: parseInt(data.is_published),
        short_description: data.short_description || undefined,
        description: data.description || undefined,
        what_does: data.what_does || undefined,
        skills: data.skills || undefined,
        where_works: data.where_works || undefined,
        video_url: data.video_url || undefined,
      };

      if (isEdit) {
        await api.patch(`/professions/${profId}`, payload);
      } else {
        const res = await api.post<Profession>("/professions", payload);
        profId = res.data.id;
      }

      if (imgFile && profId) {
        const fd = new FormData();
        fd.append("file", imgFile);
        fd.append("order", "0");
        await api.post(`/professions/${profId}/images`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (videoFile && profId) {
        const fd = new FormData();
        fd.append("file", videoFile);
        await api.post(`/professions/${profId}/video`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      toast.success(isEdit ? "Профессия обновлена" : "Профессия создана");
      onSuccess();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Ошибка сохранения");
    }
  };

  const fields: { name: keyof FormData; label: string; multiline?: boolean }[] = [
    { name: "title", label: "Название профессии *" },
    { name: "short_description", label: "Краткое описание" },
    { name: "description", label: "Подробное описание", multiline: true },
    { name: "what_does", label: "Чем занимается специалист", multiline: true },
    { name: "skills", label: "Навыки", multiline: true },
    { name: "where_works", label: "Где работает", multiline: true },
    { name: "video_url", label: "Ссылка на видео (YouTube и др.)" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
      <div className="card space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="label">{f.label}</label>
            {f.multiline ? (
              <textarea {...register(f.name)} rows={4} className="input resize-none" />
            ) : (
              <input {...register(f.name)} className="input" />
            )}
          </div>
        ))}

        <div>
          <label className="label">Статус публикации</label>
          <select {...register("is_published")} className="input">
            <option value="1">Опубликовано</option>
            <option value="0">Черновик</option>
          </select>
        </div>
      </div>

      {/* Images */}
      <div className="card">
        <h3 className="text-base mb-4">Изображения</h3>
        {profession?.images && profession.images.length > 0 && (
          <div className="flex gap-3 flex-wrap mb-4">
            {profession.images.map((img) => (
              <div key={img.id} className="relative group">
                <img src={getUploadUrl(img.file_path)} alt="" className="w-24 h-24 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => deleteImageMutation.mutate(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          {...imgDropzone.getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            imgDropzone.isDragActive ? "border-primary-400 bg-primary-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...imgDropzone.getInputProps()} />
          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">
            {imgFile ? imgFile.name : "Добавить изображение (JPG, PNG, WEBP)"}
          </p>
        </div>
      </div>

      {/* Video */}
      <div className="card">
        <h3 className="text-base mb-4">Видео (файл)</h3>
        {profession?.video_file && (
          <video src={getUploadUrl(profession.video_file)} controls className="w-full rounded-xl mb-4 max-h-48 object-cover" />
        )}
        <div
          {...videoDropzone.getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            videoDropzone.isDragActive ? "border-primary-400 bg-primary-50" : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...videoDropzone.getInputProps()} />
          <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">
            {videoFile ? videoFile.name : "Загрузить видео (MP4, WEBM)"}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn-primary px-8" disabled={isSubmitting}>
          {isSubmitting ? "Сохранение..." : isEdit ? "Сохранить изменения" : "Создать профессию"}
        </button>
        <button type="button" onClick={onSuccess} className="btn-secondary px-6">
          Отмена
        </button>
      </div>
    </form>
  );
}
