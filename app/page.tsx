import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function SplashPage() {
  return (
    <div className="relative flex h-screen w-full flex-col bg-background-dark overflow-hidden">
      {/* Full-bleed background image */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-center bg-no-repeat bg-cover"
          style={{
            backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuA9IWLyGfIyx5Bn1ryMnpyBYGNts-6giMorpLCY--9rSbJ2OVCAjy-xBZQ75-Pph4CVaKIcFxIt8afo43kphmO9O1Ue-HGDtdQOQi9sAxKA9XYYcQ7UFhvRJrjf0VGCeFxL8wQziMZUVwuZuhyq6yLby5AAiQeKpg1_zT6G1qdW_N9ERlm3c6JkTOoLCGe3A60eV42b_7gJYjs8LmilVS7A5JVZaQCDPQZHB87RlMT1ETFko2ttsW_oCP9qeMsNBaNGKBp4taZI_RNS")`,
          }}
        />
        <div className="absolute inset-0 premium-gradient" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col h-full w-full max-w-2xl mx-auto px-6 pb-16 pt-12 text-center justify-between">
        {/* Magazine-style indicator */}
        <div className="flex justify-center items-center gap-2 opacity-80">
          <span className="w-8 h-px bg-slate-100/40" />
          <span className="text-[10px] uppercase tracking-[0.4em] text-slate-100 font-medium">
            Issue 01 • The Discovery
          </span>
          <span className="w-8 h-px bg-slate-100/40" />
        </div>

        <div className="flex flex-col items-center">
          {/* Main Heading */}
          <h1 className="text-slate-100 font-serif italic text-6xl md:text-8xl tracking-tight leading-none mb-4">
            MapLists
          </h1>
          {/* Subtext */}
          <div className="flex items-center gap-4">
            <div className="h-px w-12 bg-primary" />
            <p className="text-slate-200 text-lg md:text-xl font-light tracking-widest uppercase">
              Curate your world.
            </p>
            <div className="h-px w-12 bg-primary" />
          </div>
        </div>

        {/* Call to Action */}
        <div className="flex flex-col gap-8 items-center">
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed font-light">
            Discover, organize, and share the world's most beautiful destinations through curated
            collections.
          </p>

          <Link
            href="/login"
            className="group flex min-w-[240px] items-center justify-between overflow-hidden rounded-full h-14 pl-8 pr-2 bg-slate-100 hover:bg-white text-background-dark transition-all duration-300 shadow-2xl"
          >
            <span className="text-base font-bold uppercase tracking-widest">Get Started</span>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-5 h-5" />
            </div>
          </Link>

          {/* Page indicators */}
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-100/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-100/20" />
          </div>
        </div>
      </div>

      {/* Corner Decoration */}
      <div className="absolute bottom-6 left-6 z-10 hidden md:block">
        <span
          className="text-[10px] text-slate-400 font-light tracking-[0.2em] uppercase"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Boutique Travel Concierge
        </span>
      </div>
    </div>
  );
}
