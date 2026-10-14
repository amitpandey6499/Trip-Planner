import React from 'react';
import { GraduationCap, Compass, Layers, ShieldCheck, Sparkles, Database, Map } from 'lucide-react';

export const About = () => {
  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>ABESIT Ghaziabad • Mini Project 2026–27</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            About TripPlanner AI
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            An intelligent, full-stack travel planning platform generating personalized, budget-aware day-wise itineraries with interactive map routes.
          </p>
        </div>

        {/* Project Context Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            Project Motivation & Problem Statement
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Planning a multi-day trip is often fragmented across multiple travel blogs, map calculators, budget spreadsheets, and hotel listings. Most automated trip planners provide generic static lists without day-wise logistics or budget constraints.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>TripPlanner</strong> solves this by leveraging modern Generative AI to understand natural language travel preferences (duration, budget in INR ₹, travelers count, dietary choices, and activity interests) to synthesize optimized day-by-day travel schedules complete with estimated expenses, local hotels, restaurants, and interactive maps.
          </p>
        </div>

        {/* System Architecture */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            System Architecture & Technology Stack
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="font-bold text-slate-900 text-sm block">Frontend Layer</span>
              <ul className="space-y-1 text-slate-600 list-disc list-inside">
                <li>React.js (Vite build engine)</li>
                <li>Tailwind CSS & Design System</li>
                <li>React Router DOM for seamless navigation</li>
                <li>Leaflet & Mapbox GL interactive mapping</li>
                <li>Lucide React iconography</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="font-bold text-slate-900 text-sm block">Backend API Layer</span>
              <ul className="space-y-1 text-slate-600 list-disc list-inside">
                <li>Node.js & Express.js REST Framework</li>
                <li>Google Gemini Generative AI SDK</li>
                <li>Arcjet rate limiting & bot defense shield</li>
                <li>Clerk Express authentication verification</li>
                <li>Structured input validation & error handlers</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="font-bold text-slate-900 text-sm block">Database Layer</span>
              <ul className="space-y-1 text-slate-600 list-disc list-inside">
                <li>MySQL relational database</li>
                <li>Tables for users, trips, days, activities, stays</li>
                <li>Parameterized SQL queries & transactions</li>
                <li>Multi-tier resilient persistent storage fallback</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
              <span className="font-bold text-slate-900 text-sm block">Location & Geo Intelligence</span>
              <ul className="space-y-1 text-slate-600 list-disc list-inside">
                <li>Google Places API destination search</li>
                <li>Mapbox interactive route waypoints</li>
                <li>Curated fallback data for top Indian destinations</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Academic Presentation Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-center text-xs text-blue-900 space-y-2">
          <GraduationCap className="w-8 h-8 text-blue-600 mx-auto" />
          <h4 className="font-bold text-sm">Academic Project Evaluation</h4>
          <p className="max-w-md mx-auto text-blue-800">
            Developed for Department of Computer Science & Engineering, ABES Institute of Technology (ABESIT), Ghaziabad for Academic Session 2026–27.
          </p>
        </div>

      </div>
    </div>
  );
};

export default About;
