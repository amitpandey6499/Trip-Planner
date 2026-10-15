import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TripProvider } from './context/TripContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DemoModeBanner from './components/DemoModeBanner';
import Toast from './components/Toast';
import GenerationOverlay from './components/GenerationOverlay';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import Home from './pages/Home';
import Auth from './pages/Auth';
import CreateTrip from './pages/CreateTrip';
import Explore from './pages/Explore';
import DestinationPage from './pages/DestinationPage';
import ItineraryView from './pages/ItineraryView';
import MapView from './pages/MapView';
import HotelsView from './pages/HotelsView';
import RestaurantsView from './pages/RestaurantsView';
import MyTrips from './pages/MyTrips';
import Profile from './pages/Profile';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import SharedTripPage from './pages/SharedTripPage';
import AdminDashboard from './pages/AdminDashboard';

/** A crash on one page shows a friendly message; moving to another page clears it. */
const ErrorBoundaryForRoute = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
};

/** A new page starts at the top (React Router keeps the old scroll position otherwise). */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export const App = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <TripProvider>
          <div className="flex flex-col min-h-screen">
            <DemoModeBanner />
            <Navbar />
            <main className="flex-1">
              <ErrorBoundaryForRoute>
                <Routes>
                  {/* Public pages */}
                  <Route path="/" element={<Home />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/destinations/:slug" element={<DestinationPage />} />
                  <Route path="/map" element={<MapView />} />
                  <Route path="/hotels" element={<HotelsView />} />
                  <Route path="/restaurants" element={<RestaurantsView />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/share/:slug" element={<SharedTripPage />} />

                  {/* Trips (need login). Every saved trip has its own URL, so refresh / bookmarks work. */}
                  <Route path="/trips/new" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
                  <Route path="/trips/:id" element={<ProtectedRoute><ItineraryView /></ProtectedRoute>} />
                  <Route path="/trips/:id/edit" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  {/* A freshly generated, not-yet-saved itinerary */}
                  <Route path="/itinerary" element={<ProtectedRoute><ItineraryView /></ProtectedRoute>} />
                  <Route path="/my-trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                  {/* Old address from before Part 5 */}
                  <Route path="/create-trip" element={<Navigate to="/trips/new" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundaryForRoute>
            </main>
            <Footer />
            <Toast />
            <GenerationOverlay />
          </div>
        </TripProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
