// src/utils/uploadHandlerAdvanced.ts
import { supabase } from "../supabase/supabaseClient";
import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface UploadOptions {
  bucket?: string;          // nome do bucket
  path?: string;            // subpasta (ex: "pdfs_conteudista/")
  onProgress?: (progress: number, stage: string) => void;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

export async function uploadToSupabase(file: File, opts?: UploadOptions) {
  const bucket = opts?.bucket || "uploads";
  const filePath = `${opts?.path || ""}${Date.now()}_${file.name}`;

  opts?.onProgress?.(10, "Enviando arquivo para o Supabase Storage...");

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

  if (error) {
    console.error("Erro no upload:", error);
    opts?.onError?.(error);
    throw error;
  }

  opts?.onProgress?.(90, "Gerando URL pública...");

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  const publicURL = urlData?.publicUrl || "";

  opts?.onProgress?.(100, "Concluído!");
  opts?.onSuccess?.(publicURL);

  toast.success("Upload concluído!");

  return publicURL;
}

// ----------------------------------------------------------
// React Hook simplificado (mantém compatibilidade com os antigos componentes)
// ----------------------------------------------------------
export function useAdvancedUpload(options?: UploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, opts?: Partial<UploadOptions>) => {
      setUploading(true);
      setProgress(0);
      setStage("Iniciando...");
      setError(null);

      const merged: UploadOptions = { ...options, ...opts };

      try {
        const url = await uploadToSupabase(file, {
          ...merged,
          onProgress: (prog, stg) => {
            setProgress(prog);
            setStage(stg);
            merged.onProgress?.(prog, stg);
          },
          onSuccess: (url) => {
            setFileUrl(url);
            merged.onSuccess?.(url);
          },
          onError: (err) => {
            setError(err.message);
            merged.onError?.(err);
          },
        });

        return url;
      } catch (err: any) {
        setError(err.message);
        toast.error("Falha no upload");
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setStage("");
    setError(null);
    setFileUrl(null);
  }, []);

  return { upload, uploading, progress, stage, error, fileUrl, reset };
}
