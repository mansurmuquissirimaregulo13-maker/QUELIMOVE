import * as React from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import {
  MapPin,
  Navigation,
  ChevronRight,
  Route as RouteIcon,
  AlertCircle,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QUELIMANE_LOCATIONS, Location as LocationType } from '../constants';
import { supabase } from '../lib/supabase';
import { LeafletMapComponent as MapComponent } from '../components/LeafletMapComponent';

interface SearchResult {
  description: string;
  place_id: string;
  is_local?: boolean;
  lat?: string;
  lon?: string;
  type?: string;
}

interface RideRequestPageProps {
  onNavigate: (page: string) => void;
}

// Haversine formula to calculate distance in KM
function calculateDistance(loc1: LocationType, loc2: LocationType): number {
  const R = 6371;
  const dLat = (loc2.lat - loc1.lat) * (Math.PI / 180);
  const dLon = (loc2.lng - loc1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * (Math.PI / 180)) * Math.cos(loc2.lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function RideRequestPage({ onNavigate }: RideRequestPageProps) {
  const [step, setStep] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pickup, setPickup] = React.useState<LocationType | null>(null);
  const [destination, setDestination] = React.useState<LocationType | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'mpesa' | 'emola'>('cash');
  const [serviceType, setServiceType] = React.useState<'moto' | 'txopela'>('moto');

  const [mapCenter, setMapCenter] = React.useState<[number, number]>([-17.8764, 36.8878]);
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [distance, setDistance] = React.useState(0);
  const [estimatedPrice, setEstimatedPrice] = React.useState(0);

  // Search state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [activeSearchField, setActiveSearchField] = React.useState<'pickup' | 'destination' | 'stop' | null>(null);
  const [activeStopIndex, setActiveStopIndex] = React.useState<number | null>(null);
  const [isSelectingOnMap, setIsSelectingOnMap] = React.useState(false);
  const [stops, setStops] = React.useState<LocationType[]>([]);

  // Match state
  const [matchStatus, setMatchStatus] = React.useState<'idle' | 'searching' | 'found' | 'busy'>('idle');
  const [driverInfo, setDriverInfo] = React.useState<any>(null);
  const [eta, setEta] = React.useState(0);

  const [nearbyDrivers, setNearbyDrivers] = React.useState<any[]>([]);



  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        // Prioritize specific street names, then areas, then cities
        const road = addr.road || addr.pedestrian || addr.street || addr.residential || addr.path;
        const area = addr.suburb || addr.neighbourhood || addr.district || addr.quarter || addr.hamlet;
        const city = addr.village || addr.town || addr.city || addr.municipality || addr.county;

        if (road) return road;
        if (area) return area;
        if (city) return city;

        return 'Local Sem Nome';
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
    // Fallback to coordinates if everything fails, better than "Unknown"
    return `Local: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const fetchDrivers = async () => {
    // 1. Try to get real drivers from Supabase
    const { data } = await supabase
      .from('profiles')
      .select('id, current_lat, current_lng, vehicle_type, is_available, status')
      .eq('role', 'driver')
      .eq('is_available', true)
      .eq('status', 'active');

    let validDrivers: any[] = [];

    if (data && data.length > 0) {
      validDrivers = data
        .filter(d => typeof d.current_lat === 'number' && typeof d.current_lng === 'number')
        .map(d => ({
          id: d.id,
          lat: d.current_lat,
          lng: d.current_lng,
          type: d.vehicle_type || 'moto'
        }));
    }

    // 2. If no real drivers, generate MOCK drivers around the current center (or User)
    // This allows the user to see "activity" even if no real driver is online yet
    if (validDrivers.length === 0) {
      const centerLat = mapCenter[0];
      const centerLng = mapCenter[1];

      // Generate 3-5 mock drivers
      const mockCount = 5;
      for (let i = 0; i < mockCount; i++) {
        // Random offset within ~2km
        const latOffset = (Math.random() - 0.5) * 0.02;
        const lngOffset = (Math.random() - 0.5) * 0.02;
        validDrivers.push({
          id: `mock_${i}`,
          lat: centerLat + latOffset,
          lng: centerLng + lngOffset,
          type: Math.random() > 0.5 ? 'moto' : 'car'
        });
      }
    }

    setNearbyDrivers(validDrivers);
  };

  React.useEffect(() => {
    fetchDrivers();

    let watchId: number;

    // 1. Get initial location immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coords: [number, number] = [latitude, longitude];
          setUserLocation(coords);

          // Center on user immediately if no pickup is set yet
          if (!pickup && !destination) {
            setMapCenter(coords);

            // Reverse geocode to get street name
            const addressName = await reverseGeocode(latitude, longitude);
            setPickup({
              name: addressName || 'Minha Localização',
              lat: latitude,
              lng: longitude
            });
          }
        },
        (error) => {
          console.error("Error getting initial location:", error);
          if (!mapCenter) setMapCenter([-17.8764, 36.8878]);
        },
        { enableHighAccuracy: true }
      );

      // 2. Watch for updates
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
        },
        (error) => console.error("Watch location error:", error),
        { enableHighAccuracy: true, distanceFilter: 10 }
      );
    }

    // 3. Subscribe to driver updates
    const channelName = 'drivers-realtime-request';

    // Pequeno delay para evitar churn de conexão em remounts rápidos
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: 'role=eq.driver'
          },
          () => fetchDrivers()
        )
        .subscribe();

      (window as any)[`supabase_${channelName}`] = channel;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (watchId) navigator.geolocation.clearWatch(watchId);
      const ch = (window as any)[`supabase_${channelName}`];
      if (ch) {
        supabase.removeChannel(ch);
        delete (window as any)[`supabase_${channelName}`];
      }
    };
  }, []);

  const handleSearch = async (query: string) => {
    setSearchTerm(query);
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    // 1. Busca local (Constants de Quelimane) - PRIORIDADE MÁXIMA
    const normalizedQuery = query.toLowerCase().trim();
    const localResults = QUELIMANE_LOCATIONS
      .filter(loc => loc.name.toLowerCase().includes(normalizedQuery))
      .map(loc => ({
        description: `${loc.name}, Quelimane`,
        place_id: `local-${loc.name}`,
        lat: loc.lat.toString(),
        lon: loc.lng.toString(),
        is_local: true,
        type: loc.type
      }));

    // Se houver correspondência exata ou muito forte com nossos dados locais, NÃO buscar na API para evitar erros
    const hasStrongLocalMatch = localResults.some(r => r.description.toLowerCase().startsWith(normalizedQuery));

    if (hasStrongLocalMatch || query.length < 3) {
      setSearchResults(localResults as any);
      setIsSearching(false);
      return;
    }

    // 2. Nominatim (OpenStreetMap) - Apenas se não tiver certeza localmente
    try {
      // Bounding Box Estrita para Quelimane:
      // minLon: 36.80, minLat: -17.95
      // maxLon: 37.05, maxLat: -17.80 (Inclui Zalala e Cidade)
      const viewbox = '36.80,-17.95,37.05,-17.80';
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=1&limit=10&addressdetails=1&countrycodes=mz`;

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'pt-MZ,pt;q=0.9'
        }
      });
      const data = await response.json();

      const osmResults = data.map((item: any) => ({
        description: item.display_name, // Nome completo do OSM
        place_id: item.place_id.toString(),
        lat: item.lat,
        lon: item.lon,
        is_local: false,
        type: item.type || 'landmark' // Pode ser 'bakery', 'bank', etc.
      }));

      // Combinar, mas manter locais no topo
      setSearchResults([...localResults, ...osmResults] as any);
    } catch (error) {
      console.error('Nominatim search error:', error);
      setSearchResults(localResults as any);
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = (result: any) => {
    const loc: LocationType = {
      name: result.description.split(',')[0],
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };

    if (activeSearchField === 'pickup') {
      setPickup(loc);
      setMapCenter([loc.lat, loc.lng]);
    } else if (activeSearchField === 'destination') {
      setDestination(loc);
      setMapCenter([loc.lat, loc.lng]);
    } else if (activeSearchField === 'stop' && activeStopIndex !== null) {
      const newStops = [...stops];
      newStops[activeStopIndex] = loc;
      setStops(newStops);
      setMapCenter([loc.lat, loc.lng]);
    }

    setActiveSearchField(null);
    setIsSelectingOnMap(false);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleMapClick = async (latlng: [number, number]) => {
    if (!isSelectingOnMap || !activeSearchField) return;

    const [lat, lng] = latlng;
    setIsLoading(true);

    const addressName = await reverseGeocode(lat, lng);
    const loc: LocationType = {
      name: addressName,
      lat,
      lng
    };

    if (activeSearchField === 'pickup') {
      setPickup(loc);
    } else if (activeSearchField === 'stop' && activeStopIndex !== null) {
      const newStops = [...stops];
      newStops[activeStopIndex] = loc;
      setStops(newStops);
    } else {
      setDestination(loc);
    }

    setIsSelectingOnMap(false);
    setActiveSearchField(null);
    setActiveStopIndex(null);
    setIsLoading(false);
  };

  // Rebuild the driver list when map center changes significantly to keep "mock" drivers around
  // In a real app, this would query a backend with a bounding box
  React.useEffect(() => {
    if (nearbyDrivers.length > 0 && nearbyDrivers[0].id.startsWith('mock_')) {
      fetchDrivers();
    }
  }, [pickup, destination]); // Removing the geolocation logic from here as it's now handled in the initial useEffect

  React.useEffect(() => {
    if (pickup && destination) {
      const dist = calculateDistance(pickup, destination);
      setDistance(dist);

      // Basic pricing logic
      const baseFare = serviceType === 'moto' ? 50 : 100;
      const ratePerKm = serviceType === 'moto' ? 25 : 45;
      const price = Math.max(baseFare, Math.round(baseFare + (dist * ratePerKm)));
      setEstimatedPrice(price);

      // We DON'T auto-center here anymore because it breaks dragging
      // Centering is now handled by: 
      // 1. Initial user location fetch
      // 2. Explicit search result selection
      // 3. Step transition (fit bounds)
    }
  }, [pickup, destination, serviceType]);

  const handleConfirmRide = async () => {
    if (!pickup || !destination) return;
    setIsLoading(true);
    setMatchStatus('searching');
    setStep(3);

    try {
      // 1. Create ride entry in Supabase
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id,
          pickup_location: pickup.name,
          destination_location: destination.name,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dest_lat: destination.lat,
          dest_lng: destination.lng,
          stops: stops.filter(s => s.lat !== 0), // Salvar apenas paragens válidas
          payment_method: paymentMethod,
          estimate: estimatedPrice.toString(),
          distance: distance,
          status: 'pending'
        }])
        .select()
        .single();

      if (rideError) throw rideError;

      // 2. Matching logic - Busca e ordena pelo mais próximo
      const { data: drivers, error: driverError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .eq('is_available', true)
        .eq('status', 'active');

      if (driverError) throw driverError;

      setTimeout(async () => {
        if (!drivers || drivers.length === 0) {
          setMatchStatus('busy');
        } else {
          // Ordenar por distância do pickup usando a fórmula de Haversine já definida no arquivo
          const sortedDrivers = [...drivers].sort((a, b) => {
            const distA = calculateDistance(
              { lat: a.current_lat, lng: a.current_lng, name: 'A' },
              pickup
            );
            const distB = calculateDistance(
              { lat: b.current_lat, lng: b.current_lng, name: 'B' },
              pickup
            );
            return distA - distB;
          });

          const driver = sortedDrivers[0];
          const distToDriver = calculateDistance(
            { lat: driver.current_lat, lng: driver.current_lng, name: 'Driver' },
            pickup
          );

          setDriverInfo(driver);
          setMatchStatus('found');
          // ETA: Média de 5 min por KM em Quelimane
          setEta(Math.max(1, Math.round(distToDriver * 5)));

          await supabase
            .from('rides')
            .update({ status: 'accepted', driver_id: driver.id })
            .eq('id', ride.id);
        }
        setIsLoading(false);
      }, 2000);

    } catch (error) {
      console.error('Ride error:', error);
      setIsLoading(false);
      setMatchStatus('busy');
    }
  };

  return (
    <div className="h-full relative bg-black overflow-hidden">
      <Header
        title="Pedir Viagem"
        onBack={step === 1 ? () => onNavigate('home') : () => setStep(1)}
      />

      {/* Map Background with Drag-to-Select Logic */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          center={mapCenter}
          pickup={pickup}
          destination={destination}
          stops={stops}
          userLocation={userLocation || undefined}
          drivers={nearbyDrivers}
          height="100%"
          onMoveEnd={(newCenter) => setMapCenter(newCenter)}
          onClick={handleMapClick}
        />
      </div>

      {/* Map Selection Overlay - Premium Style */}
      <AnimatePresence>
        {isSelectingOnMap && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-[100px] left-4 right-4 z-[100] bg-[#FBBF24] p-5 rounded-[24px] shadow-[0_20px_40px_rgba(251,191,36,0.4)] flex items-center justify-between border-2 border-white/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center animate-bounce shadow-lg">
                <MapPin size={20} className="text-[#FBBF24]" />
              </div>
              <div className="pointer-events-none">
                <p className="text-black font-black text-sm uppercase tracking-tight leading-none mb-1">Escolher no Mapa</p>
                <p className="text-black/70 text-[10px] font-bold uppercase tracking-wider">Toca onde queres marcar</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSelectingOnMap(false);
                setActiveSearchField(null);
                setActiveStopIndex(null);
              }}
              className="bg-black/10 hover:bg-black/20 px-4 py-2.5 rounded-xl text-black text-[10px] font-black uppercase transition-all active:scale-95 border border-black/5"
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recenter Button */}
      {userLocation && (
        <button
          onClick={() => {
            setMapCenter(userLocation);
            // If dragging moved us away, this resets us to user location for pickup
            if (!pickup) setPickup({ name: 'Minha Localização', lat: userLocation[0], lng: userLocation[1] });
          }}
          className="absolute bottom-32 right-4 z-30 bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-lg text-white hover:bg-white/20 transition-all"
        >
          <Navigation size={24} className="text-[#FBBF24]" />
        </button>
      )}

      {/* Floating Search Container - Uber Style */}
      {step === 1 && (
        <div className="absolute top-[88px] left-4 right-4 z-40 pointer-events-none">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#1a1a1a]/95 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-3 pointer-events-auto"
          >
            <div className="relative space-y-2">
              <div className="absolute left-[13px] top-6 bottom-6 w-[1px] bg-white/10 border-l border-dashed border-white/20"></div>

              {/* Pickup */}
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)] z-10"></div>
                <div className="flex-1 bg-white/5 rounded-xl border border-white/10 flex items-center px-3 py-2">
                  <input
                    placeholder="Onde estás?"
                    className="bg-transparent border-none text-white text-xs w-full focus:ring-0 placeholder:text-gray-600 font-medium"
                    value={activeSearchField === 'pickup' ? searchTerm : (pickup?.name || '')}
                    onFocus={() => { setActiveSearchField('pickup'); setSearchTerm(''); }}
                    onChange={(e) => { setSearchTerm(e.target.value); handleSearch(e.target.value); }}
                  />
                </div>
              </div>

              {/* Dynamic Stops */}
              <AnimatePresence>
                {stops.map((stop, index) => (
                  <motion.div
                    key={`stop-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-2.5 h-2.5 rounded-sm bg-white/40 z-10 flex items-center justify-center text-[6px] text-black font-bold">{index + 1}</div>
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/10 flex items-center px-3 py-2">
                      <input
                        placeholder="Adicionar paragem"
                        className="bg-transparent border-none text-white text-xs w-full focus:ring-0 placeholder:text-gray-600 font-medium"
                        value={(activeSearchField === 'stop' && activeStopIndex === index) ? searchTerm : (stop.name || '')}
                        onFocus={() => { setActiveSearchField('stop'); setActiveStopIndex(index); setSearchTerm(''); }}
                        onChange={(e) => { setSearchTerm(e.target.value); handleSearch(e.target.value); }}
                      />
                      <button
                        onClick={() => {
                          const newStops = stops.filter((_, i) => i !== index);
                          setStops(newStops);
                        }}
                        className="text-gray-500 hover:text-red-400 p-1"
                      >
                        <AlertCircle size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Destination */}
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-[#FBBF24] shadow-[0_0_10px_rgba(251,191,36,0.6)] z-10"></div>
                <div className="flex-1 bg-white/5 rounded-xl border border-white/10 flex items-center px-3 py-2 relative">
                  <input
                    placeholder="Para onde vais?"
                    className="bg-transparent border-none text-white text-xs w-full focus:ring-0 placeholder:text-gray-600 font-medium"
                    value={activeSearchField === 'destination' ? searchTerm : (destination?.name || '')}
                    onFocus={() => { setActiveSearchField('destination'); setSearchTerm(''); }}
                    onChange={(e) => { setSearchTerm(e.target.value); handleSearch(e.target.value); }}
                  />
                  {stops.length < 3 && (
                    <button
                      onClick={() => setStops([...stops, { name: '', lat: 0, lng: 0 }])}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FBBF24]/10 hover:bg-[#FBBF24]/20 text-[#FBBF24] p-1.5 rounded-lg transition-colors border border-[#FBBF24]/20"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {activeSearchField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 bg-black/40 rounded-2xl overflow-hidden border border-white/5 max-h-[250px] overflow-y-auto"
                >
                  {/* Option to Select on Map */}
                  <button
                    onClick={() => setIsSelectingOnMap(true)}
                    className="w-full p-4 text-left hover:bg-[#FBBF24]/10 border-b border-white/5 flex items-center gap-4 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FBBF24]/10 flex items-center justify-center text-[#FBBF24]">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#FBBF24]">Escolher no mapa</p>
                      <p className="text-[10px] text-gray-500">Marca o ponto exato manualmente</p>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-gray-600" />
                  </button>

                  {(searchTerm ? searchResults : QUELIMANE_LOCATIONS.slice(0, 8).map(l => ({ description: `${l.name}, Quelimane`, is_local: true, type: l.type, lat: l.lat.toString(), lon: l.lng.toString() }))).map((result: any, index) => {
                    const name = result.description.split(',')[0];
                    const type = result.type || 'landmark';
                    return (
                      <button
                        key={index}
                        onClick={() => selectLocation(result)}
                        className="w-full p-4 text-left hover:bg-white/10 border-b border-white/5 last:border-none flex items-center gap-4 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-[#FBBF24] transition-colors">
                          {type === 'street' ? <Navigation size={18} /> : <MapPin size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{name}</p>
                          <p className="text-[10px] text-gray-500 truncate">Quelimane, Moçambique</p>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Bottom Sheet UI - Draggable */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-50 touching-action-none"
        initial={{ y: "80%" }}
        animate={{ y: 0 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 300 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          // Snap logic: if dragged down significantly, stay down (but peek), else snap up
          // This is a simplified "drawer" behavior
        }}
      >
        <div className="bg-white dark:bg-[#1a1a1a] rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-6 pb-12 border-t border-gray-100 dark:border-white/10 transition-colors duration-300">
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-white/20 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing"></div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="bottom_step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setServiceType('moto')}
                    className={`relative overflow-hidden p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${serviceType === 'moto'
                      ? 'border-[#FBBF24] bg-[#FBBF24]/10'
                      : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5'
                      }`}
                  >
                    <img src="/mota.png" alt="Moto" className="w-20 h-14 object-contain contrast-125 drop-shadow-lg" />
                    <span className="text-sm font-bold text-gray-800 dark:text-white">Moto Taxi</span>
                    <span className="text-[9px] uppercase font-black text-[#FBBF24] tracking-widest">Rápido</span>
                  </button>

                  <button
                    onClick={() => setServiceType('txopela')}
                    className={`relative overflow-hidden p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${serviceType === 'txopela'
                      ? 'border-[#FBBF24] bg-[#FBBF24]/10'
                      : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5'
                      }`}
                  >
                    <img src="/txopela.png" alt="Txopela" className="w-20 h-14 object-contain contrast-125 drop-shadow-lg" />
                    <span className="text-sm font-bold text-gray-800 dark:text-white">Txopela</span>
                    <span className="text-[9px] uppercase font-black text-gray-500 dark:text-gray-400 tracking-widest">Conforto</span>
                  </button>
                </div>

                {distance > 0 && (
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2 text-gray-400 dark:text-white/50 text-xs font-bold uppercase tracking-widest">
                      <RouteIcon size={14} />
                      {distance.toFixed(1)} km
                    </div>
                    <div className="text-2xl font-black text-[#FBBF24]">
                      {estimatedPrice} <span className="text-xs text-gray-400 dark:text-white/50">MZN</span>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full h-16 text-xl rounded-2xl shadow-xl shadow-[#FBBF24]/20 text-black font-black bg-[#FBBF24] hover:bg-[#F59E0B]"
                  disabled={!pickup || !destination}
                  onClick={() => {
                    if (pickup && destination) {
                      setMapCenter([(pickup.lat + destination.lat) / 2, (pickup.lng + destination.lng) / 2]);
                    }
                    setStep(2);
                  }}
                >
                  Confirmar <ChevronRight className="ml-2" />
                </Button>
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="bottom_step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Trip Details Card */}
                <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10 space-y-4">
                  {/* Trip Stats Row */}
                  <div className="flex justify-between items-center bg-gray-100 dark:bg-black/20 p-4 rounded-2xl">
                    <div className="flex flex-col items-center flex-1 border-r border-gray-200 dark:border-white/10">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Distância</span>
                      <div className="flex items-center gap-1.5 text-gray-800 dark:text-white">
                        <RouteIcon size={16} className="text-[#3B82F6]" />
                        <span className="text-lg font-bold">{distance?.toFixed(1)} km</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Tempo</span>
                      <div className="flex items-center gap-1.5 text-gray-800 dark:text-white">
                        <AlertCircle size={16} className="text-[#3B82F6]" />
                        <span className="text-lg font-bold">{Math.round(distance * 3)} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-white/10"></div>

                  {/* Payment & Price Row */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Método de Pagamento</p>
                      <div className="flex gap-2">
                        {['cash', 'mpesa', 'emola'].map(m => (
                          <button
                            key={m}
                            onClick={() => setPaymentMethod(m as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${paymentMethod === m
                              ? 'bg-[#FBBF24] text-black shadow-lg shadow-[#FBBF24]/30'
                              : 'bg-white dark:bg-white/5 text-gray-400 border border-gray-100 dark:border-white/5'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-1">Total a Pagar</p>
                      <p className="text-4xl font-black text-[#FBBF24] tracking-tight">
                        {estimatedPrice} <span className="text-lg text-[#FBBF24]/80">MT</span>
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-16 text-xl rounded-2xl shadow-2xl shadow-[#FBBF24]/30 text-black font-black bg-[#FBBF24] hover:bg-[#F59E0B]"
                  isLoading={isLoading}
                  onClick={handleConfirmRide}
                >
                  Confirmar Pedido
                </Button>
              </motion.div>
            ) : (
              <div className="py-6 text-center">
                {matchStatus === 'searching' && (
                  <div className="space-y-4">
                    <div className="w-16 h-16 border-4 border-[#FBBF24]/20 border-t-[#FBBF24] rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-800 dark:text-white font-bold uppercase tracking-widest text-sm">Buscando Motorista...</p>
                  </div>
                )}
                {/* ... existing match status UI with updated text colors ... */}
                {matchStatus === 'found' && (
                  <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/10 text-left">
                    <div className="w-16 h-16 rounded-2xl bg-[#FBBF24] overflow-hidden">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driverInfo?.id}`} alt="Driver" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 font-bold uppercase">{driverInfo?.vehicle_plate}</p>
                      <p className="text-lg font-black text-gray-800 dark:text-white">{driverInfo?.full_name?.split(' ')[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-[#FBBF24]">{eta}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">MIN</p>
                    </div>
                  </div>
                )}
                {matchStatus === 'busy' && (
                  <div className="space-y-4">
                    <AlertCircle className="text-red-500 mx-auto" size={48} />
                    <p className="text-gray-800 dark:text-white font-bold">Motoristas Ocupados</p>
                    <Button onClick={() => setStep(1)} className="bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white">Tentar Novamente</Button>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}