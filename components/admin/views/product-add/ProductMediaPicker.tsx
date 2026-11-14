'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { Image as ImageIcon, Check, Loader2, Search, Upload } from 'lucide-react';
import type { MediaAsset } from '@/lib/admin-data';
import {
  Card,
  SegmentedTabs,
  ModalShell,
  formatFileSizeFromKB,
} from '@/components/admin/ui/primitives';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const isUnoptimizedSrc = (src: string) =>
  src.startsWith('/uploads/') || /^https?:\/\//i.test(src);

export interface ProductMediaPickerProps {
  productName: string;
  mediaAssets: MediaAsset[];
  selectedMediaUrls: string[];
  customImageUrl: string;
  mediaModalOpen: boolean;
  mediaSearch: string;
  mediaFolder: 'all' | MediaAsset['folder'];
  tempSelectedUrls: string[];
  onAddMedia?: (asset: MediaAsset) => void;
  onOpenMediaLibrary: () => void;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onCustomImageUrlChange: (value: string) => void;
  onSelectedMediaUrlsChange: (urls: string[]) => void;
  onMediaSearchChange: (value: string) => void;
  onMediaFolderChange: (value: 'all' | MediaAsset['folder']) => void;
  onToggleTempUrl: (url: string) => void;
  onClearTempSelection: () => void;
  onConfirmSelection: () => void;
}

