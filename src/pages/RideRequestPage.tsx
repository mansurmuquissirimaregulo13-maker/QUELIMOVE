import * as React from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/ui/Button';
import { BottomNav } from '../components/BottomNav';
import {
  MapPin,
  Navigation,
  ChevronRight,
  Route as RouteIcon,
  AlertCircle,
  Plus,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QUELIMANE_LOCATIONS, Location as LocationType } from '../constants';
import { supabase } from '../lib/supabase';
import { LeafletMapComponent as MapComponent } from '../components/LeafletMapComponent';
import { useNotifications } from '../hooks/useNotifications';

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
  const [eta, setEta] = React.useState<number | null>(null);
  const [driverInfo, setDriverInfo] = React.useState<any | null>(null);
  const { notify } = useNotifications();
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'mpesa' | 'emola'>('cash');
  const [serviceType, setServiceType] = React.useState<'moto' | 'txopela'>('moto');

  const [mapCenter, setMapCenter] = React.useState<[number, number]>([-17.8764, 36.8878]);
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [distance, setDistance] = React.useState(0);
  const [estimatedPrice, setEstimatedPrice] = React.useState(0);

  // Search state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [activeSearchField, setActiveSearchField] = React.useState<'pickup' | 'destination' | 'stop' | null>(null);
  const [activeStopIndex, setActiveStopIndex] = React.useState<number | null>(null);
  const [isSelectingOnMap, setIsSelectingOnMap] = React.useState(false);
  const [stops, setStops] = React.useState<LocationType[]>([]);

  // Match state
  const [matchStatus, setMatchStatus] = React.useState<'idle' | 'searching' | 'found' | 'busy'>('idle');


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
        { enableHighAccuracy: true }
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


    // 1. Busca local (Constants de Quelimane) - PRIORIDADE MÁXIMA
    const normalizedQuery = query.toLowerCase().trim();
    const localResults = QUELIMANE_LOCATIONS.filter(l =>
      l.type === 'school' &&
      l.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).map(loc => ({
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
      // Finalizado
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
    console.log('handleMapClick triggered with:', latlng, 'isSelectingOnMap:', isSelectingOnMap);
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
      // 1. Criar entrada da viagem no Supabase
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .insert([{
          user_id: (await supabase.auth.getUser()).data.user?.id || 'anonymous',
          pickup_location: pickup.name,
          destination_location: destination.name,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dest_lat: destination.lat,
          dest_lng: destination.lng,
          stops: stops.filter(s => s.lat !== 0),
          payment_method: paymentMethod,
          estimate: estimatedPrice.toString(),
          distance: distance,
          status: 'pending'
        }])
        .select()
        .single();

      if (rideError) throw rideError;

      // 2. Escutar mudanças nesta viagem específica
      const rideChannel = supabase
        .channel(`ride-tracking-${ride.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rides',
            filter: `id=eq.${ride.id}`
          },
          async (payload) => {
            console.log('Ride update received:', payload.new);

            if (payload.new.status === 'accepted' && payload.new.driver_id) {
              // Motorista aceitou! Parar despacho e atualizar UI
              const { data: driver } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', payload.new.driver_id)
                .single();

              if (driver) {
                setDriverInfo(driver);
                setMatchStatus('found');

                // Notificação Nativa: Motorista Aceitou (Requisito: App Real)
                notify({
                  title: 'Motorista Encontrado!',
                  body: `${driver.full_name} aceitou o seu pedido e está a caminho.`
                });

                subscribeToDriverLocation(driver.id);
              }
            }
          }
        )
        .subscribe();

      // Armazenar canal para limpeza
      (window as any)[`ride_channel_${ride.id}`] = rideChannel;

      // 3. Iniciar Motor de Despacho Sequencial (Requisito 2 e 3)
      startDispatchSystem(ride.id);

    } catch (error) {
      console.error('Ride error:', error);
      setIsLoading(false);
      setMatchStatus('busy');
    }
  };

  const startDispatchSystem = async (rideId: string) => {
    try {
      // a. Buscar motoristas ONLINE num raio de 5km
      const { data: drivers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .eq('is_available', true)
        .eq('status', 'active');

      if (!drivers || !pickup) {
        setMatchStatus('busy');
        return;
      }

      // b. Filtrar por raio de 5km e ordenar (Requisito 2)
      const nearbyDrivers = drivers
        .map(d => ({
          ...d,
          dist: calculateDistance(pickup, { lat: d.current_lat, lng: d.current_lng, name: '' })
        }))
        .filter(d => d.dist <= 5) // Raio de 5km
        .sort((a, b) => (a.dist || 0) - (b.dist || 0));

      if (nearbyDrivers.length === 0) {
        setMatchStatus('busy');
        return;
      }

      console.log(`Encontrados ${nearbyDrivers.length} motoristas no raio de 5km.`);

      // c. Tentar despacho sequencial (Requisito 3)
      for (const driver of nearbyDrivers) {
        // Verificar se a viagem ainda está pendente antes de tentar o próximo
        const { data: currentRideStatus } = await supabase
          .from('rides')
          .select('status')
          .eq('id', rideId)
          .single();

        if (currentRideStatus?.status !== 'pending') break;

        console.log(`Enviando solicitação para motorista: ${driver.full_name}`);

        await supabase
          .from('rides')
          .update({ target_driver_id: driver.id })
          .eq('id', rideId);

        // Aguardar 1 minuto (60000ms) por resposta
        await new Promise(resolve => setTimeout(resolve, 60000));

        // Após 1 minuto, checar se alguém aceitou
        const { data: finalCheck } = await supabase
          .from('rides')
          .select('status')
          .eq('id', rideId)
          .single();

        if (finalCheck?.status !== 'pending') {
          console.log("Viagem foi aceita!");
          break;
        }

        console.log(`Motorista ${driver.full_name} não respondeu em 1 min. Tentando próximo...`);
      }

      // Se sair do loop e continuar pendente, ninguém aceitou
      const { data: lastCheck } = await supabase
        .from('rides')
        .select('status')
        .eq('id', rideId)
        .single();

      if (lastCheck?.status === 'pending') {
        setMatchStatus('busy');
      }

    } catch (err) {
      console.error('Dispatch error:', err);
    }
  };

  const subscribeToDriverLocation = (driverId: string) => {
    const driverChannel = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${driverId}`
        },
        (payload) => {
          console.log('Driver location update:', payload.new);
          const newLat = payload.new.current_lat;
          const newLng = payload.new.current_lng;

          if (typeof newLat === 'number' && typeof newLng === 'number') {
            // Atualizar o marcador do motorista no mapa
            setNearbyDrivers([{
              id: driverId,
              lat: newLat,
              lng: newLng,
              type: payload.new.vehicle_type || 'moto'
            }]);

            // Calcular ETA/Distância em tempo real
            if (pickup) {
              const distToDriver = calculateDistance(
                { lat: newLat, lng: newLng, name: 'Driver' },
                pickup
              );
              setEta(Math.max(1, Math.round(distToDriver * 5)));

              if (distToDriver < 0.3) {
                // Notificar proximidade (pode ser um alerta ou som)
                console.log('Motorista está muito perto!');
              }
            }
          }
        }
      )
      .subscribe();

    (window as any)[`driver_tracking_${driverId}`] = driverChannel;
  };

  return (
    <div className="h-full relative bg-[var(--bg-primary)] overflow-hidden transition-colors duration-300">
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
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute top-24 left-4 right-4 z-[100] bg-[#FBBF24] p-5 rounded-[28px] shadow-[0_25px_60px_rgba(251,191,36,0.5)] flex items-center justify-between border-2 border-white/30 backdrop-blur-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center animate-pulse shadow-xl ring-4 ring-black/5">
                <MapPin size={24} className="text-[#FBBF24]" />
              </div>
              <div>
                <p className="text-black font-black text-base uppercase tracking-tight leading-none mb-1">Clica no Mapa</p>
                <p className="text-black/80 text-[11px] font-bold uppercase tracking-wider">
                  Marca o local de {activeSearchField === 'pickup' ? 'partida' : (activeSearchField === 'stop' ? 'paragem' : 'destino')}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSelectingOnMap(false);
              }}
              className="bg-black text-[#FBBF24] px-5 py-3 rounded-2xl text-[11px] font-black uppercase transition-all active:scale-95 shadow-lg border border-black/10"
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crosshair indicator when selecting */}
      {isSelectingOnMap && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="w-8 h-8 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-[#FBBF24] shadow-lg"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-[#FBBF24] shadow-lg"></div>
            <div className="absolute inset-0 rounded-full border-2 border-[#FBBF24] animate-ping opacity-50"></div>
          </div>
        </div>
      )}

      {/* Recenter Button */}
      {userLocation && (
        <>
          <button
            onClick={() => {
              setMapCenter(userLocation);
              // If dragging moved us away, this resets us to user location for pickup
              if (!pickup) setPickup({ name: 'Minha Localização', lat: userLocation[0], lng: userLocation[1] });
            }}
            className="absolute bottom-32 right-4 z-30 bg-[var(--bg-elevated)] backdrop-blur-md p-3 rounded-full border border-[var(--border-color)] shadow-lg text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
          >
            <Navigation size={24} className="text-[#FBBF24]" />
          </button>

          {/* SIMULATION BUTTON (DEV ONLY) */}
          <button
            onClick={async () => {
              // Create a fake driver near the user
              const fakeDriverLat = userLocation[0] + 0.002; // Slightly offset
              const fakeDriverLng = userLocation[1] + 0.002;

              try {
                // Check if a ghost driver exists or create/update one
                // For simplicity, we will update the profile of a known test user OR just insert a ride that thinks it has a driver?
                // Actually, the easiest way to test 'finding' is to have a driver in 'profiles' with is_available=true

                // Let's toggle a 'ghost' driver state in the local app state to 'fake' a found driver if real backend is too complex
                // BUT user asked for "Simulacao que ja tem motorista".
                // Let's create a visual simulation first.

                setMatchStatus('found');
                setDriverInfo({
                  id: 'simulated-driver',
                  full_name: 'Motorista Teste',
                  vehicle_plate: 'ABC-123',
                  vehicle_model: 'Honda Ace',
                  rating: 4.9
                });
                setEta(2);

                // Also simulate the ride moving to 'accepted' state visually
                setTimeout(() => {
                  setStep(3); // Assuming step 3 is "Ride in Progress" or similar? 
                  // Actually Step 2 is confirmation. 
                  // If we are in Step 2, we just filled the details.
                  // If we are searching (Step 3 or overlay), we show found.

                  alert('Motorista Simulado Encontrado! (Modo de Teste)');
                }, 1000);

              } catch (e) {
                console.error(e);
              }
            }}
            className="absolute top-24 left-4 z-50 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded opacity-50 hover:opacity-100"
          >
            SIMULAR MOTORISTA
          </button>
        </>
      )}

      {/* Floating Search Container - Uber Style */}
      {step === 1 && !isSelectingOnMap && (
        <div className="absolute top-[88px] left-4 right-4 z-40 pointer-events-none">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[var(--bg-glass)] backdrop-blur-xl p-4 rounded-3xl border border-[var(--border-color)] shadow-[0_20px_50px_rgba(0,0,0,0.1)] space-y-3 pointer-events-auto"
          >
            <div className="relative space-y-2">
              <div className="absolute left-[13px] top-6 bottom-6 w-[1px] bg-[var(--border-color)] border-l border-dashed"></div>

              {/* Pickup */}
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] z-10"></div>
                <div className="flex-1 bg-[var(--input-bg)] rounded-xl border border-[var(--border-color)] flex items-center px-3 py-2">
                  <input
                    placeholder="Onde estás?"
                    className="bg-transparent border-none text-[var(--text-primary)] text-xs w-full focus:ring-0 placeholder:text-[var(--text-tertiary)] font-medium"
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
                    <div className="w-2.5 h-2.5 rounded-sm bg-[var(--text-secondary)] z-10 flex items-center justify-center text-[6px] text-[var(--bg-primary)] font-bold">{index + 1}</div>
                    <div className="flex-1 bg-[var(--input-bg)] rounded-xl border border-[var(--border-color)] flex items-center px-3 py-2">
                      <input
                        placeholder="Adicionar paragem"
                        className="bg-transparent border-none text-[var(--text-primary)] text-xs w-full focus:ring-0 placeholder:text-[var(--text-tertiary)] font-medium"
                        value={(activeSearchField === 'stop' && activeStopIndex === index) ? searchTerm : (stop.name || '')}
                        onFocus={() => { setActiveSearchField('stop'); setActiveStopIndex(index); setSearchTerm(''); }}
                        onChange={(e) => { setSearchTerm(e.target.value); handleSearch(e.target.value); }}
                      />
                      <button
                        onClick={() => {
                          const newStops = stops.filter((_, i) => i !== index);
                          setStops(newStops);
                        }}
                        className="text-[var(--text-secondary)] hover:text-red-400 p-1"
                      >
                        <AlertCircle size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Destination */}
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-[#FBBF24] shadow-[0_0_10px_rgba(251,191,36,0.3)] z-10"></div>
                <div className="flex-1 bg-[var(--input-bg)] rounded-xl border border-[var(--border-color)] flex items-center px-3 py-2 relative">
                  <input
                    placeholder="Para onde vais?"
                    className="bg-transparent border-none text-[var(--text-primary)] text-xs w-full focus:ring-0 placeholder:text-[var(--text-tertiary)] font-medium"
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
                  className="mt-2 bg-[var(--bg-elevated)] rounded-2xl overflow-hidden border border-[var(--border-color)] max-h-[250px] overflow-y-auto"
                >
                  {/* Option to Select on Map */}
                  <button
                    onClick={() => setIsSelectingOnMap(true)}
                    className="w-full p-4 text-left hover:bg-[#FBBF24]/10 border-b border-[var(--border-color)] flex items-center gap-4 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FBBF24]/10 flex items-center justify-center text-[#FBBF24]">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#FBBF24]">Escolher no mapa</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">Marca o ponto exato manualmente</p>
                    </div>
                    <ChevronRight size={16} className="ml-auto text-[var(--text-tertiary)]" />
                  </button>

                  {(searchTerm ? searchResults : QUELIMANE_LOCATIONS.slice(0, 8).map(l => ({ description: `${l.name}, Quelimane`, is_local: true, type: l.type, lat: l.lat.toString(), lon: l.lng.toString() }))).map((result: any, index) => {
                    const name = result.description.split(',')[0];
                    const type = result.type || 'landmark';
                    return (
                      <button
                        key={index}
                        onClick={() => selectLocation(result)}
                        className="w-full p-4 text-left hover:bg-[var(--bg-secondary)] border-b border-[var(--border-color)] last:border-none flex items-center gap-4 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[#FBBF24] transition-colors">
                          {type === 'street' ? <Navigation size={18} /> : <MapPin size={18} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{name}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] truncate">Quelimane, Moçambique</p>
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
        className="absolute bottom-0 left-0 right-0 z-50 touch-none"
        initial={{ y: "80%" }}
        animate={{ y: 0 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 300 }}
        dragElastic={0.2}
      >
        <div className="bg-[var(--bg-elevated)] rounded-t-[30px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] p-6 pb-12 border-t border-[var(--border-color)] transition-all duration-300">
          {/* Drag Handle */}
          <div className="w-12 h-1.5 bg-[var(--border-color)] rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing"></div>

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
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
                      }`}
                  >
                    <img src="/mota.png" alt="Moto" className="w-20 h-14 object-contain contrast-125 drop-shadow-lg" />
                    <span className="text-sm font-bold text-[var(--text-primary)]">Moto Taxi</span>
                    <span className="text-[9px] uppercase font-black text-[#FBBF24] tracking-widest">Rápido</span>
                  </button>

                  <button
                    onClick={() => setServiceType('txopela')}
                    className={`relative overflow-hidden p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${serviceType === 'txopela'
                      ? 'border-[#FBBF24] bg-[#FBBF24]/10'
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
                      }`}
                  >
                    <img src="/txopela.png" alt="Txopela" className="w-20 h-14 object-contain contrast-125 drop-shadow-lg" />
                    <span className="text-sm font-bold text-[var(--text-primary)]">Txopela</span>
                    <span className="text-[9px] uppercase font-black text-[var(--text-secondary)] opacity-50 tracking-widest">Conforto</span>
                  </button>
                </div>

                {distance > 0 && (
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest opacity-70">
                      <RouteIcon size={14} />
                      {distance.toFixed(1)} km
                    </div>
                    <div className="text-2xl font-black text-[#FBBF24]">
                      {estimatedPrice} <span className="text-xs text-[var(--text-secondary)] opacity-50">MZN</span>
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
                <div className="bg-[var(--bg-secondary)] p-5 rounded-3xl border border-[var(--border-color)] space-y-4">
                  {/* Trip Stats Row */}
                  <div className="flex justify-between items-center bg-[var(--bg-primary)] p-4 rounded-2xl border border-[var(--border-color)]">
                    <div className="flex flex-col items-center flex-1 border-r border-[var(--border-color)]">
                      <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest mb-1">Distância</span>
                      <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                        <RouteIcon size={16} className="text-[#3B82F6]" />
                        <span className="text-lg font-bold">{distance?.toFixed(1)} km</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-widest mb-1">Tempo</span>
                      <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                        <AlertCircle size={16} className="text-[#3B82F6]" />
                        <span className="text-lg font-bold">{Math.round(distance * 3)} min</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-[var(--border-color)]"></div>

                  {/* Payment & Price Row */}
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase mb-2">Método de Pagamento</p>
                      <div className="flex gap-2">
                        {['cash', 'mpesa', 'emola'].map(m => (
                          <button
                            key={m}
                            onClick={() => setPaymentMethod(m as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${paymentMethod === m
                              ? 'bg-[#FBBF24] text-black shadow-lg shadow-[#FBBF24]/30'
                              : 'bg-[var(--bg-primary)] text-[var(--text-tertiary)] border border-[var(--border-color)]'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[var(--text-secondary)] font-black uppercase mb-1">Total a Pagar</p>
                      <p className="text-4xl font-black text-[#FBBF24] tracking-tight">
                        {estimatedPrice} <span className="text-lg text-[#FBBF24]/60">MT</span>
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
                    <p className="text-[var(--text-primary)] font-bold uppercase tracking-widest text-sm">Buscando Motorista...</p>
                  </div>
                )}
                {/* ... existing match status UI with updated text colors ... */}
                {matchStatus === 'found' && (
                  <div className="flex items-center gap-4 bg-[var(--bg-secondary)] p-4 rounded-3xl border border-[var(--border-color)] text-left shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-[#FBBF24] overflow-hidden shadow-inner">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${driverInfo?.id}`} alt="Driver" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[var(--text-secondary)] font-bold uppercase opacity-60">{driverInfo?.vehicle_plate}</p>
                      <p className="text-lg font-black text-[var(--text-primary)]">{driverInfo?.full_name?.split(' ')[0]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-[#FBBF24]">{eta}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase">MIN</p>
                      {driverInfo?.phone && (
                        <button
                          onClick={() => window.open(`tel:${driverInfo.phone}`)}
                          className="mt-2 text-xs bg-[#FBBF24]/20 text-[#FBBF24] px-3 py-1 rounded-full border border-[#FBBF24]/30 flex items-center justify-end gap-1 ml-auto"
                        >
                          <Phone size={12} fill="currentColor" />
                          Ligar
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {matchStatus === 'busy' && (
                  <div className="space-y-4">
                    <AlertCircle className="text-red-500 mx-auto" size={48} />
                    <p className="text-[var(--text-primary)] font-bold">Motoristas Ocupados</p>
                    <Button onClick={() => setStep(1)} variant="outline">Tentar Novamente</Button>
                  </div>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <BottomNav activeTab="ride" onTabChange={(tab) => onNavigate(tab)} userType="client" />
    </div>
  );
}