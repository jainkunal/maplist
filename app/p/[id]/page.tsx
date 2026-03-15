'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Share, Bookmark, MapPin, Navigation, Map, List, User, BookmarkCheck, Share2, Download, Star, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { usePWA } from '../../components/PWAContext';
import { dbListToMapList } from '@/lib/mappers';
import type { MapList } from '@/store/useMapStore';
import FollowButton from '@/components/FollowButton';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse" />,
});

export default function PublicListPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: session, isPending: sessionPending } = useSession();

  const [list, setList] = useState<MapList | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const { canInstall, handleInstall, handleDismiss } = usePWA();
  const { toast } = useToast();
  const [savingInProgress, setSavingInProgress] = useState(false);

  // Reviews state
  type Review = { id: string; rating: number; comment: string; visited: boolean; createdAt: string; user: { name: string; image: string | null } };
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [reviewingPlaceId, setReviewingPlaceId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/lists/${id}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setList(dbListToMapList(data));
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/lists/${id}/save`)
      .then((r) => r.json())
      .then((data) => { if (data.isSaved != null) setSaved(data.isSaved); })
      .catch(() => {});
  }, [id, session]);

  // Fetch reviews for all places
  useEffect(() => {
    if (!list) return;
    list.places.forEach((place) => {
      fetch(`/api/places/${place.id}/reviews`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setReviews((prev) => ({ ...prev, [place.id]: data }));
          }
        })
        .catch(() => {});
    });
  }, [list]);

  const handleSubmitReview = async (placeId: string) => {
    if (!session) {
      router.push(`/login?callbackUrl=/p/${id}`);
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/places/${placeId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (res.ok) {
        const review = await res.json();
        setReviews((prev) => ({
          ...prev,
          [placeId]: [review, ...(prev[placeId] ?? []).filter((r) => r.user.name !== session.user.name)],
        }));
        setReviewingPlaceId(null);
        setReviewComment('');
        setReviewRating(5);
        toast('Review submitted!');
      } else {
        const data = await res.json();
        toast(data.error ?? 'Failed to submit review', 'error');
      }
    } catch {
      toast('Something went wrong', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: list?.title ?? 'MapList', url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/p/${id}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    setSavingInProgress(true);
    try {
      const res = await fetch(`/api/lists/${id}/save`, { method: next ? 'POST' : 'DELETE' });
      if (!res.ok) {
        setSaved(!next);
        toast('Failed to update save status', 'error');
      } else {
        toast(next ? 'Saved to My Lists' : 'Removed from My Lists');
      }
    } catch {
      setSaved(!next);
      toast('Something went wrong', 'error');
    } finally {
      setSavingInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-background-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">Loading list…</p>
        </div>
      </div>
    );
  }

  if (notFound || !list) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-background-dark px-4 text-center">
        <MapPin className="w-12 h-12 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold mb-2">List not found</h1>
        <p className="text-slate-500 mb-6">This list may be private or no longer exists.</p>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
        >
          Go to MapLists
        </button>
      </div>
    );
  }

  const isAuthenticated = !sessionPending && !!session;
  const sessionResolved = !sessionPending;
  const authorName = list.user?.name ?? 'Anonymous';
  const authorInitial = authorName.charAt(0).toUpperCase();

  // ─── Premium layout ───────────────────────────────────────────────────────
  if (list.isPremium) {
    return (
      <div className="relative flex min-h-screen w-full flex-col bg-slate-50 dark:bg-[#101622] overflow-x-hidden"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Top Bar */}
        <div className="flex items-center bg-slate-50/80 dark:bg-[#101622]/80 backdrop-blur-md p-4 pb-2 justify-between sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => router.back()}
            className="text-slate-900 dark:text-white flex size-12 shrink-0 items-center justify-center"
          >
            <span className="material-symbols-outlined cursor-pointer">arrow_back</span>
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
            MapLists
          </h2>
          <div className="flex w-12 items-center justify-end">
            <button
              onClick={handleShare}
              className="flex cursor-pointer items-center justify-center rounded-lg h-12 bg-transparent text-slate-900 dark:text-white min-w-0 p-0 relative"
            >
              <span className="material-symbols-outlined">share</span>
              {copied && (
                <span className="absolute -bottom-7 right-0 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                  Copied!
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero Section */}
        <div className="px-0 py-0 @container">
          <div
            className="bg-cover bg-center flex flex-col justify-end overflow-hidden min-h-80 relative"
            style={{
              backgroundImage: list.thumbnailUrl
                ? `linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 55%), url("${list.thumbnailUrl}")`
                : 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)',
            }}
          >
            <div className="flex p-6 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white w-fit mb-2 uppercase tracking-wider">
                  Premium Guide
                </span>
                <p className="text-white tracking-tight text-[32px] font-bold leading-tight">
                  {list.title}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Author Info */}
        <div className="flex p-4">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex gap-4 items-center min-w-0">
              {list.user?.image ? (
                <img
                  src={list.user.image}
                  alt={authorName}
                  className="h-14 w-14 rounded-full object-cover border-2 border-blue-600 shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold border-2 border-blue-600 shrink-0">
                  {authorInitial}
                </div>
              )}
              <div className="flex flex-col justify-center min-w-0">
                <p className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] truncate">
                  Curated by {authorName}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">
                  {list.places.length} {list.places.length === 1 ? 'place' : 'places'} inside
                </p>
              </div>
            </div>
            {isAuthenticated && list.user?.id && session?.user.id !== list.user.id && (
              <FollowButton userId={list.user.id} />
            )}
          </div>
        </div>

        {/* Paywall Card — standalone, owns the conversion */}
        <div className="px-4 pt-2 pb-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
            {/* Price banner */}
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest mb-0.5">One-time purchase</p>
                <p className="text-white text-3xl font-extrabold tracking-tight">
                  ${list.premiumPrice?.toFixed(2) ?? '—'}
                </p>
              </div>
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10">
                <span className="material-symbols-outlined text-white text-4xl">lock</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Unlock Full Access</h3>
              {list.premiumDescription && (
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-5">
                  {list.premiumDescription}
                </p>
              )}

              <div className="space-y-3 mb-6 mt-4">
                {[
                  `${list.places.length}+ curated locations`,
                  'Private insider notes & tips',
                  'Open every spot in Google Maps',
                  'Lifetime free updates',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-blue-600 shrink-0"
                      style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</span>
                  </div>
                ))}
              </div>

              <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-600/25">
                Get Access for ${list.premiumPrice?.toFixed(2) ?? '—'}
              </button>
              <p className="text-center text-xs text-slate-400 mt-3">
                Secure payment · No subscription
              </p>
            </div>
          </div>
        </div>

        {/* Blurred map — pure visual teaser, no card on top */}
        <div className="px-4 pb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Map Preview</p>
          <div className="relative rounded-xl overflow-hidden aspect-video">
            <div
              className="absolute inset-0 bg-cover bg-center grayscale blur-sm scale-105"
              style={{
                backgroundImage: list.thumbnailUrl
                  ? `url("${list.thumbnailUrl}")`
                  : 'linear-gradient(135deg,#94a3b8,#64748b)',
              }}
            />
            {/* Subtle lock badge only */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold">
                <span className="material-symbols-outlined text-base">lock</span>
                {list.places.length} places hidden
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom CTA */}
        <div
          className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-50"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-600/20 transition-all">
            Unlock Full Map — ${list.premiumPrice?.toFixed(2) ?? '—'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Free list layout ─────────────────────────────────────────────────────
  return (
    <div
      className="bg-slate-50 dark:bg-background-dark min-h-screen font-[var(--font-plus-jakarta)]"
      style={{ paddingBottom: sessionResolved ? 'calc(5rem + env(safe-area-inset-bottom))' : '0' }}
    >
      {/* Top Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href={isAuthenticated ? '/explore' : '/'}
            className="flex items-center justify-center size-10 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <Map className="w-5 h-5" />
          </Link>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">MapLists</span>
        </div>
        <button
          onClick={handleShare}
          className="flex items-center justify-center size-10 rounded-full bg-blue-600/10 text-blue-600 relative"
        >
          <Share className="w-5 h-5" />
          {copied && (
            <span className="absolute -bottom-8 right-0 bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              Copied!
            </span>
          )}
        </button>
      </nav>

      {/* Map */}
      <div className="relative w-full h-[40vh] overflow-hidden">
        <MapComponent places={list.places} />
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4">
        {/* List Header */}
        <header className="py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-blue-600 mb-3">
            <span className="material-symbols-outlined text-sm">stars</span>
            <span className="text-xs font-bold uppercase tracking-widest">Curated List</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-slate-900 dark:text-white">
            {list.title}
          </h1>
          {list.description && (
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              {list.description}
            </p>
          )}
          {/* Author row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {list.user?.image ? (
                <img src={list.user.image} alt={authorName} className="h-9 w-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {authorInitial}
                </div>
              )}
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {authorName}
              </span>
            </div>
            {sessionResolved && isAuthenticated && list.user?.id && session?.user.id !== list.user.id && (
              <FollowButton userId={list.user.id} />
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {list.places.length} {list.places.length === 1 ? 'place' : 'places'} in this list
            </p>
            {sessionResolved && isAuthenticated && (
              <button
                onClick={handleSave}
                disabled={savingInProgress}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg text-sm disabled:opacity-60 ${
                  saved
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {savingInProgress ? (
                  <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : saved ? (
                  <><BookmarkCheck className="w-5 h-5" /> Saved</>
                ) : (
                  <><Bookmark className="w-5 h-5" /> Save to My Lists</>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Places */}
        <section className="py-8 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {list.places.length} {list.places.length === 1 ? 'Place' : 'Places'} in this list
          </h3>

          {list.places.map((place, index) => (
            <React.Fragment key={place.id}>
              {index === 2 && canInstall && (
                <article className="flex flex-col md:flex-row gap-5 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900">
                  <div className="w-full md:w-40 h-40 rounded-xl shrink-0 bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/20">
                    <Share2 className="w-12 h-12 text-white/90" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                        Share links straight to MapLists
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        Install the app and it appears in your phone&apos;s share sheet — share any
                        restaurant link, Google Maps URL, or travel article and we&apos;ll add it
                        straight to your list.
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={handleInstall}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Install MapLists
                      </button>
                      <button
                        onClick={handleDismiss}
                        className="text-xs font-medium text-slate-400 hover:text-slate-600"
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                </article>
              )}
              <article className="group flex flex-col md:flex-row gap-5 p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                <div className="w-full md:w-40 h-40 rounded-xl overflow-hidden shrink-0 bg-blue-50 dark:bg-slate-800 flex items-center justify-center">
                  {place.photoUrl ? (
                    <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-blue-400">
                      <MapPin className="w-10 h-10" />
                      <span className="text-xs font-bold text-blue-500">#{index + 1}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{place.name}</h4>
                    {place.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {place.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-600 text-[10px] font-bold uppercase tracking-wider"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {place.notes && (
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{place.notes}</p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-600/10 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      Open in Maps
                    </a>
                    {place.recommendedBy && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <div className="size-5 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-bold text-blue-600">
                          {place.recommendedBy.charAt(0).toUpperCase()}
                        </div>
                        {place.recommendedBy}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (!session) { router.push(`/login?callbackUrl=/p/${id}`); return; }
                        setReviewingPlaceId(reviewingPlaceId === place.id ? null : place.id);
                        setReviewRating(5);
                        setReviewComment('');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors ml-auto"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Review
                    </button>
                  </div>

                  {/* Reviews for this place */}
                  {(reviews[place.id]?.length ?? 0) > 0 && (
                    <div className="mt-4 space-y-3">
                      {reviews[place.id].map((review) => (
                        <div key={review.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                          <div className="size-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 shrink-0">
                            {review.user.name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{review.user.name}</span>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                                ))}
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Review form */}
                  {reviewingPlaceId === place.id && (
                    <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl space-y-3">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Leave a review</p>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setReviewRating(i + 1)}
                            className="p-0.5"
                          >
                            <Star className={`w-6 h-6 transition-colors ${i < reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 hover:text-yellow-300'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience (optional)..."
                        rows={2}
                        className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSubmitReview(place.id)}
                          disabled={submittingReview}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-60"
                        >
                          {submittingReview ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                          onClick={() => setReviewingPlaceId(null)}
                          className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            </React.Fragment>
          ))}

          {list.places.length === 0 && (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No places in this list yet.</p>
            </div>
          )}
        </section>
      </main>

      {/* Sticky bottom bar — unauthenticated */}
      {sessionResolved && !isAuthenticated && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t-2 border-slate-100 dark:border-slate-800 px-5 pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <p className="text-base font-bold text-slate-900 dark:text-white mb-0.5">Want to save this list?</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Join MapLists to save and navigate on your trips.</p>
          <div className="flex gap-3">
            <Link
              href={`/login?callbackUrl=/p/${id}`}
              className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm text-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              Sign Up Free
            </Link>
            <Link
              href={`/login?callbackUrl=/p/${id}`}
              className="flex-1 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white py-3.5 rounded-xl font-bold text-sm text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      )}

      {/* Bottom Nav — authenticated */}
      {sessionResolved && isAuthenticated && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 pt-2"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Link href="/explore" className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400">
            <Map className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
          </Link>
          <Link href="/lists" className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400">
            <List className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">My Lists</span>
          </Link>
          <Link href="/profile" className="flex flex-1 flex-col items-center justify-center gap-1 py-1 text-slate-400">
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
}
