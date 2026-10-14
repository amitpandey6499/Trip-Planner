import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TripProvider } from './context/TripContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DemoModeBanner from './components/DemoModeBanner';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Auth from './pages/Auth';
import CreateTrip from './pages/CreateTrip';
import Explore from './pages/Explore';
import ItineraryView from './pages/ItineraryView';
import MapView from './pages/MapView';
import HotelsView from './pages/HotelsView';
import RestaurantsView from './pages/RestaurantsView';
import MyTrips from './pages/MyTrips';
import Profile from './pages/Profile';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TripProvider>
          <div className="flex flex-col min-h-screen">
            <DemoModeBanner />
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public pages */}
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/hotels" element={<HotelsView />} />
                <Route path="/restaurants" element={<RestaurantsView />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />

                {/* Need login (trips belong to a user; AI generation uses quota) */}
                <Route path="/create-trip" element={<ProtectedRoute><CreateTrip /></ProtectedRoute>} />
                <Route path="/itinerary" element={<ProtectedRoute><ItineraryView /></ProtectedRoute>} />
                <Route path="/my-trips" element={<ProtectedRoute><MyTrips /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </TripProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
