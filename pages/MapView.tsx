import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Map, RefreshCw, Wifi, Server, AlertTriangle, X, MapPin as MapPinIcon } from 'lucide-react';
import { ConfigStorage, OltStorage } from '../services/storage';

interface MapPin {
  id: string;
  type: 'olt' | 'client';
  name: string;
  ip?: string;
  model?: string;
  status?: string;
  address?: string;
  lat: number;
  lng: number;
}

declare global {
  interface Window { google: any; initVsolMap: () => void; }
}

const STATUS_COLOR: Record<string, string> = {
  online:  '#22c55e',
  offline: '#ef4444',
  client:  '#3b82f6',
};

export const MapView: React.FC = () => {
  const mapRef        = useRef<HTMLDivElement>(null);
  const googleMapRef  = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [pins,     setPins]     = useState<MapPin[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState<'all' | 'olt' | 'client'>('all');
  const [selected, setSelected] = useState<MapPin | null>(null);
  const [stats,    setStats]    = useState({ olts: 0, clients: 0, geocoded: 0, failed: 0 });
  const [progress, setProgress] = useState('');

  const config = ConfigStorage.get();

  const initMap = useCallback((pinsToShow: MapPin[]) => {
    if (!mapRef.current || !window.google) return;
    const valid = pinsToShow.filter(p => p.lat && p.lng);
    const center = valid.length > 0
      ? { lat: valid[0].lat, lng: valid[0].lng }
      : { lat: -15.7801, lng: -47.9292 };

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: valid.length > 0 ? 13 : 4,
      center,
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      ],
    });

    infoWindowRef.current = new window.google.maps.InfoWindow();
    renderMarkers(pinsToShow, filter);
  }, [filter]);

  const renderMarkers = useCallback((pinsToRender: MapPin[], currentFilter: string) => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    const filtered = pinsToRender.filter(p =>
      currentFilter === 'all' ? true : p.type === currentFilter
    );
    filtered.forEach(pin => {
      if (!window.google || !googleMapRef.current) return;
      const color = pin.type === 'olt'
        ? (pin.status === 'online' ? STATUS_COLOR.online : STATUS_COLOR.offline)
        : STATUS_COLOR.client;

      const marker = new window.google.maps.Marker({
        position: { lat: pin.lat, lng: pin.lng },
        map: googleMapRef.current,
        title: pin.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: pin.type === 'olt' ? 14 : 9,
          fillColor: color,
          fillOpacity: 0.95,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
      });

      marker.addListener('click', () => {
        setSelected(pin);
        const content = pin.type === 'olt'
          ? `<div style="font-family:sans-serif;padding:8px;min-width:200px">
               <b style="font-size:14px">🖥️ ${pin.name}</b><br/>
               <span style="color:#64748b;font-size:12px">IP: ${pin.ip}</span><br/>
               <span style="color:#64748b;font-size:12px">Modelo: ${pin.model}</span><br/>
               <span style="color:#64748b;font-size:12px">📍 ${pin.address}</span><br/>
               <span style="color:${color};font-weight:bold;font-size:12px">● ${(pin.status ?? '').toUpperCase()}</span>
             </div>`
          : `<div style="font-family:sans-serif;padding:8px;min-width:200px">
               <b style="font-size:14px">👤 ${pin.name}</b><br/>
               <span style="color:#64748b;font-size:12px">${pin.address}</span>
             </div>`;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(googleMapRef.current, marker);
      });
      markersRef.current.push(marker);
    });

    if (filtered.length > 1 && googleMapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      filtered.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      googleMapRef.current.fitBounds(bounds);
    }
  }, []);

  const geocode = async (address: string, mapsKey: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch(`/admin/addons/vsol-optimized/api/index.php?action=geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ address, apiKey: mapsKey }),
      });
      const data = await res.json();
      if (data.ok && data.lat && data.lng) return { lat: data.lat, lng: data.lng };
    } catch {}
    return null;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setProgress('');

    const mapsKey = config.googleMapsKey;
    if (!mapsKey) {
      setError('Configure a Google Maps API Key em Configurações → Operação & IA.');
      setLoading(false);
      return;
    }

    const geocoded: MapPin[] = [];
    let failed = 0;
    let olts = 0;

    // Carrega OLTs do storage local
    const oltList = OltStorage.getAll();
    olts = oltList.length;

    for (const olt of oltList) {
      setProgress(`Geocodificando OLT ${olt.name}...`);
      if (olt.address) {
        const coords = await geocode(olt.address, mapsKey);
        if (coords) {
          geocoded.push({
            id: olt.id, type: 'olt', name: olt.name,
            ip: olt.ip, model: olt.model, status: olt.status,
            address: olt.address, lat: coords.lat, lng: coords.lng,
          });
        } else { failed++; }
      } else { failed++; }
    }

    // Carrega clientes do MK-Auth via API PHP
    let clients = 0;
    try {
      const res = await fetch('/admin/addons/vsol-optimized/api/index.php?action=maps_olts', {
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (data.ok && data.items) {
        const clientItems = data.items.filter((i: any) => i.type === 'client');
        clients = clientItems.length;
        let count = 0;
        for (const item of clientItems) {
          count++;
          if (count % 5 === 0) setProgress(`Geocodificando cliente ${count}/${clients}...`);
          if (item.address) {
            const coords = await geocode(item.address, mapsKey);
            if (coords) {
              geocoded.push({
                id: item.id, type: 'client', name: item.name,
                address: item.address, lat: coords.lat, lng: coords.lng,
              });
            } else { failed++; }
          }
        }
      }
    } catch {}

    setProgress('');
    setPins(geocoded);
    setStats({ olts, clients, geocoded: geocoded.length, failed });

    const loadMap = (pins: MapPin[]) => {
      if (!window.google) {
        window.initVsolMap = () => initMap(pins);
        // Remove script antigo se existir
        const old = document.getElementById('vsol-gmaps');
        if (old) old.remove();
        const script = document.createElement('script');
        script.id = 'vsol-gmaps';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&callback=initVsolMap&language=pt-BR`;
        script.async = true;
        document.head.appendChild(script);
      } else {
        initMap(pins);
      }
    };

    if (geocoded.length === 0) {
      setError('Nenhuma OLT com endereço cadastrado. Adicione o endereço nas OLTs em "Gerenciar OLTs".');
    } else {
      loadMap(geocoded);
    }

    setLoading(false);
  }, [config.googleMapsKey, initMap]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (googleMapRef.current) renderMarkers(pins, filter);
  }, [filter, pins, renderMarkers]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(['all', 'olt', 'client'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}>
              {f === 'all' ? 'Todos' : f === 'olt' ? '🖥️ OLTs' : '👤 Clientes'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> OLT Online</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> OLT Offline</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span> Cliente</span>
          <button onClick={loadData} disabled={loading}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'OLTs', value: stats.olts, icon: Server, color: 'text-indigo-600' },
          { label: 'Clientes', value: stats.clients, icon: Wifi, color: 'text-blue-600' },
          { label: 'No Mapa', value: stats.geocoded, icon: Map, color: 'text-green-600' },
          { label: 'Sem Local', value: stats.failed, icon: AlertTriangle, color: 'text-orange-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Mapa */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" style={{ height: '520px' }}>
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="animate-spin w-8 h-8" />
            <p className="text-sm">{progress || 'Carregando mapa...'}</p>
          </div>
        ) : error && pins.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
            <MapPinIcon className="w-12 h-12 text-slate-300" />
            <p className="text-sm text-center max-w-xs">{error}</p>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}
      </div>

      {/* Painel de detalhes */}
      {selected && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4 shadow-sm">
          <div>
            <p className="font-semibold text-slate-800">
              {selected.type === 'olt' ? '🖥️' : '👤'} {selected.name}
            </p>
            {selected.type === 'olt'
              ? <p className="text-sm text-slate-500 mt-1">IP: {selected.ip} · Modelo: {selected.model} · Status: <span className={selected.status === 'online' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{selected.status}</span></p>
              : <p className="text-sm text-slate-500 mt-1">{selected.address}</p>
            }
            <p className="text-xs text-slate-400 mt-1">📍 {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}</p>
          </div>
          <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
      )}
    </div>
  );
};
