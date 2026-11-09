'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Loader2,
  Plus,
  Copy,
  Check,
  Trash2,
  Search,
  LayoutGrid,
  List,
  Upload,
  Link2,
  ImagePlus,
} from 'lucide-react';
import { MediaAsset } from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  EmptyTableState,
  ModalShell,
  PaginationFooter,
  formatFileSizeFromKB,
} from '@/components/admin/ui/primitives';

interface MediaManagerViewProps {
  mediaAssets: MediaAsset[];
  onAddMedia: (asset: MediaAsset) => void;
  onDeleteMedia: (id: string) => void;
}

type UploadSource = 'file' | 'url';

type UploadApiResult = {
  url: string;
  fileName: string;
  mimeType: 'image/webp';
  sizeKB: number;
  dimensions: string;
  error?: string;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function isBlobPreviewUrl(url: string) {
  return url.startsWith('blob:') || url.startsWith('data:');
}

function MediaThumb({
  url,
  alt,
  sizes,
}: {
  url: string;
  alt: string;
  sizes?: string;
}) {
  if (isBlobPreviewUrl(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill
      className="object-cover"
      referrerPolicy="no-referrer"
      sizes={sizes}
      unoptimized={url.startsWith('/uploads/')}
    />
  );
}

function readImageDimensions(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(`${img.naturalWidth}×${img.naturalHeight}`);
    img.onerror = () => resolve('—');
    img.src = src;
  });
}

