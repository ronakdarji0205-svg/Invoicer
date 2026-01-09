
import React from 'react';
import { Upload, X } from 'lucide-react';

interface LogoUploaderProps {
  value: string;
  onChange: (base64: string) => void;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({ value, onChange }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 transition-colors hover:border-blue-400">
      {value ? (
        <div className="relative">
          <img src={value} alt="Logo Preview" className="h-24 w-auto object-contain rounded" />
          <button
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center">
          <Upload className="w-8 h-8 text-slate-400 mb-2" />
          <span className="text-sm font-medium text-slate-600">Upload Logo</span>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      )}
    </div>
  );
};
