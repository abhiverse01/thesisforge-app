'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { SUPPORTED_IMPORT_EXTENSIONS } from '@/core/importer';
import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
}

/** Build a human-readable accept string from the supported extensions. */
const ACCEPT_STRING = SUPPORTED_IMPORT_EXTENSIONS.map(e => `.${e}`).join(',');

/** Format bytes into a human-readable string. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function ImportDropZone({ onFile, loading }: Props) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validateAndForward = useCallback((file: File) => {
    setError(null);

    // Check extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !SUPPORTED_IMPORT_EXTENSIONS.includes(ext as any)) {
      setError(`Unsupported file type: .${ext ?? 'unknown'}. Supported: ${ACCEPT_STRING}`);
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${formatSize(file.size)}). Maximum: ${formatSize(MAX_FILE_SIZE)}.`);
      return;
    }

    // Check empty file
    if (file.size === 0) {
      setError('The file is empty.');
      return;
    }

    onFile(file);
  }, [onFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndForward(file);
  }, [validateAndForward]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndForward(file);
  }, [validateAndForward]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Import thesis file"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3',
        'rounded-2xl border-2 border-dashed p-10 text-center',
        'transition-all duration-200 cursor-pointer select-none',
        'border-border/40 bg-muted/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        dragging && 'border-primary/60 bg-primary/5 scale-[1.01]',
        loading  && 'pointer-events-none opacity-60',
        error    && 'border-red-300 dark:border-red-700',
      )}
    >
      {/* Hidden file input — all 5 supported formats */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Drag-active pulsing ring */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 rounded-2xl border-2 border-primary/40 pointer-events-none"
            aria-hidden="true"
          >
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-primary/20"
              animate={{ scale: [1, 1.02, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center',
        'bg-muted transition-transform duration-200',
        dragging && 'scale-110',
      )}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          className="text-muted-foreground">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>

      <div>
        <p className="text-sm font-medium text-foreground">
          {loading  ? 'Analysing your file...'
          : dragging ? 'Drop to import'
          : 'Drop a thesis file here'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          or click to browse
        </p>
      </div>

      {/* Show all 5 supported format icons */}
      <div className="flex items-center gap-3 mt-3">
        {[
          { ext: '.pdf', label: 'PDF', color: 'text-red-500' },
          { ext: '.tex', label: 'TeX', color: 'text-green-600' },
          { ext: '.docx', label: 'Word', color: 'text-blue-500' },
          { ext: '.md', label: 'MD', color: 'text-purple-500' },
          { ext: '.txt', label: 'TXT', color: 'text-muted-foreground' },
        ].map(({ ext, label, color }) => (
          <div key={ext} className="flex flex-col items-center gap-0.5">
            <div className={cn(
              "w-8 h-10 rounded border flex items-center justify-center text-[10px] font-bold",
              "bg-muted/40 border-border/40 transition-transform duration-200",
              color,
              dragging && "scale-110 border-primary/40"
            )}>
              {label}
            </div>
            <span className="text-[10px] text-muted-foreground">{ext}</span>
          </div>
        ))}
      </div>

      {/* Validation error display */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
