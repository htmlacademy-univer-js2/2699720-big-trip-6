import dayjs from 'dayjs';
import { sortPointsByDay } from './sort.js';

const ROUTE_LIMIT = 3;

function formatTripDate(date) {
  return dayjs(date).format('D MMM').toUpperCase();
}

function getTripTitle(points, destinations) {
  const sortedPoints = [...points].sort(sortPointsByDay);
  const routePoints = sortedPoints
    .map((point) => destinations.find((destination) => destination.id === point.destinationId)?.name)
    .filter((name) => name);

  if (routePoints.length > ROUTE_LIMIT) {
    return `${routePoints[0]} &mdash; ... &mdash; ${routePoints[routePoints.length - 1]}`;
  }

  return routePoints.join(' &mdash; ');
}

function getTripDates(points) {
  const sortedPoints = [...points].sort(sortPointsByDay);
  const [firstPoint] = sortedPoints;
  const lastPoint = sortedPoints[sortedPoints.length - 1];

  return `${formatTripDate(firstPoint.dateFrom)}&nbsp;&mdash;&nbsp;${formatTripDate(lastPoint.dateTo)}`;
}

function getTripCost(points, offers) {
  return points.reduce((total, point) => {
    const selectedOffersCost = offers
      .filter((offer) => point.offerIds.includes(offer.id))
      .reduce((offersTotal, offer) => offersTotal + offer.price, 0);

    return total + point.basePrice + selectedOffersCost;
  }, 0);
}

function generateTripInfo(points, destinations, offers) {
  if (!points.length) {
    return {
      title: '',
      dates: '',
      cost: 0,
    };
  }

  return {
    title: getTripTitle(points, destinations),
    dates: getTripDates(points),
    cost: getTripCost(points, offers),
  };
}

export { generateTripInfo };
