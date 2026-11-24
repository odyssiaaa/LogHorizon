"use client";

import React, { useRef, useState, useCallback, useId } from "react";
import Image from "next/image";
import { UploadCloud, X, ImageIcon, Camera, Loader2, CheckCircle2 } from "lucide-react";

export interface ImageUploaderProps {
  value?: string | null;
  onChange?: (base64: string) => void;
  values?: string[];
  onMultiChange?: (base64List: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  description?: string;
  className?: string;
  required?: boolean;
  compact?: boolean; // For chat inputs (renders as camera/image button)
  onAttachment?: (base64: string) => void;
}

export function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File bukan gambar yang valid"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const raw = event.target?.result as string;
          resolve({ dataUrl: raw, sizeKb: Math.round(file.size / 1024) });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress to webp or jpeg
        let compressed = canvas.toDataURL("image/webp", quality);
        if (!compressed.startsWith("data:image/webp")) {
          compressed = canvas.toDataURL("image/jpeg", quality);
        }

        // Calculate rough KB size of base64
        const stringLength = compressed.length - compressed.indexOf(",") - 1;
        const sizeInBytes = Math.floor(stringLength * 0.75);
        const sizeKb = Math.round(sizeInBytes / 1024);

        resolve({ dataUrl: compressed, sizeKb });
      };
      img.onerror = (e) => reject(e);
      img.src = event.target?.result as string;
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

export function ImageUploader({
  value,
  onChange,
  values = [],
  onMultiChange,
  multiple = false,
  maxFiles = 3,
  label,
  description = "Format JPG, PNG, atau WebP. Otomatis dikompresi (< 120 KB).",
  className = "",
  required = false,
  compact = false,
  onAttachment,
}: ImageUploaderProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setErrorMsg("");
      setIsCompressing(true);

      try {
        const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
        if (files.length === 0) {
          setErrorMsg("Pilih file gambar berformat JPG, PNG, atau WebP.");
          setIsCompressing(false);
          return;
        }

        if (compact && onAttachment) {
          const res = await compressImageFile(files[0]);
          onAttachment(res.dataUrl);
          setIsCompressing(false);
          return;
        }

        if (multiple && onMultiChange) {
          const availableSlots = maxFiles - values.length;
          const toProcess = files.slice(0, Math.max(0, availableSlots));
          const compressedResults = await Promise.all(
            toProcess.map((f) => compressImageFile(f))
          );
          const newUrls = compressedResults.map((r) => r.dataUrl);
          onMultiChange([...values, ...newUrls]);
        } else if (onChange) {
          const res = await compressImageFile(files[0]);
          onChange(res.dataUrl);
        }
      } catch (err) {
        console.error("Compression error:", err);
        setErrorMsg("Gagal memproses gambar. Coba gambar lain.");
      } finally {
        setIsCompressing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [compact, multiple, maxFiles, values, onChange, onMultiChange, onAttachment]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Compact Mode (for Chat message input attachment button)
  if (compact) {
    return (
      <div className="relative inline-flex items-center">
        <input
          id={inputId}
          type="file"
          ref={fileInputRef}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCompressing}
          className="p-2 rounded-none text-gray-400 hover:text-[#A78BFA] hover:bg-[#7C3AED]/20 transition"
          title="Kirim Foto / Bukti Screenshot"
        >
          {isCompressing ? (
            <Loader2 size={18} className="animate-spin text-[#7C3AED]" />
          ) : (
            <Camera size={18} />
          )}
        </button>
      </div>
    );
  }

  // Multi-upload Mode
  if (multiple) {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {label && (
          <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
            {label} {required && <span className="text-red-400">*</span>}
            <span className="text-gray-500 font-mono font-normal ml-1">
              ({values.length}/{maxFiles} foto)
            </span>
          </label>
        )}

        {/* Existing previews list */}
        {values.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {values.map((url, idx) => (
              <div
                key={idx}
                className="relative rounded-none overflow-hidden border border-slate-200 dark:border-[#2E1E45] bg-slate-100 dark:bg-[#09040F] aspect-video group"
              >
                <Image
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onMultiChange) {
                      onMultiChange(values.filter((_, i) => i !== idx));
                    }
                  }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-none bg-black/80 text-white hover:bg-rose-600 transition"
                  title="Hapus foto ini"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload dropzone if under maxFiles */}
        {values.length < maxFiles && (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-none p-4 sm:p-5 text-center cursor-pointer transition ${
              isDragging
                ? "border-[#7C3AED] bg-[#7C3AED]/15"
                : "border-slate-300 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921] hover:border-[#7C3AED] hover:bg-purple-50/50 dark:hover:bg-[#1A0E2E]"
            }`}
          >
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
            />

            {isCompressing ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
                <span className="text-xs font-mono font-medium text-purple-700 dark:text-purple-300">
                  Mengompresi gambar otomatis...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="w-8 h-8 rounded-none bg-purple-500/10 dark:bg-[#7C3AED]/20 text-purple-700 dark:text-[#A78BFA] border border-purple-500/20 dark:border-[#7C3AED]/40 flex items-center justify-center mb-0.5">
                  <UploadCloud size={16} />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-white font-display">
                  Pilih foto dari galeri / drag &amp; drop
                </p>
                <p className="text-[10px] text-slate-500 dark:text-gray-400 font-mono">{description}</p>
              </div>
            )}
          </div>
        )}

        {errorMsg && <p className="text-xs font-mono text-red-400">{errorMsg}</p>}
      </div>
    );
  }

  // Single upload Mode
  const hasValue = Boolean(value && value.trim().length > 0);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-xs font-mono font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />

      {hasValue ? (
        <div className="relative rounded-none overflow-hidden border border-slate-200 dark:border-[#2E1E45] bg-white dark:bg-[#130921] p-2.5 flex items-center gap-3">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-none overflow-hidden bg-slate-100 dark:bg-[#09040F] border border-slate-200 dark:border-[#2E1E45] shrink-0">
            <Image
              src={value!}
              alt="Pratinjau"
              fill
              className="object-cover"
              unoptimized
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={14} />
              <span>FOTO SIAP // TERKOMPRESI</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5 font-sans">
              Otomatis dioptimalkan untuk performa cepat.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-mono font-bold text-purple-700 dark:text-[#A78BFA] hover:text-purple-900 dark:hover:text-white transition"
              >
                Ganti Foto
              </button>
              <span className="text-slate-300 dark:text-[#2E1E45] text-xs">&bull;</span>
              <button
                type="button"
                onClick={() => onChange && onChange("")}
                className="text-[11px] font-mono font-bold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-0.5 transition"
              >
                <X size={12} />
                <span>Hapus Foto</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-none p-4 sm:p-6 text-center cursor-pointer transition ${
            isDragging
              ? "border-[#7C3AED] bg-[#7C3AED]/15"
              : "border-slate-300 dark:border-[#2E1E45] bg-slate-50 dark:bg-[#130921] hover:border-[#7C3AED] hover:bg-purple-50/50 dark:hover:bg-[#1A0E2E]"
          }`}
        >
          {isCompressing ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
              <span className="text-xs font-mono font-semibold text-purple-300">
                Mengompresi foto otomatis di browser...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-9 h-9 rounded-none bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40 flex items-center justify-center mb-0.5">
                <ImageIcon size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-white font-display">
                  Pilih Foto dari Galeri HP / Komputer
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-sans">
                  atau geser &amp; lepas (drag &amp; drop) file ke sini
                </p>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">{description}</p>
            </div>
          )}
        </div>
      )}

      {errorMsg && <p className="text-xs font-mono text-red-400">{errorMsg}</p>}
    </div>
  );
}
