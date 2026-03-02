import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, RefreshCw, Wifi, WifiOff, AlertTriangle, Server } from 'lucide-react';
import { OltStorage } from '../services/storage';
import { ConfigStorage } from '../services/storage';
import { OLT } from '../types';

declare global {
  interface Window {
    google: any;
    initVsolMap: () => void;
  }
}

const STATUS_COLOR: Record<string, string> = {
  online:  '#22c55e',
  offline: '#ef4444',
};

export const MapaPage: React.FC = () => {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markers     = useRef<any[]>([]);
  const [olts, setOlts]       = useState<OLT[]>([]);
  const [apiKey, setApiKey]   = useState('');
  const [loaded, setLoaded]   = useState(false);
  const [error, setError]     = useState('');
  const [selected, setSelected] = useState<OLT | null>(null);

  useEffect(() => {
    const cfg = ConfigStorage.get();
    setApiKey(cfg.googleMapsKey || '');
    setOlts(OltStorage.getAll());
  }, []);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google) return;
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      zoom: 5,
      center: { lat: -15.7801, lng: -47.9292 }, // Brasil
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    });
    plotMarkers();
    setLoaded(true);
  }, [olts]);

  const plotMarkers = useCallback(() => {
    if (!mapInstance.current || !window.google) return;
    // Limpa markers antigos
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasCoords = false;

    olts.forEach(olt => {
      // OLTs sem lat/lng ficam no centro do Brasil com offset aleatório p/ visualização
      const lat = (olt as any).lat || (-15.7801 + (Math.random() - 0.5) * 20);
      const lng = (olt as any).lng || (-47.9292 + (Math.random() - 0.5) * 30);

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstance.current,
        title: olt.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: STATUS_COLOR[olt.status] || '#6b7280',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
        label: {
          text: 'OLT',
          color: '#fff',
          fontSize: '8px',
          fontWeight: 'bold',
        },
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family:sans-serif;padding:8px;min-width:180px">
            <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${olt.name}</div>
            <div style="color:#6b7280;font-size:12px">IP: ${olt.ip}</div>
            <div style="color:#6b7280;font-size:12px">Modelo: ${olt.model}</div>
            <div style="color:#6b7280;font-size:12px">ONUs: ${olt.onlineOnus}/${olt.totalOnus}</div>
            <div style="margin-top:6px">
              <span style="background:${STATUS_COLOR[olt.status]};color:#fff;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:bold">
                ${olt.status.toUpperCase()}
              </span>
            </div>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
        setSelected(olt);
      });

      markers.current.push(marker);
      bounds.extend({ lat, lng });
      hasCoords = true;
    });

    if (hasCoords && olts.length > 1) mapInstance.current.fitBounds(bounds);
  }, [olts]);

  const loadGoogleMaps = useCallback(() => {
    if (!apiKey) { setError('Configure a Google Maps API Key em Configurações → Operação & IA.'); return; }
    if (window.google) { initMap(); return; }

    setError('');
    window.initVsolMap = initMap;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initVsolMap`;
    script.async = true;
    script.onerror = () => setError('Erro ao carregar Google Maps. Verifique sua API Key.');
    document.head.appendChild(script);
  }, [apiKey, initMap]);

  useEffect(() => {
    if (apiKey) loadGoogleMaps();
  }, [apiKey]);

  useEffect(() => {
    if (loaded) plotMarkers();
  }, [olts, loaded]);

  const stats = {
    total:   olts.length,
    online:  olts.filter(o => o.status === 'online').length,
    offline: olts.filter(o => o.status === 'offline').length,
    onus:    olts.reduce((a, o) => a + (o.totalOnus || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total OLTs',   value: stats.total,   icon: Server,        color: 'bg-blue-600' },
          { label: 'Online',       value: stats.online,  icon: Wifi,          color: 'bg-green-600' },
          { label: 'Offline',      value: stats.offline, icon: WifiOff,       color: 'bg-red-500' },
          { label: 'Total ONUs',   value: stats.onus,    icon: AlertTriangle, color: 'bg-indigo-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
            <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Mapa */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" />
              <span className="font-semibold text-slate-700 text-sm">Mapa de OLTs</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Online
                <span className="w-3 h-3 rounded-full bg-red-500 inline-block ml-2"></span> Offline
              </div>
              <button onClick={() => { setOlts(OltStorage.getAll()); plotMarkers(); }}
                className="text-slate-400 hover:text-blue-600 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {error ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400 p-8">
              <MapPin size={40} className="text-slate-300" />
              <p className="text-center text-sm">{error}</p>
              {!apiKey && (
                <a href="#settings" className="text-blue-600 text-sm hover:underline">
                  Ir para Configurações →
                </a>
              )}
            </div>
          ) : (
            <div ref={mapRef} className="h-96 w-full bg-slate-100">
              {!loaded && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm">Carregando mapa...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lista de OLTs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-700 text-sm">OLTs Cadastradas</p>
          </div>
          <div className="overflow-y-auto max-h-96">
            {olts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Nenhuma OLT cadastrada.
              </div>
            ) : olts.map(olt => (
              <div key={olt.id}
                onClick={() => setSelected(olt)}
                className={`px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${selected?.id === olt.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 truncate">{olt.name}</span>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${olt.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </div>
                <p className="text-xs text-slate-400 font-mono">{olt.ip}</p>
                <p className="text-xs text-slate-400">{olt.onlineOnus}/{olt.totalOnus} ONUs</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detalhes da OLT selecionada */}
      {selected && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">{selected.name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${selected.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {selected.status.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'IP',      value: selected.ip },
              { label: 'Modelo', value: selected.model },
              { label: 'ONUs',   value: `${selected.onlineOnus}/${selected.totalOnus}` },
              { label: 'Porta SSH', value: String(selected.sshPort || 22) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="font-medium text-slate-700">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
