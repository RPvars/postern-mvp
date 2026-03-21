'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface CompanyLocation {
  registrationNumber: string;
  name: string;
  legalAddress: string;
  latitude: number | null;
  longitude: number | null;
}

interface CompanyMapProps {
  companies: CompanyLocation[];
}

// Auto-fit bounds to show all markers
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [map, positions]);
  return null;
}

// Enable zoom only on Ctrl+wheel (pinch-to-zoom on trackpad sends ctrlKey=true)
function CtrlScrollZoom() {
  const map = useMap();
  useEffect(() => {
    map.scrollWheelZoom.disable();
    const container = map.getContainer();
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        map.setZoom(map.getZoom() + delta, { animate: true });
      }
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [map]);
  return null;
}

function CompanyMapInner({ companies }: CompanyMapProps) {
  const t = useTranslations('person');
  const [coordinates, setCoordinates] = useState<Record<string, { lat: number; lng: number } | null>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Merge pre-existing coordinates from API
  const initialCoords = useMemo(() => {
    const coords: Record<string, { lat: number; lng: number } | null> = {};
    for (const c of companies) {
      if (c.latitude && c.longitude) {
        coords[c.registrationNumber] = { lat: c.latitude, lng: c.longitude };
      }
    }
    return coords;
  }, [companies]);

  // Geocode missing coordinates
  useEffect(() => {
    const missing = companies.filter(c => !c.latitude && !c.longitude && c.legalAddress).slice(0, 10);
    if (missing.length === 0) {
      setCoordinates(initialCoords);
      return;
    }

    setCoordinates(initialCoords);
    setIsLoading(true);

    fetch('/api/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumbers: missing.map(c => c.registrationNumber) }),
    })
      .then(r => r.json())
      .then(data => {
        setCoordinates(prev => ({ ...prev, ...data.coordinates }));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [companies, initialCoords]);

  const resolved = companies
    .map(c => {
      const coord = coordinates[c.registrationNumber];
      if (!coord) return null;
      return { ...c, lat: coord.lat, lng: coord.lng };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  // Group companies at the same location into one marker with multiple companies in popup
  const locationGroups = new Map<string, typeof resolved>();
  for (const m of resolved) {
    const key = `${m.lat.toFixed(4)},${m.lng.toFixed(4)}`;
    const group = locationGroups.get(key) || [];
    group.push(m);
    locationGroups.set(key, group);
  }

  const groupedMarkers = Array.from(locationGroups.values()).map(group => ({
    lat: group[0].lat,
    lng: group[0].lng,
    companies: group,
  }));

  const positions = groupedMarkers.map(g => [g.lat, g.lng] as [number, number]);

  // Latvia center as default
  const defaultCenter: [number, number] = [56.95, 24.1];

  if (companies.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {isLoading && groupedMarkers.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 rounded-lg">
          <div className="text-sm text-muted-foreground">{t('mapLoading')}</div>
        </div>
      )}
      <MapContainer
        center={defaultCenter}
        zoom={7}
        className="h-[400px] rounded-lg z-0"
        scrollWheelZoom={false}
      >
        <CtrlScrollZoom />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 0 && <FitBounds positions={positions} />}
        {groupedMarkers.map((group, gi) => (
          <Marker key={`group-${gi}`} position={[group.lat, group.lng]} icon={defaultIcon}>
            <Popup>
              <div className="min-w-[180px] max-h-[200px] overflow-y-auto space-y-2">
                {group.companies.map((c, ci) => (
                  <div key={c.registrationNumber} className={ci > 0 ? 'border-t pt-2' : ''}>
                    <Link
                      href={`/company/${c.registrationNumber}`}
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      {c.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.legalAddress}</div>
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

// Export with dynamic import wrapper to prevent SSR (Leaflet requires window)
export { CompanyMapInner };
