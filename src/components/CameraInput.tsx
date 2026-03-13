import { useState, useRef } from 'react';
import type { GameResult } from '../utils/types';

interface Props {
  onResult: (result: GameResult) => void;
}

export function CameraInput({ onResult }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setShowConfirm(true);
  };

  const handleConfirm = (result: GameResult) => {
    onResult(result);
    setShowConfirm(false);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = () => {
    setShowConfirm(false);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-800 rounded-2xl p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!showConfirm ? (
        <button
          onClick={handleCapture}
          className="w-full bg-slate-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-98 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          전광판 촬영
        </button>
      ) : (
        <div className="space-y-3">
          {/* 촬영 이미지 표시 */}
          {imageUrl && (
            <div className="rounded-xl overflow-hidden">
              <img src={imageUrl} alt="전광판" className="w-full h-40 object-cover" />
            </div>
          )}

          {/* 결과 선택 */}
          <div className="text-center text-white/70 text-sm">사진을 확인하고 결과를 선택하세요</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleConfirm('player')}
              className="bg-blue-600 text-white py-3 rounded-xl font-black text-lg active:scale-95 transition-transform"
            >
              P
            </button>
            <button
              onClick={() => handleConfirm('tie')}
              className="bg-green-600 text-white py-3 rounded-xl font-black text-lg active:scale-95 transition-transform"
            >
              T
            </button>
            <button
              onClick={() => handleConfirm('banker')}
              className="bg-red-600 text-white py-3 rounded-xl font-black text-lg active:scale-95 transition-transform"
            >
              B
            </button>
          </div>
          <button
            onClick={handleCancel}
            className="w-full text-slate-400 text-sm py-2"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}
