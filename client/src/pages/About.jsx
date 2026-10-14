import { GraduationCap, Compass, Layers, Users } from 'lucide-react';
import { projectInfo, collegeLabel } from '@tripplanner/shared';

// Keep this list in sync with what the code really uses (updated in every roadmap part).
const architecture = [
  {
    title: 'Frontend Layer',
    items: ['React 18 with Vite', 'Tailwind CSS design system', 'React Router for navigation', 'Leaflet + OpenStreetMap interactive maps', 'Lucide icons'],
  },
  {
    title: 'Backend API Layer',
    items: ['Node.js + Express 5 REST API', 'Google Gemini AI (offline sample mode without a key)', 'Central config with validated environment variables', 'Helmet security headers and rate limiting', 'Consistent JSON errors with proper HTTP status codes'],
  },
  {
    title: 'Data Layer',
    items: ['MySQL schema (optional)', 'Local JSON store when MySQL is not running', 'MongoDB Atlas migration planned (roadmap Part 3)'],
  },
  {
    title: 'Location Data',
    items: ['Curated data for popular Indian destinations', 'Google Places API (optional)', 'Day-wise waypoints on the map'],
  },
];

export const About = () => {
  const { team, guide, college } = projectInfo;

  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>
              {college.shortName} {college.city} • {projectInfo.projectType} {projectInfo.academicSession}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">About {projectInfo.name}</h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            A full-stack travel planning platform that generates personalized, budget-aware day-wise itineraries with interactive maps.
          </p>
        </div>

        {/* Problem statement */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            Project Motivation & Problem Statement
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Planning a multi-day trip is often fragmented across travel blogs, map apps, budget spreadsheets and hotel listings. Most automated
            trip planners give generic lists without day-wise logistics or budget limits.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            <strong>{projectInfo.name}</strong> uses Generative AI to turn travel preferences (dates, budget in ₹, number of travelers, diet and
            interests) into a day-by-day schedule with estimated costs, stays, restaurants and a map.
          </p>
        </div>

        {/* Architecture */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            System Architecture & Technology Stack
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {architecture.map((block) => (
              <div key={block.title} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <span className="font-bold text-slate-900 text-sm block">{block.title}</span>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" />
            Project Team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {team.map((member) => (
              <div key={member.rollNo || member.name} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
                <p className="font-bold text-slate-900">{member.name}</p>
                <p className="text-xs text-slate-500">
                  {member.role}
                  {member.rollNo ? ` • Roll No. ${member.rollNo}` : ''}
                </p>
              </div>
            ))}
          </div>
          {guide.name && (
            <p className="text-xs text-slate-600">
              Project Guide: <span className="font-semibold text-slate-800">{guide.name}</span>
              {guide.designation ? `, ${guide.designation}` : ''}
            </p>
          )}
        </div>

        {/* Academic note */}
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 text-center text-xs text-blue-900 space-y-2">
          <GraduationCap className="w-8 h-8 text-blue-600 mx-auto" />
          <h4 className="font-bold text-sm">Academic Project</h4>
          <p className="max-w-md mx-auto text-blue-800">
            Developed at {college.department}, {collegeLabel} ({college.university}) for Academic Session {projectInfo.academicSession}.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