export default function ProductMediaPicker({
  productName,
  mediaAssets,
  selectedMediaUrls,
  customImageUrl,
  mediaModalOpen,
  mediaSearch,
  mediaFolder,
  tempSelectedUrls,
  onAddMedia,
  onOpenMediaLibrary,
  onOpenModal,
  onCloseModal,
  onCustomImageUrlChange,
  onSelectedMediaUrlsChange,
  onMediaSearchChange,
  onMediaFolderChange,
  onToggleTempUrl,
  onClearTempSelection,
  onConfirmSelection,
}: ProductMediaPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const coverSrc = customImageUrl.trim() || selectedMediaUrls[0] || '';

  const handleDirectUpload = async (file: File, fromModal: boolean) => {
    setUploadError('');
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      setUploadError('Use PNG, JPG, WEBP, GIF, or AVIF (no SVG).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File exceeds 8 MB limit.');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: form,
      });
      const data = (await res.json()) as {
        url?: string;
        fileName?: string;
        sizeKB?: number;
        dimensions?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Upload failed.');
      }
      const asset: MediaAsset = {
        id: `med-${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, '') || 'Product Cover',
        fileName: data.fileName || file.name,
        folder: mediaFolder === 'all' ? 'Product Covers' : mediaFolder,
        url: data.url,
        dimensions: data.dimensions || '—',
        sizeKB: data.sizeKB || Math.max(1, Math.round(file.size / 1024)),
        mimeType: 'image/webp',
        uploadedAt: new Date().toISOString().slice(0, 10),
      };
      onAddMedia?.(asset);
      if (fromModal) {
        if (!tempSelectedUrls.includes(data.url)) {
          onToggleTempUrl(data.url);
        }
      } else {
        onSelectedMediaUrlsChange([
          data.url,
          ...selectedMediaUrls.filter((u) => u !== data.url),
        ]);
        if (customImageUrl.trim()) onCustomImageUrlChange('');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const filteredModalAssets = mediaAssets.filter((a) => {
    const matchesFolder = mediaFolder === 'all' || a.folder === mediaFolder;
    const matchesSearch =
      a.name.toLowerCase().includes(mediaSearch.toLowerCase()) ||
      a.fileName.toLowerCase().includes(mediaSearch.toLowerCase()) ||
      (a.usedByProduct || '').toLowerCase().includes(mediaSearch.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <>
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Media{selectedMediaUrls.length ? ` (${selectedMediaUrls.length})` : ''}
          </h2>
          <button
            type="button"
            onClick={onOpenMediaLibrary}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            Library
          </button>
        </div>

        <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={productName || 'Product Cover'}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
              unoptimized={isUnoptimizedSrc(coverSrc)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
              <ImageIcon className="w-8 h-8" />
              <span className="text-[11px] font-medium">No image</span>
            </div>
          )}
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-semibold">
            Cover
          </span>
        </div>

        {selectedMediaUrls.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {selectedMediaUrls.map((url, idx) => (
              <button
                key={url}
                type="button"
                onClick={() => {
                  const reordered = [url, ...selectedMediaUrls.filter((u) => u !== url)];
                  onSelectedMediaUrlsChange(reordered);
                }}
                className={`relative w-12 h-12 rounded-md overflow-hidden border shrink-0 cursor-pointer ${
                  idx === 0
                    ? 'border-emerald-600 ring-2 ring-emerald-600/30'
                    : 'border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                }`}
                title={idx === 0 ? 'Cover' : 'Set as cover'}
              >
                <Image
                  src={url}
                  alt={`Selected ${idx + 1}`}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                  unoptimized={isUnoptimizedSrc(url)}
                />
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Upload className="w-3.5 h-3.5" aria-hidden />
            )}
            <span>{uploading ? 'Uploading…' : 'Upload'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenModal}
            className="h-9 px-3 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" aria-hidden />
            <span>Library</span>
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void handleDirectUpload(file, false);
          }}
        />
        {uploadError ? (
          <p className="m-0 text-xs font-medium text-rose-600 dark:text-rose-400">
            {uploadError}
          </p>
        ) : null}

        <div>
          <label className="admin-label block mb-1.5">Image URL</label>
          <input
            type="url"
            value={customImageUrl}
            onChange={(e) => onCustomImageUrlChange(e.target.value)}
            placeholder="https://..."
            className="w-full h-9 px-3 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
          />
        </div>
      </Card>

      <ModalShell
        open={mediaModalOpen}
        onClose={onCloseModal}
        title="Media library"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SegmentedTabs
              options={[
                { value: 'all', label: 'All Files', count: mediaAssets.length },
                {
                  value: 'Product Covers',
                  label: 'Product Covers',
                  count: mediaAssets.filter((a) => a.folder === 'Product Covers').length,
                },
                {
                  value: 'Brand Icons',
                  label: 'Brand Icons',
                  count: mediaAssets.filter((a) => a.folder === 'Brand Icons').length,
                },
                {
                  value: 'Login Guides',
                  label: 'Login Guides',
                  count: mediaAssets.filter((a) => a.folder === 'Login Guides').length,
                },
              ]}
              value={mediaFolder}
              onChange={onMediaFolderChange}
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={mediaSearch}
                  onChange={(e) => onMediaSearchChange(e.target.value)}
                  placeholder="Search…"
                  className="w-full h-9 pl-8 pr-3 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              {onAddMedia && (
                <>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void handleDirectUpload(file, true);
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => modalFileInputRef.current?.click()}
                    className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </>
              )}
            </div>
          </div>

          {uploadError && (
            <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              {uploadError}
            </div>
          )}

          {filteredModalAssets.length === 0 ? (
            <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              No media files found.{onAddMedia ? ' Click Upload to add an image from your PC.' : ''}
            </div>
          ) : (
          <div className="max-h-[380px] overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {filteredModalAssets.map((asset) => {
              const selectedIdx = tempSelectedUrls.indexOf(asset.url);
              const isSelected = selectedIdx !== -1;

              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onToggleTempUrl(asset.url)}
                  className={`group text-left rounded-lg overflow-hidden border transition-all cursor-pointer flex flex-col ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-600/30 bg-emerald-50/20 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-950">
                    <Image
                      src={asset.url}
                      alt={asset.name}
                      fill
                      unoptimized={isUnoptimizedSrc(asset.url)}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {selectedIdx + 1}
                      </span>
                    )}
                    {selectedIdx === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-semibold">
                        Cover
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {asset.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 mt-0.5 truncate">
                      {asset.dimensions} · {formatFileSizeFromKB(asset.sizeKB)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="text-slate-500">
              <strong className="text-slate-900 dark:text-slate-100 font-mono">
                {tempSelectedUrls.length}
              </strong>{' '}
              selected (first = cover)
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClearTempSelection}
                className="px-3 h-9 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onConfirmSelection}
                disabled={tempSelectedUrls.length === 0}
                className="px-4 h-9 font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" aria-hidden />
                <span>Insert ({tempSelectedUrls.length})</span>
              </button>
            </div>
          </div>
        </div>
      </ModalShell>
    </>
  );
}
