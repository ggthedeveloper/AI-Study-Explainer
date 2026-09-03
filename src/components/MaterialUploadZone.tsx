import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  X,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Maximize2,
  BookOpen
} from 'lucide-react';
import { UploadedMaterialFile } from '../types';
import { SAMPLE_STUDY_MATERIALS } from '../utils/sampleData';

interface MaterialUploadZoneProps {
  files: UploadedMaterialFile[];
  onFilesChange: (files: UploadedMaterialFile[]) => void;
  onAnalyze: (notes: string) => void;
  isAnalyzing: boolean;
  onLoadSample: (sampleId: string) => void;
}

export const MaterialUploadZone: React.FC<MaterialUploadZoneProps> = ({
  files,
  onFilesChange,
  onAnalyze,
  isAnalyzing,
  onLoadSample,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [studentNotes, setStudentNotes] = useState('');
  const [previewModalUrl, setPreviewModalUrl] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const SUPPORTED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'application/pdf',
  ];
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFileList = (incomingFiles: FileList | File[]) => {
    setErrorMessage(null);
    const newFiles: UploadedMaterialFile[] = [];

    Array.from(incomingFiles).forEach((file) => {
      // Validate type
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

      if (!isPdf && !isImg) {
        setErrorMessage(`"${file.name}" is not a supported format. Please upload PNG, JPG, JPEG, WEBP, or PDF.`);
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`"${file.name}" exceeds the 25MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        const fileObj: UploadedMaterialFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
          base64: base64Data,
          previewUrl: isImg ? base64Data : undefined,
        };

        onFilesChange([...files, fileObj]);
      };
      reader.onerror = () => {
        setErrorMessage(`Failed to read "${file.name}". Please try again.`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
      e.target.value = ''; // Reset input to allow re-uploading same file if deleted
    }
  };

  const removeFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const clearAllFiles = () => {
    onFilesChange([]);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-5">
      {/* Upload Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Upload Study Material
        </h2>
      </div>

      {/* Main Drag-and-Drop Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-7 text-center cursor-pointer transition-all duration-150 group ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[1.005]'
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-slate-900/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          id="study-material-file-input"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <UploadCloud className="w-5 h-5" />
          </div>

          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
                Click to browse
              </span>{' '}
              or drag & drop files
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              PDF, PNG, JPG (up to 25 MB)
            </p>
          </div>
        </div>
      </div>

      {/* Error Message Toast/Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Upload Notice: </span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploaded Files Preview Grid */}
      {files.length > 0 && (
        <div className="space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Uploaded Materials ({files.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={clearAllFiles}
              className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              Remove all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {files.map((file) => {
              const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                >
                  {/* Thumbnail / Icon */}
                  {isPdf ? (
                    <div className="w-12 h-12 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex flex-col items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                      <span className="text-[9px] font-bold mt-0.5">PDF</span>
                    </div>
                  ) : (
                    <div
                      onClick={() => setPreviewModalUrl({ url: file.base64, name: file.name })}
                      className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 relative shrink-0 cursor-pointer group/img"
                    >
                      <img
                        src={file.base64}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Maximize2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span className="uppercase font-mono text-[10px]">
                        {isPdf ? 'PDF Document' : 'Image'}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    title="Remove file"
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition-colors shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Optional Student Context / Focus Input */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            <label
              htmlFor="student-notes-input"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Notes (optional):
            </label>
            <input
              id="student-notes-input"
              type="text"
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              placeholder="e.g. Focus on Question 2..."
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              id="analyze-material-btn"
              disabled={isAnalyzing}
              onClick={() => onAnalyze(studentNotes)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing & Solving...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze & Solve</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Instant Sample Materials */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Sample Papers
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_STUDY_MATERIALS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => onLoadSample(sample.id)}
              className="p-3 text-left rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-all shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {sample.subject}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {sample.format}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                {sample.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {previewModalUrl && (
        <div
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {previewModalUrl.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-950 rounded-xl">
              <img
                src={previewModalUrl.url}
                alt={previewModalUrl.name}
                className="max-h-[65vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
