import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ImagePlus, X, Loader2, Check, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  shape?: 'square' | 'round';
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export default function ImageUpload({
  label,
  value,
  onChange,
  folder,
  shape = 'square',
  maxSizeMB = 5,
}: ImageUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setStatus({ type: 'error', msg: `L'image dépasse ${maxSizeMB} Mo. Choisissez une image plus petite.` });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    // Validate MIME type — if browser doesn't recognize it, infer from extension
    let contentType = file.type;
    if (!contentType || !ACCEPTED_TYPES.includes(contentType)) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const extMap: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif',
      };
      contentType = extMap[ext] ?? 'image/jpeg';
    }

    setUploading(true);
    setProgress(0);
    setStatus(null);

    // Simulate progress for visual feedback since Supabase doesn't provide upload progress
    const progressInterval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 10 : p));
    }, 200);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from('restaurant-images')
      .upload(fileName, file, { contentType, upsert: false });

    clearInterval(progressInterval);
    setProgress(100);

    if (!error) {
      const { data } = supabase.storage.from('restaurant-images').getPublicUrl(fileName);
      onChange(data.publicUrl);
      setStatus({ type: 'success', msg: 'Image téléchargée avec succès' });
      setTimeout(() => setStatus(null), 3000);
    } else {
      let msg = 'Échec du téléchargement de l\'image';
      if (error.message) msg += ` : ${error.message}`;
      setStatus({ type: 'error', msg });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const shapeClass = shape === 'round' ? 'rounded-full' : 'rounded-xl';

  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>}
      <div className="flex items-center gap-3">
        <div
          className={`relative w-20 h-20 ${shapeClass} bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0`}
        >
          {value ? (
            <>
              <img src={value} alt="aperçu" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { onChange(null); setStatus(null); }}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : uploading ? (
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              <span className="text-[10px] text-slate-400">{progress}%</span>
            </div>
          ) : (
            <ImagePlus className="w-7 h-7 text-slate-300" />
          )}
          {uploading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
              <div className="h-full bg-orange-500 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Téléchargement...
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4" /> Choisir une image
              </>
            )}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => { onChange(null); setStatus(null); }}
              className="text-xs text-red-500 hover:text-red-600 font-medium text-left"
            >
              Supprimer l'image
            </button>
          )}
        </div>
      </div>
      {status && (
        <div
          className={`flex items-start gap-1.5 mt-2 text-xs font-medium ${
            status.type === 'success' ? 'text-green-600' : 'text-red-500'
          }`}
        >
          {status.type === 'success' ? (
            <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          )}
          <span className="break-words">{status.msg}</span>
        </div>
      )}
    </div>
  );
}
