import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Compass,
  MapPin,
  Calendar,
  ShieldCheck,
  CreditCard,
  UtensilsCrossed,
  Map,
  Gem,
  CheckCircle2,
  Users
} from 'lucide-react';
import QuickSearchForm from '../components/QuickSearchForm';

export const Home = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 text-white min-h-[580px] sm:min-h-[640px] flex items-center">
        {/* Background Photograph */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=85"
            alt="Scenic mountain traveler landscape"
            className="w-full h-full object-cover object-center opacity-40 mix-blend-overlay"
          />
          {/* Subtle gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md text-blue-300 text-xs sm:text-sm font-semibold animate-pulse-slow">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI-Powered Travel Planning</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Your Next Journey <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-sky-300">
                  Starts Here
                </span>
              </h1>

              {/* Subheading */}
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Plan smarter, travel better. Get personalized itineraries, places, hotels, restaurants and routes — all in one place with the power of AI.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/create-trip"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all active:scale-95"
                >
                  <span>Plan Your Trip</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm sm:text-base backdrop-blur-md border border-white/20 transition-all"
                >
                  <span>Explore Destinations</span>
                </Link>
              </div>

            </div>

            {/* Right Artistic Script (matching reference image) */}
            <div className="lg:col-span-4 hidden lg:flex flex-col items-end justify-center">
              <div className="text-right space-y-1">
                <p className="font-handwriting text-4xl text-amber-200/90 tracking-wide drop-shadow-md">
                  Discover
                </p>
                <p className="font-handwriting text-5xl text-white/90 tracking-wide drop-shadow-md">
                  Explore
                </p>
                <p className="font-handwriting text-6xl text-sky-200/90 tracking-wide drop-shadow-md">
                  Experience ~
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. FLOATING QUICK-TRIP SEARCH FORM */}
      <section className="px-4 sm:px-6 lg:px-8">
        <QuickSearchForm />
      </section>

      {/* 3. FEATURE HIGHLIGHTS (Screen 1 Feature Badges) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">AI Personalized</h4>
              <p className="text-[11px] text-slate-500">Itineraries</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Budget Friendly</h4>
              <p className="text-[11px] text-slate-500">Planning in ₹</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center flex-shrink-0">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Hotel & Dining</h4>
              <p className="text-[11px] text-slate-500">Suggestions</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Interactive Maps</h4>
              <p className="text-[11px] text-slate-500">& Day Routes</p>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Gem className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Discover</h4>
              <p className="text-[11px] text-slate-500">Hidden Gems</p>
            </div>
          </div>

        </div>
      </section>

      {/* 4. POPULAR DESTINATIONS PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Explore India
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Featured Destinations
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Top curated locations ready for instant AI itinerary generation.
            </p>
          </div>

          <Link
            to="/explore"
            className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Destination 1: Manali */}
          <Link
            to="/itinerary"
            className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80"
                alt="Manali"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute bottom-3 left-3 bg-white/95 px-2 py-0.5 rounded-md text-xs font-bold text-slate-800">
                ⭐ 4.8
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Manali
              </h3>
              <p className="text-xs text-slate-500">Himachal Pradesh</p>
              <div className="flex gap-1 mt-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mountains</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Adventure</span>
              </div>
            </div>
          </Link>

          {/* Destination 2: Goa */}
          <Link
            to="/explore"
            className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80"
                alt="Goa"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute bottom-3 left-3 bg-white/95 px-2 py-0.5 rounded-md text-xs font-bold text-slate-800">
                ⭐ 4.7
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Goa
              </h3>
              <p className="text-xs text-slate-500">Arabian Sea Coast</p>
              <div className="flex gap-1 mt-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Beaches</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Nightlife</span>
              </div>
            </div>
          </Link>

          {/* Destination 3: Udaipur */}
          <Link
            to="/explore"
            className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=800&q=80"
                alt="Udaipur"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute bottom-3 left-3 bg-white/95 px-2 py-0.5 rounded-md text-xs font-bold text-slate-800">
                ⭐ 4.6
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Udaipur
              </h3>
              <p className="text-xs text-slate-500">Rajasthan</p>
              <div className="flex gap-1 mt-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Lakes</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Heritage</span>
              </div>
            </div>
          </Link>

          {/* Destination 4: Kerala */}
          <Link
            to="/explore"
            className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              <img
                src="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80"
                alt="Kerala"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute bottom-3 left-3 bg-white/95 px-2 py-0.5 rounded-md text-xs font-bold text-slate-800">
                ⭐ 4.7
              </span>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Kerala
              </h3>
              <p className="text-xs text-slate-500">God's Own Country</p>
              <div className="flex gap-1 mt-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Backwaters</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Nature</span>
              </div>
            </div>
          </Link>

        </div>
      </section>

      {/* 5. HOW IT WORKS */}
      <section className="bg-white border-y border-slate-200/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Seamless 3-Step Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              How TripPlanner Works
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              From your travel dream to a structured, day-wise reality in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3 p-6 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-md shadow-blue-500/20">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Set Preferences & Budget</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Choose your destination, travel dates, travelers, INR budget limit, and personal interests.
              </p>
            </div>

            <div className="text-center space-y-3 p-6 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-md shadow-indigo-500/20">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">AI Generates Day Plan</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Gemini Generative AI builds a timeline with optimized visit hours, costs, hotels, and top bistros.
              </p>
            </div>

            <div className="text-center space-y-3 p-6 rounded-2xl bg-slate-50/70 border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-md shadow-teal-500/20">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Explore Map & Save Trip</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Visualize routes with interactive Mapbox/Leaflet pins, export your PDF itinerary, and save to MySQL.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BOTTOM COLLEGE BANNER CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 text-white p-8 sm:p-12 shadow-xl shadow-blue-600/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
              ABESIT Academic Session 2026–27
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              Ready to create your personalized trip?
            </h2>
            <p className="text-sm text-blue-100 max-w-xl">
              Launch the multi-step trip wizard and generate an intelligent travel itinerary in seconds.
            </p>
          </div>

          <Link
            to="/create-trip"
            className="px-6 py-3.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold text-sm shadow-md transition-all whitespace-nowrap active:scale-95"
          >
            Start Planning Now →
          </Link>
        </div>
      </section>

    </div>
  );
};

export default Home;
