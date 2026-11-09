'use client';

import React, { useEffect, useState } from 'react';
import {
  Mail,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Smartphone,
  Monitor,
  RefreshCw,
  ChevronRight,
  Code2,
  Palette,
  Image as ImageIcon,
  Save,
  Type,
  Sliders,
  Undo2,
} from 'lucide-react';
import { Card, ModalShell } from '@/components/admin/ui/primitives';
import type { EmailBranding } from '@/lib/email/config';

type TemplateItem = {
  id: string;
  name: string;
  category: 'Orders' | 'Payments' | 'Auth' | 'System';
  description: string;
  recipientType: 'Customer' | 'Admin';
  previewSubject: string;
  isTriggerActive: boolean;
  customSubject?: string;
  customHtml?: string;
  defaultVariables?: string[];
};

type PreviewData = {
  templateId: string;
  subject: string;
  html: string;
  text: string;
};

export default function EmailTemplatesView() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [branding, setBranding] = useState<EmailBranding | null>(null);
  const [brandingDraft, setBrandingDraft] = useState<EmailBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'templates' | 'branding'>('templates');

  // Preview & Editor Modal state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [viewDevice, setViewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [editorMode, setEditorMode] = useState<'preview' | 'html'>('preview');

  // Drafts for current open template
  const [subjectDraft, setSubjectDraft] = useState('');
  const [htmlDraft, setHtmlDraft] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);

  // Sample send state
  const [sampleTo, setSampleTo] = useState('');
  const [sendingSample, setSendingSample] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const fetchTemplates = () => {
    setLoading(true);
    fetch('/api/admin/email/templates')
      .then((r) => r.json())
      .then((d) => {
        if (d.templates) setTemplates(d.templates);
        if (d.branding) {
          setBranding(d.branding);
          setBrandingDraft(d.branding);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const openEditor = async (tmpl: TemplateItem) => {
    setSelectedTemplate(tmpl);
    setSubjectDraft(tmpl.customSubject || tmpl.previewSubject);
    setHtmlDraft(tmpl.customHtml || '');
    setLoadingPreview(true);
    setPreview(null);
    setFeedback(null);
    setEditorMode('preview');

    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          templateId: tmpl.id,
          customSubject: tmpl.customSubject,
          customHtml: tmpl.customHtml,
          branding: brandingDraft || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
        if (!tmpl.customHtml) {
          setHtmlDraft(data.html || '');
        }
      } else {
        setFeedback({ tone: 'err', text: data.error || 'Failed to load preview.' });
      }
    } catch {
      setFeedback({ tone: 'err', text: 'Network error loading preview.' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const reRenderPreview = async () => {
    if (!selectedTemplate) return;
    setLoadingPreview(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          templateId: selectedTemplate.id,
          customSubject: subjectDraft,
          customHtml: htmlDraft,
          branding: brandingDraft || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPreview(data);
      } else {
        setFeedback({ tone: 'err', text: data.error || 'Failed to re-render preview.' });
      }
    } catch {
      setFeedback({ tone: 'err', text: 'Network error re-rendering preview.' });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingTemplate(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          customSubject: subjectDraft,
          customHtml: htmlDraft,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ tone: 'ok', text: 'Template changes saved successfully.' });
        fetchTemplates();
      } else {
        setFeedback({ tone: 'err', text: data.error || 'Failed to save template.' });
      }
    } catch {
      setFeedback({ tone: 'err', text: 'Network error saving template.' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!brandingDraft) return;
    setSavingBranding(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding: brandingDraft }),
      });
      const data = await res.json();
      if (res.ok) {
        setBranding(data.branding);
        setFeedback({ tone: 'ok', text: 'Email branding & styling saved successfully!' });
      } else {
        setFeedback({ tone: 'err', text: data.error || 'Failed to save branding.' });
      }
    } catch {
      setFeedback({ tone: 'err', text: 'Network error saving branding.' });
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSendSample = async () => {
    if (!selectedTemplate) return;
    setSendingSample(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/admin/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_sample',
          templateId: selectedTemplate.id,
          to: sampleTo.trim() || undefined,
          customSubject: subjectDraft.trim(),
          customHtml: htmlDraft.trim(),
          branding: brandingDraft || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ tone: 'ok', text: `Sample sent to ${data.sentTo}! Check your inbox/spam.` });
      } else {
        setFeedback({ tone: 'err', text: data.error || 'Failed to send sample.' });
      }
    } catch (err: any) {
      setFeedback({ tone: 'err', text: err?.message || 'Error sending sample.' });
    } finally {
      setSendingSample(false);
    }
  };

  const categories = ['All', 'Orders', 'Payments', 'Auth', 'System'];
  const filtered = templates.filter((t) => {
    const matchesCat = activeCategory === 'All' || t.category === activeCategory;
    const matchesSearch =
      !search.trim() ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.previewSubject.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Email Customizer & Templates
            </h1>
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
              {templates.length} Templates
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Full control over email styling, logo, brand colors, HTML body, and subject lines.
          </p>
        </div>

        {/* Tab switcher: Templates vs Branding */}
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'templates'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Templates ({templates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'branding'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            Global Branding & Logo
          </button>
        </div>
      </header>

      {/* GLOBAL BRANDING SETTINGS TAB */}
      {activeTab === 'branding' && brandingDraft && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Email Header, Colors & Logo Branding
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These styles apply dynamically across all 9 email templates automatically.
              </p>
            </div>
            <button
              type="button"
              disabled={savingBranding}
              onClick={handleSaveBranding}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {savingBranding ? 'Saving...' : 'Save Brand Settings'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Settings */}
            <div className="space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Type className="h-4 w-4 text-emerald-600" />
                Logo Configuration
              </h3>

              <div className="flex items-center gap-4 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="logoType"
                    checked={brandingDraft.logoType === 'text'}
                    onChange={() => setBrandingDraft({ ...brandingDraft, logoType: 'text' })}
                    className="accent-emerald-600"
                  />
                  Custom Stylized Text Logo
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="logoType"
                    checked={brandingDraft.logoType === 'image'}
                    onChange={() => setBrandingDraft({ ...brandingDraft, logoType: 'image' })}
                    className="accent-emerald-600"
                  />
                  Image Logo URL
                </label>
              </div>

              {brandingDraft.logoType === 'text' ? (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        First Part (White):
                      </label>
                      <input
                        type="text"
                        value={brandingDraft.logoTextPrimary}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, logoTextPrimary: e.target.value })}
                        placeholder="e.g. Bit"
                        className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-950 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Second Part (Colored):
                      </label>
                      <input
                        type="text"
                        value={brandingDraft.logoTextSecondary}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, logoTextSecondary: e.target.value })}
                        placeholder="e.g. Logic"
                        className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-950 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Second Part Accent Color:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandingDraft.logoTextSecondaryColor}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, logoTextSecondaryColor: e.target.value })}
                        className="h-8 w-12 rounded cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
                      />
                      <input
                        type="text"
                        value={brandingDraft.logoTextSecondaryColor}
                        onChange={(e) => setBrandingDraft({ ...brandingDraft, logoTextSecondaryColor: e.target.value })}
                        className="h-8 w-32 rounded border border-slate-200 bg-white px-2.5 font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Direct Image URL (PNG/SVG recommended):
                  </label>
                  <input
                    type="url"
                    value={brandingDraft.logoImageUrl}
                    onChange={(e) => setBrandingDraft({ ...brandingDraft, logoImageUrl: e.target.value })}
                    placeholder="https://yourdomain.com/logo.png"
                    className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                  />
                  {brandingDraft.logoImageUrl && (
                    <div className="mt-2.5 p-3 rounded bg-slate-900 inline-block">
                      <img src={brandingDraft.logoImageUrl} alt="Preview" className="max-h-8 max-w-40 object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Color Palette Settings */}
            <div className="space-y-4 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-indigo-600" />
                Color Palette & Theme
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Header Bar Background:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingDraft.headerBg}
                      onChange={(e) => setBrandingDraft({ ...brandingDraft, headerBg: e.target.value })}
                      className="h-8 w-10 rounded cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={brandingDraft.headerBg}
                      onChange={(e) => setBrandingDraft({ ...brandingDraft, headerBg: e.target.value })}
                      className="h-8 w-28 rounded border border-slate-200 bg-white px-2 font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Buttons / Primary Color:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={brandingDraft.primaryColor}
                      onChange={(e) => setBrandingDraft({ ...brandingDraft, primaryColor: e.target.value })}
                      className="h-8 w-10 rounded cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0.5"
                    />
                    <input
                      type="text"
                      value={brandingDraft.primaryColor}
                      onChange={(e) => setBrandingDraft({ ...brandingDraft, primaryColor: e.target.value })}
                      className="h-8 w-28 rounded border border-slate-200 bg-white px-2 font-mono text-xs dark:border-slate-800 dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Footer Support Note:
                </label>
                <input
                  type="text"
                  value={brandingDraft.footerNote}
                  onChange={(e) => setBrandingDraft({ ...brandingDraft, footerNote: e.target.value })}
                  placeholder="Need support? Contact us..."
                  className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TEMPLATES GRID TAB */}
      {activeTab === 'templates' && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Grid of Templates */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl border border-slate-200/80 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((tmpl) => (
                <Card
                  key={tmpl.id}
                  className="group relative flex flex-col justify-between overflow-hidden p-5 transition-all hover:border-slate-300 hover:shadow-md dark:hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {tmpl.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            tmpl.isTriggerActive ? 'bg-emerald-500' : 'bg-amber-400'
                          }`}
                          title={tmpl.isTriggerActive ? 'Trigger is Active' : 'Trigger is Inactive / Master OFF'}
                        />
                        <span className="text-[11px] font-medium text-slate-400">
                          {tmpl.recipientType}
                        </span>
                      </div>
                    </div>

                    <h3 className="mt-3 font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                      {tmpl.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">
                      {tmpl.description}
                    </p>

                    <div className="mt-3 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Subject: </span>
                      <span className="italic">{tmpl.customSubject || tmpl.previewSubject}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800/80">
                    <span className="text-[11px] text-slate-400">HTML + Text Editor</span>
                    <button
                      type="button"
                      onClick={() => openEditor(tmpl)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Customize & Preview
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* FULL CUSTOMIZATION & PREVIEW MODAL */}
      {selectedTemplate && (
        <ModalShell
          open={Boolean(selectedTemplate)}
          onClose={() => setSelectedTemplate(null)}
          title={`Edit: ${selectedTemplate.name}`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditorMode('preview')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    editorMode === 'preview'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Live Preview
                </button>
                <button
                  type="button"
                  onClick={() => setEditorMode('html')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                    editorMode === 'html'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Raw HTML / Body Editor
                </button>
              </div>

              {/* Device view switcher (for preview mode) */}
              {editorMode === 'preview' && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewDevice('desktop')}
                    className={`rounded p-1 text-xs ${
                      viewDevice === 'desktop' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-400'
                    }`}
                    title="Desktop (620px)"
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewDevice('mobile')}
                    className={`rounded p-1 text-xs ${
                      viewDevice === 'mobile' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100' : 'text-slate-400'
                    }`}
                    title="Mobile (380px)"
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Sample Sender input */}
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={sampleTo}
                  onChange={(e) => setSampleTo(e.target.value)}
                  placeholder="Recipient (default: your email)"
                  className="h-8 w-44 rounded-md border border-slate-200 bg-white px-2.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                />
                <button
                  type="button"
                  disabled={sendingSample}
                  onClick={handleSendSample}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-800 px-2.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900"
                >
                  <Send className="h-3 w-3" />
                  {sendingSample ? 'Sending...' : 'Send Sample'}
                </button>
                <button
                  type="button"
                  disabled={savingTemplate}
                  onClick={handleSaveTemplate}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>

            {/* Notification alert */}
            {feedback && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
                  feedback.tone === 'ok'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                }`}
              >
                {feedback.tone === 'ok' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            {/* Subject Line Field */}
            <div className="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Email Subject Line:</span>
                <span className="text-[11px] text-slate-400">Supports static & dynamic text</span>
              </div>
              <input
                type="text"
                value={subjectDraft}
                onChange={(e) => setSubjectDraft(e.target.value)}
                placeholder="Enter subject line..."
                className="h-8 w-full rounded border border-slate-200 bg-white px-2.5 font-mono text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {/* EDITOR vs PREVIEW VIEW */}
            {editorMode === 'html' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-emerald-600" />
                    In-Depth Raw HTML & Body Editor:
                  </span>
                  <button
                    type="button"
                    onClick={reRenderPreview}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Apply Changes & View Live Preview
                  </button>
                </div>
                <textarea
                  rows={20}
                  value={htmlDraft}
                  onChange={(e) => setHtmlDraft(e.target.value)}
                  placeholder="Paste or write custom HTML body..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none dark:border-slate-800 selection:bg-emerald-600 selection:text-white"
                />
              </div>
            ) : (
              /* Live Responsive Preview Frame */
              <div className="flex justify-center rounded-xl bg-slate-200/60 p-4 dark:bg-slate-950">
                {loadingPreview ? (
                  <div className="flex h-96 w-full items-center justify-center text-sm text-slate-500">
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin text-emerald-600" />
                    Rendering responsive email preview...
                  </div>
                ) : preview?.html ? (
                  <div
                    className={`overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-all dark:border-slate-700 ${
                      viewDevice === 'mobile' ? 'w-[380px]' : 'w-full max-w-[620px]'
                    }`}
                  >
                    <iframe
                      title="Email Preview"
                      srcDoc={preview.html}
                      className="h-[520px] w-full border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : (
                  <div className="py-20 text-center text-xs text-slate-500">
                    Preview not available.
                  </div>
                )}
              </div>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
