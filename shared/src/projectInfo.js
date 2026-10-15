/**
 * Single source of truth for project / college details.
 * Every page (client) and every log / API response (server) reads from here,
 * so a change here updates the whole app.
 */
export const projectInfo = Object.freeze({
  name: 'TripPlanner',
  tagline: 'AI-Powered Smart Trip Planner',
  version: '2.0.0',
  projectType: 'B.Tech Mini Project',
  academicSession: '2026–27',
  college: Object.freeze({
    name: 'ABES Engineering College',
    shortName: 'ABESEC',
    city: 'Ghaziabad',
    address: '19th KM Stone, NH-09, Ghaziabad, Uttar Pradesh 201009',
    university: 'Dr. A.P.J. Abdul Kalam Technical University (AKTU), Lucknow',
    department: 'Department of Computer Science & Engineering',
  }),
  // TODO(Rahul): add your teammates and project guide here.
  team: Object.freeze([
    Object.freeze({ name: 'Rahul Prajapati', rollNo: '2300320120193', role: 'Full Stack Developer' }),
  ]),
  guide: Object.freeze({ name: '', designation: '' }),
  // Only list technology that the code actually uses right now.
  techStack: Object.freeze([
    'React 18 + Vite',
    'Tailwind CSS',
    'Node.js + Express',
    'MongoDB Atlas + Mongoose',
    'JWT + bcrypt login',
    'Google Gemini AI',
    'Leaflet + OpenStreetMap',
  ]),
});

/** "ABES Engineering College, Ghaziabad" */
export const collegeLabel = `${projectInfo.college.name}, ${projectInfo.college.city}`;
