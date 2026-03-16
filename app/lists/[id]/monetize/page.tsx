'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMapStore } from '@/store/useMapStore';
import { ArrowLeft, Map, Star, BadgeCheck, Copy, Share2, Check, ImageIcon, Link as LinkIcon, X, Upload } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const PRESET_PRICES = [2.99, 4.99, 9.99, 19.99];

export default function MonetizePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const lists = useMapStore((state) => state.lists);
  const updateList = useMapStore((state) => state.updateList);
  const list = lists.find((l) => l.id === id);

  const [isPremium, setIsPremium] = useState(list?.isPremium ?? false);
  const [price, setPrice] = useState<number>(list?.premiumPrice ?? 9.99);
  const [description, setDescription] = useState(list?.premiumDescription ?? '');
  const [coverUrl, setCoverUrl] = useState<string>(list?.thumbnailUrl ?? '');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [monetizationStatus, setMonetizationStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetch('/api/monetization/status')
      .then((r) => r.json())
      .then((d) => setMonetizationStatus(d.status ?? 'none'))
      .catch(() => setMonetizationStatus('none'))
      .finally(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    if (list) {
      setIsPremium(list.isPremium);
      setPrice(list.premiumPrice ?? 9.99);
      setDescription(list.premiumDescription ?? '');
      setCoverUrl(list.thumbnailUrl ?? '');
    }
  }, [list?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showUrlInput) urlInputRef.current?.focus();
  }, [showUrlInput]);

  if (!list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-slate-500">List not found.</p>
        <button onClick={() => router.push('/lists')} className="mt-4 text-blue-600 hover:underline text-sm">
          Go back to lists
        </button>
      </div>
    );
  }

  const handleRequestMonetization = async () => {
    setRequesting(true);
    try {
      const res = await fetch('/api/monetization/request', { method: 'POST' });
      if (res.ok) setMonetizationStatus('pending');
    } catch { /* ignore */ }
    setRequesting(false);
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#101622]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (monetizationStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#101622] text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101622] sticky top-0 z-50">
          <button onClick={() => router.back()} className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-center flex-1">Monetize Your List</h2>
          <div className="size-10" />
        </div>
        <main className="max-w-md mx-auto w-full px-4 py-16 text-center space-y-6">
          {monetizationStatus === 'pending' ? (
            <>
              <div className="flex justify-center">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800">
                  Pending Review
                </span>
              </div>
              <h2 className="text-2xl font-bold">Your request is under review</h2>
              <p className="text-slate-500 leading-relaxed">
                We&apos;re reviewing your monetization request. You&apos;ll be able to set up paid lists once approved.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Request Monetization Access</h2>
              <p className="text-slate-500 leading-relaxed">
                To start earning from your curated maps, you need to be approved for monetization. This helps us ensure quality and comply with payment regulations.
              </p>
              <button
                onClick={handleRequestMonetization}
                disabled={requesting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-600/20"
              >
                {requesting ? 'Submitting...' : 'Request Access'}
              </button>
              {monetizationStatus === 'rejected' && (
                <p className="text-sm text-red-500">Your previous request was not approved. You can submit a new request.</p>
              )}
            </>
          )}
        </main>
      </div>
    );
  }

  const placePhotos = list.places.filter((p) => p.photoUrl).map((p) => p.photoUrl as string);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/p/${id}` : `/p/${id}`;

  const markDirty = () => setPublished(false);

  const handleSave = async () => {
    setSaving(true);
    const update = {
      isPremium,
      isPublic: isPremium ? true : list.isPublic,
      premiumPrice: isPremium ? price : null,
      premiumDescription: isPremium ? description : '',
      thumbnailUrl: coverUrl || null,
    };
    const res = await fetch(`/api/lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? 'Failed to save. Please try again.');
      return;
    }
    updateList(id, { ...update, thumbnailUrl: update.thumbnailUrl ?? undefined });
    setPublished(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: list.title, url: shareUrl });
    } else {
      handleCopy();
    }
  };

  const confirmUrlInput = () => {
    const trimmed = urlInput.trim();
    if (trimmed) { setCoverUrl(trimmed); markDirty(); }
    setShowUrlInput(false);
    setUrlInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 1400;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setCoverUrl(dataUrl);
        markDirty();
        setUploading(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    // reset so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#101622] text-slate-900 dark:text-slate-100">
      {/* Top Nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101622] sticky top-0 z-50">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-center flex-1">Monetize Your List</h2>
        <div className="size-10" />
      </div>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6 pb-24">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold">Monetization Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm leading-relaxed">
            Turn your local expertise into a revenue stream by selling access to your curated maps.
          </p>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 shadow-sm">
          <div>
            <p className="font-bold text-base">Enable Monetization</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Start earning from your curated map lists</p>
          </div>
          <label className="relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full bg-slate-300 dark:bg-slate-700 p-0.5 has-[:checked]:bg-blue-600 transition-colors shrink-0">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isPremium}
              onChange={(e) => { setIsPremium(e.target.checked); markDirty(); }}
            />
            <div className="h-[27px] w-[27px] rounded-full bg-white shadow-md transform transition-transform peer-checked:translate-x-5" />
          </label>
        </div>

        {isPremium && (
          <>
            {/* Cover Image */}
            <div className="space-y-3">
              <p className="text-base font-bold">Cover Image</p>

              {/* Preview */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {coverUrl ? (
                  <>
                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setCoverUrl(''); markDirty(); }}
                      className="absolute top-2 right-2 flex items-center justify-center size-7 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <ImageIcon className="w-10 h-10" />
                    <p className="text-sm font-medium">No cover image set</p>
                    <p className="text-xs text-slate-400">This appears as the hero on your public page</p>
                  </div>
                )}
              </div>

              {/* Pick from place photos */}
              {placePhotos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pick from your places</p>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {placePhotos.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => { setCoverUrl(url); markDirty(); }}
                        className={`relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          coverUrl === url
                            ? 'border-blue-600 ring-2 ring-blue-600/30'
                            : 'border-transparent hover:border-blue-400'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {coverUrl === url && (
                          <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                            <Check className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload + URL actions */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {showUrlInput ? (
                <div className="flex gap-2">
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmUrlInput(); if (e.key === 'Escape') setShowUrlInput(false); }}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={confirmUrlInput}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => { setShowUrlInput(false); setUrlInput(''); }}
                    className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Processing…' : 'Upload from device'}
                  </button>
                  <button
                    onClick={() => setShowUrlInput(true)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Paste URL
                  </button>
                </div>
              )}
            </div>

            {/* Price Selection */}
            <div className="space-y-3">
              <p className="text-base font-bold">Set Price</p>
              <div className="relative">
                <select
                  value={price}
                  onChange={(e) => { setPrice(Number(e.target.value)); markDirty(); }}
                  className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 px-4 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRESET_PRICES.map((p) => (
                    <option key={p} value={p}>${p.toFixed(2)} USD</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                  <span className="material-symbols-outlined text-xl">expand_more</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {PRESET_PRICES.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPrice(p); markDirty(); }}
                    className={`flex h-10 px-5 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      price === p
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-slate-200 dark:bg-slate-800 hover:bg-blue-600/10 hover:text-blue-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    ${p.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>

            {/* Premium Description */}
            <div className="space-y-2">
              <label className="text-base font-bold">Premium Description</label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                rows={4}
                placeholder="Tell your buyers what they get: exclusive tips, hidden gems, or personalized recommendations..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Preview Badge */}
            <div className="space-y-3">
              <p className="text-base font-bold">Preview Badge</p>
              <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative size-20 rounded-2xl overflow-hidden bg-slate-300 dark:bg-slate-700">
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <Map className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="absolute top-1 right-1 bg-yellow-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star className="w-2 h-2 fill-current" /> PREMIUM
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">Map Card</span>
                </div>
                <div className="h-12 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2 bg-blue-600/10 text-blue-600 px-3 py-1.5 rounded-full">
                    <BadgeCheck className="w-4 h-4" />
                    <span className="text-sm font-bold">Premium Access</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">In-app Label</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button + inline share panel */}
        <div className="pt-4 space-y-3">
          {!published && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">publish</span>
                  {isPremium ? 'Publish Paid Map' : 'Save Settings'}
                </>
              )}
            </button>
          )}

          {published && (
            <div className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 rounded-full bg-green-500 text-white shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-300">
                    {isPremium ? 'Paid map published!' : 'Settings saved!'}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {isPremium ? 'Share the link so buyers can find your map.' : 'Your settings have been updated.'}
                  </p>
                </div>
              </div>

              {isPremium && (
                <>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
                    <span className="flex-1 text-sm text-slate-500 dark:text-slate-400 truncate font-mono">
                      {shareUrl}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-600/10 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Link
                  </button>
                </>
              )}

              <button
                onClick={() => setPublished(false)}
                className="w-full text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1 transition-colors"
              >
                Edit settings
              </button>
            </div>
          )}

          {isPremium && !published && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-500">
              MapLists takes a 30% commission on all sales.{' '}
              <span className="text-blue-600 cursor-pointer hover:underline">Learn more about our pricing.</span>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
