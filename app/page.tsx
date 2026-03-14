import Link from 'next/link';
import { Map, Search, SlidersHorizontal, Navigation, Compass, Building2, BedDouble } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-slate-50 pb-24">
      {/* Header / Top Bar */}
      <header className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-md px-4 py-4 justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Map className="text-blue-600 w-8 h-8" />
          <h1 className="text-slate-900 text-xl font-extrabold tracking-tight">MapLists</h1>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 overflow-hidden">
            <span className="text-blue-600 font-bold text-sm">ML</span>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="px-4 pt-6 pb-2 max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-1 mb-6">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Find your next <span className="text-blue-600">adventure.</span></h2>
          <p className="text-slate-500 font-medium">Discover curated maps from around the world.</p>
        </div>
        
        <label className="group flex flex-col w-full relative">
          <div className="flex w-full items-center rounded-xl h-14 bg-white border border-slate-200 focus-within:border-blue-600/50 focus-within:ring-2 focus-within:ring-blue-600/20 transition-all duration-300 shadow-sm">
            <div className="text-slate-400 flex items-center justify-center pl-4">
              <Search className="w-5 h-5" />
            </div>
            <input 
              className="form-input flex w-full border-none bg-transparent focus:outline-0 focus:ring-0 h-full placeholder:text-slate-400 px-3 text-base font-medium" 
              placeholder="Search cities, countries, or list names..." 
            />
            <div className="pr-4">
              <SlidersHorizontal className="text-slate-400 w-5 h-5" />
            </div>
          </div>
        </label>
      </section>

      {/* Categories / Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto no-scrollbar max-w-5xl mx-auto w-full">
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-blue-600 px-5 shadow-lg shadow-blue-600/20 text-white">
          <Compass className="w-5 h-5" />
          <p className="text-sm font-semibold">Explore All</p>
        </button>
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white px-5 border border-slate-200 hover:border-blue-600/30 transition-colors text-slate-700">
          <Navigation className="w-5 h-5 text-slate-500" />
          <p className="text-sm font-semibold">Nearby</p>
        </button>
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white px-5 border border-slate-200 hover:border-blue-600/30 transition-colors text-slate-700">
          <Building2 className="w-5 h-5 text-slate-500" />
          <p className="text-sm font-semibold">Urban</p>
        </button>
        <button className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full bg-white px-5 border border-slate-200 hover:border-blue-600/30 transition-colors text-slate-700">
          <BedDouble className="w-5 h-5 text-slate-500" />
          <p className="text-sm font-semibold">Stay</p>
        </button>
      </div>

      {/* Trending Maps Section */}
      <section className="mt-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between px-4 mb-4">
          <h2 className="text-xl font-bold text-slate-900">Trending Maps</h2>
          <button className="text-blue-600 text-sm font-bold">See all</button>
        </div>
        
        <div className="flex gap-4 px-4 overflow-x-auto no-scrollbar pb-4">
          {/* Trending Card 1 */}
          <div className="min-w-[280px] w-[280px] group cursor-pointer">
            <div className="relative h-[380px] w-full rounded-2xl overflow-hidden mb-3 bg-slate-200">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent z-10"></div>
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="flex gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase rounded leading-none">Popular</span>
                  <span className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded leading-none">Coastal</span>
                </div>
                <h3 className="text-white text-xl font-extrabold mb-1">Hidden Gems of Bali</h3>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Navigation className="w-4 h-4" />
                  <span>Indonesia</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trending Card 2 */}
          <div className="min-w-[280px] w-[280px] group cursor-pointer">
            <div className="relative h-[380px] w-full rounded-2xl overflow-hidden mb-3 bg-slate-200">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent z-10"></div>
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="flex gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase rounded leading-none">New</span>
                  <span className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded leading-none">Urban</span>
                </div>
                <h3 className="text-white text-xl font-extrabold mb-1">Cyber Tokyo Guide</h3>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Navigation className="w-4 h-4" />
                  <span>Tokyo, Japan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="mt-8 px-4 max-w-5xl mx-auto w-full">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">Have a list of places?</h3>
          <p className="text-slate-600 mb-6">Turn your text notes, WhatsApp messages, or Reddit finds into a beautiful interactive map.</p>
          <Link href="/create" className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
            <Map className="w-5 h-5" />
            Create Your Map
          </Link>
        </div>
      </section>
    </div>
  );
}