export default function MediaManagerView({
  mediaAssets,
  onAddMedia,
  onDeleteMedia,
}: MediaManagerViewProps) {
  const [folderFilter, setFolderFilter] = useState<'all' | MediaAsset['folder']>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showStatistics, setShowStatistics] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSource, setUploadSource] = useState<UploadSource>('file');
  const [newName, setNewName] = useState('');
  const [newFolder, setNewFolder] = useState<MediaAsset['folder']>('Product Covers');
  const [newUrl, setNewUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSizeKB, setFileSizeKB] = useState(0);
  const [fileDimensions, setFileDimensions] = useState('—');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = mediaAssets.filter((a) => {
    const matchesFolder = folderFilter === 'all' || a.folder === folderFilter;
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.usedByProduct || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  useEffect(() => setPage(1), [folderFilter, searchQuery, filteredAssets.length]);
  const pagedAssets = filteredAssets.slice((page - 1) * pageSize, page * pageSize);

  const resetUploadForm = () => {
    if (filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setNewName('');
    setNewFolder('Product Covers');
    setNewUrl('');
    setSelectedFile(null);
    setFilePreviewUrl('');
    setFileName('');
    setFileSizeKB(0);
    setFileDimensions('—');
    setUploadError('');
    setUploading(false);
    setUploadSource('file');
    setDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeUpload = () => {
    setUploadOpen(false);
    resetUploadForm();
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const applySelectedFile = async (file: File) => {
    setUploadError('');
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      setUploadError('Only PNG, JPG, WEBP, GIF, or AVIF — saved as WebP.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File exceeds 8 MB limit.');
      return;
    }

    if (filePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    const preview = URL.createObjectURL(file);
    const dims = await readImageDimensions(preview);
    const baseName = file.name.replace(/\.[^.]+$/, '');
    setSelectedFile(file);
    setFilePreviewUrl(preview);
    setFileName(file.name);
    setFileSizeKB(Math.max(1, Math.round(file.size / 1024)));
    setFileDimensions(dims);
    setNewName((prev) => prev.trim() || baseName);
    setUploadSource('file');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void applySelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void applySelectedFile(file);
  };

  const canSave =
    Boolean(newName.trim()) &&
    !uploading &&
    (uploadSource === 'file' ? Boolean(selectedFile) : Boolean(newUrl.trim()));

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) {
      setUploadError(
        uploadSource === 'file'
          ? 'Choose an image from your PC first.'
          : 'Add an image URL.',
      );
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      let saved: UploadApiResult;

      if (uploadSource === 'file' && selectedFile) {
        const form = new FormData();
        form.append('file', selectedFile);
        const res = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: form,
        });
        saved = (await res.json()) as UploadApiResult;
        if (!res.ok) throw new Error(saved.error || 'Upload failed.');
      } else {
        const res = await fetch('/api/admin/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: newUrl.trim(),
            name: newName.trim(),
          }),
        });
        saved = (await res.json()) as UploadApiResult;
        if (!res.ok) throw new Error(saved.error || 'Upload failed.');
      }

      onAddMedia({
        id: `med-${Date.now()}`,
        name: newName.trim(),
        fileName: saved.fileName,
        folder: newFolder,
        url: saved.url,
        dimensions: saved.dimensions,
        sizeKB: saved.sizeKB,
        mimeType: 'image/webp',
        uploadedAt: new Date().toISOString().slice(0, 10),
      });

      closeUpload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
      setUploading(false);
    }
  };

  const totalSizeKB = mediaAssets.reduce((sum, a) => sum + a.sizeKB, 0);
  const productCoverCount = mediaAssets.filter((a) => a.folder === 'Product Covers').length;
  const guideCount = mediaAssets.filter((a) => a.folder === 'Login Guides').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Media Library
        </h1>

        <button
          type="button"
          onClick={() => {
            resetUploadForm();
            setUploadOpen(true);
          }}
          className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          <span>Upload Media</span>
        </button>
      </div>

      <ModalShell
        open={uploadOpen}
        onClose={() => {
          if (!uploading) closeUpload();
        }}
        title="Upload Media"
        maxWidth="max-w-lg"
      >
        <form onSubmit={(e) => void handleCreateAsset(e)} className="space-y-4 text-sm">
          <div className="surface-pill-segment inline-flex items-center h-9 p-1 rounded-[10px]">
            <button
              type="button"
              onClick={() => {
                setUploadSource('file');
                setUploadError('');
              }}
              className={`h-7 px-3 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                uploadSource === 'file'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              }`}
            >
              <Upload className="w-3.5 h-3.5" aria-hidden />
              From PC
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadSource('url');
                setUploadError('');
              }}
              className={`h-7 px-3 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                uploadSource === 'url'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" aria-hidden />
              Image URL
            </button>
          </div>

          {uploadSource === 'file' ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
                dragOver
                  ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40'
              }`}
            >
              <ImagePlus
                className="w-8 h-8 mx-auto text-slate-400 mb-2"
                aria-hidden
              />
              <p className="m-0 text-sm font-medium text-slate-800 dark:text-slate-100">
                Drag & drop an image here
              </p>
              <p className="m-0 mt-1 text-xs text-slate-500">
                PNG, JPG, WEBP · saved as WebP · up to 8 MB
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 h-9 px-3.5 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 hover:border-emerald-600 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden />
                Browse files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={handleFileInput}
              />
              {filePreviewUrl ? (
                <div className="mt-4 mx-auto max-w-[220px] text-left">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                    <MediaThumb url={filePreviewUrl} alt="Preview" />
                  </div>
                  <p className="m-0 mt-2 text-[11px] font-mono text-slate-500 truncate">
                    {fileName} · {formatFileSizeFromKB(fileSizeKB)} · {fileDimensions}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="admin-label block">Image URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://cdn.example.com/cover.webp"
                className="w-full h-10 px-3 font-mono text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
              />
              {newUrl.trim() ? (
                <div className="relative aspect-[4/3] max-w-[220px] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950">
                  <MediaThumb url={newUrl.trim()} alt="URL preview" />
                </div>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="admin-label block mb-1.5">Asset name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Claude cover"
                className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="admin-label block mb-1.5">Folder</label>
              <select
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value as MediaAsset['folder'])}
                className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
              >
                <option value="Product Covers">Product Covers</option>
                <option value="Brand Icons">Brand Icons</option>
                <option value="Login Guides">Login Guides</option>
              </select>
            </div>
          </div>

          {uploadError ? (
            <p className="m-0 text-xs font-medium text-rose-600 dark:text-rose-400">
              {uploadError}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={closeUpload}
              disabled={uploading}
              className="h-9 px-3.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave || uploading}
              className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg cursor-pointer inline-flex items-center gap-1.5"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  <span>Uploading…</span>
                </>
              ) : (
                'Save to Library'
              )}
            </button>
          </div>
        </form>
      </ModalShell>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center min-w-0">
          <div className="overflow-x-auto -mx-1 px-1 scrollbar-thin">
            <SegmentedTabs
              options={[
                { value: 'all', label: 'All Files', count: mediaAssets.length },
                { value: 'Product Covers', label: 'Product Covers', count: productCoverCount },
                {
                  value: 'Brand Icons',
                  label: 'Brand Icons',
                  count: mediaAssets.filter((a) => a.folder === 'Brand Icons').length,
                },
                { value: 'Login Guides', label: 'Login Guides', count: guideCount },
              ]}
              value={folderFilter}
              onChange={setFolderFilter}
            />
          </div>

          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Stats"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file..."
              className="h-9 w-full sm:w-52 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="surface-pill-segment inline-flex items-center h-9 p-1 rounded-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-7 px-2 rounded-[6px] inline-flex items-center justify-center cursor-pointer ${
                viewMode === 'grid'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`h-7 px-2 rounded-[6px] inline-flex items-center justify-center cursor-pointer ${
                viewMode === 'table'
                  ? 'surface-segment-active text-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="Total Assets" value={mediaAssets.length} />
          <StatMetric label="Product Covers" value={productCoverCount} />
          <StatMetric label="Login Guides" value={guideCount} />
          <StatMetric label="Storage Used" value={formatFileSizeFromKB(totalSizeKB)} />
        </Card>
      )}

      {mediaAssets.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState title="No media" />
        </Card>
      ) : filteredAssets.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState
            title="No matches"
            onReset={() => {
              setFolderFilter('all');
              setSearchQuery('');
            }}
            resetLabel="Clear filters"
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-2.5">
            {pagedAssets.map((asset) => (
              <Card key={asset.id} className="overflow-hidden flex flex-col justify-between min-w-0">
                <div className="min-w-0">
                  <div className="relative aspect-[4/3] w-full bg-slate-100 dark:bg-slate-950 border-b border-slate-200/70 dark:border-slate-800">
                    <MediaThumb
                      url={asset.url}
                      alt={asset.name}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, (max-width: 1536px) 16vw, 12vw"
                    />
                    <div className="absolute top-1.5 left-1.5 max-w-[calc(100%-0.75rem)] scale-90 origin-top-left">
                      <StatusIndicator tone="emerald" label={asset.folder} />
                    </div>
                  </div>
                  <div className="px-2 sm:px-2.5 pt-2 pb-1.5 min-w-0">
                    <div className="font-display font-semibold text-[11px] sm:text-xs leading-snug text-slate-900 dark:text-slate-100 truncate">
                      {asset.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {asset.dimensions} · {formatFileSizeFromKB(asset.sizeKB)}
                    </div>
                  </div>
                </div>

                <div className="px-1.5 sm:px-2 py-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(asset.id, asset.url)}
                    className="min-h-8 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === asset.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                        <span className="hidden sm:inline">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteMedia(asset.id)}
                    className="min-h-8 min-w-8 p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md cursor-pointer inline-flex items-center justify-center"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </div>
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden">
            <PaginationFooter
              totalItems={filteredAssets.length}
              pageSize={pageSize}
              currentPage={page}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </Card>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs text-slate-500 font-medium">
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-3">Folder</th>
                  <th className="py-3 px-3">Dimensions</th>
                  <th className="py-3 px-3">Size</th>
                  <th className="py-3 px-3">Linked Product</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {pagedAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 whitespace-nowrap"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                          <MediaThumb url={asset.url} alt={asset.name} />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {asset.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <StatusIndicator tone="emerald" label={asset.folder} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {asset.dimensions}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {formatFileSizeFromKB(asset.sizeKB)}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-400">
                      {asset.usedByProduct || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(asset.id, asset.url)}
                          className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 hover:border-emerald-600 cursor-pointer"
                        >
                          {copiedId === asset.id ? 'Copied' : 'Copy URL'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMedia(asset.id)}
                          className="min-h-8 min-w-8 p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md cursor-pointer inline-flex items-center justify-center"
                          title="Delete"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationFooter
            totalItems={filteredAssets.length}
            pageSize={pageSize}
            currentPage={page}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Card>
      )}
    </div>
  );
}
