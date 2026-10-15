import { bookingSearchUrl, mapsSearchUrl } from '@tripplanner/shared';

/** Booking / Maps links for a stay of the plan: areas ("Mid-range hotel near X") search the area, hotels their name. */
export const stayLinks = (hotel, itinerary) => {
  const place = / near /.test(hotel.name) && hotel.address ? hotel.address : `${hotel.name}, ${itinerary.destination}`;
  return {
    booking: bookingSearchUrl({ place, checkIn: itinerary.startDate, checkOut: itinerary.endDate, adults: itinerary.travelersCount }),
    maps: mapsSearchUrl(/ near /.test(hotel.name) ? `hotels near ${place}` : place),
  };
};
