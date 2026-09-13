import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Feature, LineString } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

import type { MaritimeVessel, MaritimeVesselTrackPoint } from '../../services/maritimeApi';

interface Props {
  vessels: MaritimeVessel[];
  selectedVesselId?: string;
  selectedTrack?: MaritimeVesselTrackPoint[];
  expanded?: boolean;
  onSelect: (vesselId: string) => void;
}

const routeSourceId = 'selected-vessel-track';
const routeLayerId = 'selected-vessel-track-line';

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

function markerColor(status: string): string {
  if (status === 'UNDER_WAY') return '#119b68';
  if (status === 'AT_PORT') return '#e79a15';
  if (status === 'AT_ANCHOR') return '#64748b';
  return '#1678df';
}

export function MaritimeVesselMap({ vessels, selectedVesselId, selectedTrack = [], expanded = false, onSelect }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: containerRef.current, style: mapStyle, center: [88, -1], zoom: 2.5 });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.on('load', () => {
      setReady(true);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const resize = () => map.resize();
    const animationFrame = requestAnimationFrame(resize);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animationFrame); window.removeEventListener('resize', resize); };
  }, [expanded, isFullscreen]);

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
    if (!map || !ready) return;
    const positions = vessels.filter((vessel) => vessel.position);
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = positions.map((vessel) => {
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.title = `${vessel.name} · ${vessel.position!.navigationStatus.replace('_', ' ')}`;
      marker.setAttribute('aria-label', `Select ${vessel.name}`);
      marker.style.cssText = 'display:grid;place-items:center;width:20px;height:24px;padding:0;border:0;background:transparent;cursor:pointer;';
      const hull = document.createElement('span');
      hull.style.cssText = `display:block;width:${vessel.id === selectedVesselId ? 16 : 12}px;height:${vessel.id === selectedVesselId ? 20 : 16}px;background:${markerColor(vessel.position!.navigationStatus)};clip-path:polygon(50% 0%,100% 100%,50% 78%,0% 100%);transform:rotate(${vessel.position!.headingDegrees ?? vessel.position!.courseDegrees ?? 0}deg);filter:drop-shadow(0 1px 1px rgba(15,54,93,.55));${vessel.id === selectedVesselId ? 'outline:2px solid white;outline-offset:2px;' : ''}`;
      marker.append(hull);
      marker.addEventListener('click', () => {
        onSelect(vessel.id);
        new maplibregl.Popup({ offset: 14 })
          .setLngLat([vessel.position!.longitude, vessel.position!.latitude])
          .setHTML(`<strong>${escapeHtml(vessel.name)}</strong><br/>${escapeHtml(vessel.vesselClass.replace('_', ' '))} · ${escapeHtml(vessel.position!.navigationStatus.replace('_', ' '))}`)
          .addTo(map);
      });
      return new maplibregl.Marker({ element: marker, anchor: 'center' })
        .setLngLat([vessel.position!.longitude, vessel.position!.latitude])
        .addTo(map);
    });

    const routeCoordinates = selectedTrack.map((point) => [point.longitude, point.latitude] as [number, number]);
    const routeFeature: Feature<LineString> = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: routeCoordinates } };
    const existingRoute = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined;
    if (routeCoordinates.length >= 2) {
      if (existingRoute) existingRoute.setData(routeFeature);
      else {
        map.addSource(routeSourceId, { type: 'geojson', data: routeFeature });
        map.addLayer({ id: routeLayerId, type: 'line', source: routeSourceId, paint: { 'line-color': '#0879df', 'line-width': 4, 'line-opacity': 0.9, 'line-dasharray': [2, 1] } });
      }
    } else {
      if (map.getLayer(routeLayerId)) map.removeLayer(routeLayerId);
      if (map.getSource(routeSourceId)) map.removeSource(routeSourceId);
    }

    if (positions.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      positions.forEach((vessel) => bounds.extend([vessel.position!.longitude, vessel.position!.latitude]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 5, duration: 400 });
    } else if (routeCoordinates.length >= 2) {
      const bounds = new maplibregl.LngLatBounds(routeCoordinates[0], routeCoordinates[0]);
      routeCoordinates.slice(1).forEach((coordinate) => bounds.extend(coordinate));
      map.fitBounds(bounds, { padding: 85, maxZoom: 5.5, duration: 400 });
    }
  }, [ready, selectedTrack, selectedVesselId, vessels]);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement === panelRef.current) {
      await document.exitFullscreen();
      return;
    }
    await panelRef.current?.requestFullscreen?.();
  };

  return <div ref={panelRef} className="relative h-full min-h-[570px] w-full overflow-hidden [&:fullscreen]:h-screen [&:fullscreen]:w-screen" aria-label="Interactive vessel-position map"><div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} /><button aria-label={isFullscreen ? 'Exit full screen map' : 'Open map in full screen'} className="absolute right-3 top-3 z-10 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-bold text-[#166cbf] shadow hover:bg-white" onClick={() => { void toggleFullscreen(); }} type="button">{isFullscreen ? '× Close' : '⛶ Full screen'}</button></div>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
}
