import type { LocationPoint, RoutePoint } from '../../types/domain';

const cityCoordinates: Record<string, Omit<LocationPoint, 'label'>> = {
  delhi: { latitude: 28.6139, longitude: 77.209 },
  jaipur: { latitude: 26.9124, longitude: 75.7873 },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714 },
  mumbai: { latitude: 19.076, longitude: 72.8777 },
  pune: { latitude: 18.5204, longitude: 73.8567 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  hyderabad: { latitude: 17.385, longitude: 78.4867 },
};

function normalizedName(label: string): string {
  return label.trim().toLowerCase();
}

function fallbackCoordinates(label: string): Omit<LocationPoint, 'label'> {
  const hash = [...label].reduce((value, character) => value + character.charCodeAt(0), 0);

  return {
    latitude: 8 + (hash % 2700) / 100,
    longitude: 68 + (hash % 2000) / 100,
  };
}

export function resolveLocation(label: string): LocationPoint {
  const normalized = normalizedName(label);
  const coordinates = cityCoordinates[normalized] ?? fallbackCoordinates(label);

  return {
    label: label.trim(),
    ...coordinates,
  };
}

export function haversineDistanceKm(from: LocationPoint, to: LocationPoint): number {
  const toRadians = (value: number): number => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function createRoute(source: LocationPoint, destination: LocationPoint): RoutePoint[] {
  const cityNames = normalizedName(source.label) + ':' + normalizedName(destination.label);
  const labels =
    cityNames === 'delhi:mumbai'
      ? ['Delhi', 'Jaipur', 'Ahmedabad', 'Mumbai']
      : cityNames === 'mumbai:delhi'
        ? ['Mumbai', 'Ahmedabad', 'Jaipur', 'Delhi']
        : [source.label, destination.label];

  return labels.map((label, sequence) => ({
    ...resolveLocation(label),
    sequence,
  }));
}

export function routeDistanceKm(route: RoutePoint[]): number {
  return Math.round(
    route.slice(1).reduce((sum, point, index) => sum + haversineDistanceKm(route[index], point), 0) * 1.15,
  );
}
