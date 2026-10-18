import { CalendarDays, CloudSun, Compass, Map, Plane, Share2, Sparkles, Wallet } from 'lucide-react';
import { projectInfo } from '@tripplanner/shared';

const features = [
  {
    title: 'Personalized itineraries',
    description: 'Build a day-by-day plan around your destination, travel dates, budget, interests and pace.',
    Icon: CalendarDays,
  },
  {
    title: 'Routes at a glance',
    description: 'See daily stops and travel routes on a map, with distances and estimated travel times.',
    Icon: Map,
  },
  {
    title: 'Plans you can make your own',
    description: 'Reorder, add or update activities and keep your itinerary and estimated costs in sync.',
    Icon: Compass,
  },
  {
    title: 'Trip costs made clearer',
    description: 'Review estimated costs, split shared expenses, see balances and find a simple way to settle up.',
    Icon: Wallet,
  },
  {
    title: 'AI-assisted planning',
    description: 'Generate a trip plan from your preferences, with an offline planner available for supported destinations.',
    Icon: Sparkles,
  },
  {
    title: 'Useful travel details',
    description: 'Check destination information, weather, packing suggestions and ways to reach your destination.',
    Icon: CloudSun,
  },
  {
    title: 'Share and take your plan with you',
    description: 'Share a read-only trip link or export your itinerary as a PDF or calendar event.',
    Icon: Share2,
  },
  {
    title: 'A plan that adapts as you travel',
    description: 'Save trips, make a copy of a shared plan and update your schedule when your plans change.',
    Icon: Plane,
  },
];

export const About = () => {
  return (
    <div className="min-h-screen py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">About {projectInfo.name}</h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            {projectInfo.tagline}. Bring your itinerary, routes, travel details and shared expenses together so you can spend less time
            coordinating and more time looking forward to the journey.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft space-y-4">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-blue-600" />
            Plan your trip in one place
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {projectInfo.name} brings your travel preferences, daily activities, routes and budget estimates together in a single itinerary.
            Choose a destination, dates, budget, interests and travel pace to get a day-by-day starting plan. Use AI-assisted generation or
            the offline planner for supported destinations, then adjust the schedule to fit your trip.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-soft space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Map className="w-5 h-5 text-indigo-600" />
            Plan, organize and share
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ title, description, Icon }) => (
              <div key={title} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Icon className="w-4 h-4 text-blue-600" />
                  {title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
