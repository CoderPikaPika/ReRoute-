import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Feature, LineString } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

interface RoutePort {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface RouteVessel {
  name: string;
  longitude: number;
  latitude: number;
  isEstimated: boolean;
}

interface Props {
  origin?: RoutePort;
  destination?: RoutePort;
  vessel?: RouteVessel;
}

const routeSourceId = 'charter-route';
const routeLayerId = 'charter-route-line';

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export function CharterRouteMap({ origin, destination, vessel }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const routeDotMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: mapStyle, center: [105, -4], zoom: 2.4, attributionControl: false });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('load', () => setReady(true));
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      routeDotMarkersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      const fullscreen = document.fullscreenElement === panelRef.current;
      setIsFullscreen(fullscreen);
      window.setTimeout(() => mapRef.current?.resize(), 0);
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !origin || !destination) return;
    const route = estimatedSeaRoute(origin, destination, vessel);
    const feature: Feature<LineString> = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } };
    const source = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(feature);
    else {
      map.addSource(routeSourceId, { type: 'geojson', data: feature });
      map.addLayer({ id: routeLayerId, type: 'line', source: routeSourceId, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#0879df', 'line-width': 2, 'line-opacity': 0.3 } });
    }
    // DOM markers sit above the map canvas, so the dots remain visible after any map redraw.
    routeDotMarkersRef.current.forEach((marker) => marker.remove());
    routeDotMarkersRef.current = route.slice(1, -1).map((coordinate) => {
      const dot = document.createElement('span');
      dot.setAttribute('aria-hidden', 'true');
      dot.style.cssText = 'display:block;width:10px;height:10px;border:1.5px solid #fff;border-radius:999px;background:#10a86f;box-shadow:0 1px 4px rgba(11,82,150,.4);';
      return new maplibregl.Marker({ element: dot, anchor: 'center' }).setLngLat(coordinate).addTo(map);
    });

    markersRef.current.forEach((marker) => marker.remove());
    const markers = [
      createMarker('O', '#16a56d', `${origin.name} (${origin.country})`, [origin.longitude, origin.latitude]),
      createMarker('D', '#e54b4b', `${destination.name} (${destination.country})`, [destination.longitude, destination.latitude]),
    ];
    if (vessel) {
      markers.push(createMarker('V', vessel.isEstimated ? '#d09219' : '#0879df', `${vessel.name} · ${vessel.isEstimated ? 'estimated position' : 'AIS position'}`, [vessel.longitude, vessel.latitude]));
    }
    markersRef.current = markers.map(({ marker, coordinate }) => marker.setLngLat(coordinate).addTo(map));

    const bounds = new maplibregl.LngLatBounds(route[0], route[0]);
    route.slice(1).forEach((coordinate) => bounds.extend(coordinate));
    if (vessel) bounds.extend([vessel.longitude, vessel.latitude]);
    map.fitBounds(bounds, { padding: { top: 56, right: 80, bottom: 50, left: 55 }, maxZoom: 4.5, duration: 300 });
  }, [destination, origin, ready, vessel]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === panelRef.current) {
      await document.exitFullscreen();
      return;
    }
    await panelRef.current?.requestFullscreen?.();
  };

  return <div ref={panelRef} className="relative h-full min-h-[286px] w-full overflow-hidden [&:fullscreen]:h-screen [&:fullscreen]:w-screen" aria-label="Estimated sea route between selected ports"><div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /><button aria-label={isFullscreen ? 'Exit full screen map' : 'Open map in full screen'} className="absolute bottom-3 left-3 z-30 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-bold text-[#166cbf] shadow hover:bg-white" onClick={() => { void toggleFullscreen(); }} type="button">{isFullscreen ? '× Close' : '⛶ Full screen'}</button></div>;
}

