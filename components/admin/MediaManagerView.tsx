'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Copy,
  Check,
  Trash2,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { MediaAsset } from '@/lib/admin-data';
import {
  Card,
  StatMetric,
  StatusIndicator,
  SegmentedTabs,
  SwitchToggle,
  EmptyTableState,
} from '@/components/ui/primitives';

interface MediaManagerViewProps {
  mediaAssets: MediaAsset[];
  onAddMedia: (asset: MediaAsset) => void;
  onDeleteMedia: (id: string) => void;
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

  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFolder, setNewFolder] = useState<MediaAsset['folder']>('Product Covers');
  const [newUrl, setNewUrl] = useState('');

  const filteredAssets = mediaAssets.filter((a) => {
    const matchesFolder = folderFilter === 'all' || a.folder === folderFilter;
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.usedByProduct || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const seed = newName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') || 'asset';
    const finalUrl = newUrl.trim() || `https://picsum.photos/seed/${seed}/400/400`;

    onAddMedia({
      id: `med-${Date.now()}`,
      name: newName.trim(),
      fileName: `${seed}.webp`,
      folder: newFolder,
      url: finalUrl,
      dimensions: '800 × 800',
      sizeKB: Math.floor(64 + Math.random() * 60),
      mimeType: 'image/webp',
      uploadedAt: '2026-10-30',
    });

    setNewName('');
    setNewUrl('');
    setShowUploadPanel(false);
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
          onClick={() => setShowUploadPanel((prev) => !prev)}
          className="pl-3 pr-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Media</span>
        </button>
      </div>

      {showUploadPanel && (
        <Card className="p-5">
          <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Add Product Cover or Guide Image
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Asset Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Claude 3.7 Sonnet Cover"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Folder
                </label>
                <select
                  value={newFolder}
                  onChange={(e) => setNewFolder(e.target.value as MediaAsset['folder'])}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  <option value="Product Covers">Product Covers</option>
                  <option value="Brand Icons">Brand Icons</option>
                  <option value="Login Guides">Login Guides</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://picsum.photos/seed/..."
                  className="w-full px-3 py-2 font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadPanel(false)}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
              >
                Save to Library
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
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

          <SwitchToggle
            checked={showStatistics}
            onChange={setShowStatistics}
            label="Show Statistics"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file..."
              className="h-9 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:border-emerald-600 w-full sm:w-52"
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
              <LayoutGrid className="w-3.5 h-3.5" />
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
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showStatistics && (
        <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-slate-800 overflow-hidden">
          <StatMetric label="Total Assets" value={mediaAssets.length} badge="+ 3 new" />
          <StatMetric label="Product Covers" value={productCoverCount} badge="In Use" />
          <StatMetric label="Login Guides" value={guideCount} badge="Active" />
          <StatMetric label="Storage Used" value={`${totalSizeKB} KB`} badge="Optimized" />
        </Card>
      )}

      {filteredAssets.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyTableState
            title="No media files found"
            description="Reset the folder filter or search input."
            onReset={() => {
              setFolderFilter('all');
              setSearchQuery('');
            }}
          />
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-950 border-b border-slate-200/70 dark:border-slate-800">
                  <Image
                    src={asset.url}
                    alt={asset.name}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2">
                    <StatusIndicator tone="emerald" label={asset.folder} />
                  </div>
                </div>
                <div className="p-3.5">
                  <div className="font-display font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                    {asset.name}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5 truncate">
                    {asset.dimensions} · {asset.sizeKB} KB
                  </div>
                </div>
              </div>

              <div className="px-3.5 py-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(asset.id, asset.url)}
                  className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:border-emerald-600 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedId === asset.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteMedia(asset.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left border-collapse text-[13px]">
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
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 whitespace-nowrap"
                  >
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 rounded overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                          <Image
                            src={asset.url}
                            alt={asset.name}
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
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
                      {asset.sizeKB} KB
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
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