function createMarker(label: string, color: string, title: string, coordinate: [number, number]) {
  const element = document.createElement('span');
  element.title = title;
  element.textContent = label;
  element.style.cssText = `display:grid;place-items:center;width:25px;height:25px;border:3px solid white;border-radius:999px;background:${color};color:white;font:700 10px/1 system-ui;box-shadow:0 2px 8px rgba(15,54,93,.35);`;
  return { marker: new maplibregl.Marker({ element, anchor: 'center' }), coordinate };
}

function estimatedSeaRoute(origin: RoutePort, destination: RoutePort, vessel?: RouteVessel): [number, number][] {
  const start: [number, number] = [origin.longitude, origin.latitude];
  const end: [number, number] = [destination.longitude, destination.latitude];
  const vesselPoint: [number, number] | undefined = vessel ? [vessel.longitude, vessel.latitude] : undefined;
  // Approximate maritime corridor used when a safe vessel position is unavailable.
  const waypoints: [number, number][] = origin.country === 'Australia' && destination.country === 'India'
    ? [[Math.min(145, origin.longitude - 2), -11], [112, -8], [101, -5], [90, 1], [82, 8]]
    : [];
  // Prefer the selected vessel only when its position is plausibly offshore. Seeded or
  // stale AIS points can land on a continent; those use the safe sea corridor instead.
  const useVessel = vesselPoint && !isLikelyLand(vesselPoint, start, end);
  const anchors = useVessel ? [start, vesselPoint, end] : [start, ...waypoints, end];
  return evenlySpacedRoute(anchors);
}

function evenlySpacedRoute(anchors: [number, number][]): [number, number][] {
  if (anchors.length < 2) return anchors;
  const legDistances = anchors.slice(0, -1).map((point, index) => haversineKm(point, anchors[index + 1]));
  const totalDistance = legDistances.reduce((sum, distance) => sum + distance, 0);
  const targetSegments = Math.max(18, Math.min(56, Math.round(totalDistance / 180)));
  const segments = legDistances.map((distance) => Math.max(2, Math.round(targetSegments * distance / totalDistance)));
  return anchors.slice(0, -1).flatMap((point, index) => greatCirclePoints(point, anchors[index + 1], segments[index]).slice(0, -1)).concat([anchors[anchors.length - 1]]);
}

function haversineKm(start: [number, number], end: [number, number]): number {
  const radians = Math.PI / 180;
  const latitudeDelta = (end[1] - start[1]) * radians;
  const longitudeDelta = (end[0] - start[0]) * radians;
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(start[1] * radians) * Math.cos(end[1] * radians) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isLikelyLand(point: [number, number], start: [number, number], end: [number, number]): boolean {
  if (haversineKm(point, start) < 90 || haversineKm(point, end) < 90) return false;
  const [longitude, latitude] = point;
  const onAustralia = longitude >= 113 && longitude <= 154 && latitude >= -39 && latitude <= -10;
  const onIndia = longitude >= 68 && longitude <= 97 && latitude >= 8 && latitude <= 36;
  const onSriLanka = longitude >= 79 && longitude <= 82.2 && latitude >= 5.5 && latitude <= 10.2;
  return onAustralia || onIndia || onSriLanka;
}

function greatCirclePoints(start: [number, number], end: [number, number], segments: number): [number, number][] {
  const toVector = ([longitude, latitude]: [number, number]) => {
    const lon = longitude * Math.PI / 180;
    const lat = latitude * Math.PI / 180;
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)] as const;
  };
  const fromVector = ([x, y, z]: readonly number[]): [number, number] => [Math.atan2(y, x) * 180 / Math.PI, Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI];
  const a = toVector(start);
  const b = toVector(end);
  const angle = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  if (angle < 0.0001) return [start, end];
  return Array.from({ length: segments + 1 }, (_, index) => {
    const fraction = index / segments;
    const weightA = Math.sin((1 - fraction) * angle) / Math.sin(angle);
    const weightB = Math.sin(fraction * angle) / Math.sin(angle);
    return fromVector([a[0] * weightA + b[0] * weightB, a[1] * weightA + b[1] * weightB, a[2] * weightA + b[2] * weightB]);
  });
}
