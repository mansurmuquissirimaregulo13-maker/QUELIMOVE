import * as React from 'react';
import { Button } from '../components/ui/Button';
import { BottomNav } from '../components/BottomNav';
import {
  ToggleRight,
  ToggleLeft,
  MapPin,
  Navigation,
  CheckCircle,
  XCircle,
  Route as RouteIcon
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LeafletMapComponent as MapComponent } from '../components/LeafletMapComponent';

interface DriverDashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DriverDashboardPage({ onNavigate }: DriverDashboardPageProps) {
  const [isOnline, setIsOnline] = React.useState(false);
  const [currentRide, setCurrentRide] = React.useState<any | null>(null);
  const [driverName] = React.useState('João');
  const [vehicleInfo] = React.useState('Honda Ace • ABC-123');

  const fetchPotentialRides = async () => {
    if (!isOnline) return;
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) {
      if (data.length > 0 && !currentRide) {
        setCurrentRide(data[0]);
      }
    }
  };

  const fetchPotentialRidesCallback = React.useCallback(fetchPotentialRides, [isOnline, currentRide]);

  React.useEffect(() => {
    let watchId: number | undefined;

    const updateLocation = async (lat: number, lng: number) => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && isOnline) {
        await supabase
          .from('profiles')
          .update({
            current_lat: lat,
            current_lng: lng,
            is_available: true
          })
          .eq('id', userData.user.id);
      }
    };

    if (isOnline && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => console.error('Error watching location:', error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else if (!isOnline) {
      // Set unavailable when offline
      const setOffline = async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase
            .from('profiles')
            .update({ is_available: false })
            .eq('id', userData.user.id);
        }
      };
      setOffline();
    }

    if (isOnline) {
      fetchPotentialRidesCallback();

      const channelName = 'driver-rides-presence';
      const timeoutId = setTimeout(() => {
        const subscription = supabase
          .channel(channelName)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' }, (payload) => {
            if (payload.new.status === 'pending') {
              setCurrentRide(payload.new);
            }
          })
          .subscribe();

        (window as any)[`supabase_${channelName}`] = subscription;
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        const ch = (window as any)[`supabase_${channelName}`];
        if (ch) {
          supabase.removeChannel(ch);
          delete (window as any)[`supabase_${channelName}`];
        }
      };
    } else {
      setCurrentRide(null);
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    }
  }, [isOnline, fetchPotentialRidesCallback]);

  const handleAcceptRide = async (rideId: string) => {
    try {
      // In a real app, we'd assign the driver_id here
      const { error } = await supabase
        .from('rides')
        .update({ status: 'accepted' })
        .eq('id', rideId);

      if (!error) {

        // Open WhatsApp to notify client (if we had client phone)
        // For now, we simulate the "Scene" where the driver confirms
        if (currentRide) {
          alert('Viagem aceite! Inicie o percurso para ' + currentRide.pickup_location);
        }

        // Maybe open WhatsApp with a "I'm coming" message
        /*
        const message = `*Olá! Quelimove a caminho.*\n\n` +
          `Motorista: ${driverName}\n` +
          `Veículo: ${vehicleInfo}\n` +
          `Estou a caminho de: ${currentRide.pickup_location}`;

        // In a real flow, we'd have the client's number in the 'rides' table
        // window.open(`https://wa.me/${currentRide.client_phone}?text=${encodeURIComponent(message)}`, '_blank');
        */

        setCurrentRide(null);
      }
    } catch (err) {
      console.error('Error accepting ride:', err);
    }
  };

  const toggleOnline = () => {
    setIsOnline(!isOnline);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="px-4 pt-4 pb-4 flex items-center justify-between bg-[#0a0a0a] sticky top-0 z-40 border-b border-[#1a1a1a]">
        <div>
          <h1 className="text-xl font-bold text-white">Olá, {driverName}</h1>
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wider">{vehicleInfo}</p>
        </div>
        <button
          onClick={toggleOnline}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-lg ${isOnline ? 'bg-[#FBBF24] text-black scale-105' : 'bg-[#1a1a1a] text-[#9CA3AF] border border-[#2a2a2a]'}`}
        >
          <span className="text-sm font-bold">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          {isOnline ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {isOnline && currentRide ? (
          <div className="p-4 space-y-4">
            <div className="bg-[#1a1a1a] rounded-2xl border-2 border-[#FBBF24] overflow-hidden shadow-2xl">
              <div className="p-2">
                <MapComponent
                  center={[currentRide.pickup_lat, currentRide.pickup_lng]}
                  pickup={{ lat: currentRide.pickup_lat, lng: currentRide.pickup_lng, name: currentRide.pickup_location }}
                  destination={{ lat: currentRide.dest_lat, lng: currentRide.dest_lng, name: currentRide.destination_location }}
                  height="200px"
                />
              </div>

              <div className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-[#FBBF24]/20 text-[#FBBF24] text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1 inline-block">Nova Solicitação</span>
                    <h3 className="text-white font-bold text-lg">Cliente em {currentRide.pickup_location}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#FBBF24]">{currentRide.estimate}</p>
                    <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">{currentRide.distance?.toFixed(1)} KM</p>
                  </div>
                </div>

                <div className="space-y-4 relative py-2">
                  <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-[#2a2a2a]" />
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 flex items-center justify-center shrink-0 border border-[#3B82F6]/30">
                      <MapPin size={14} className="text-[#3B82F6]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Recolha</p>
                      <p className="text-sm text-white font-medium">{currentRide.pickup_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-[#FBBF24]/20 flex items-center justify-center shrink-0 border border-[#FBBF24]/30">
                      <Navigation size={14} className="text-[#FBBF24]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Destino</p>
                      <p className="text-sm text-white font-medium">{currentRide.destination_location}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="ghost"
                    className="border border-[#2a2a2a]"
                    onClick={() => setCurrentRide(null)}
                  >
                    <XCircle className="mr-2" size={18} />
                    Pular
                  </Button>
                  <Button
                    className="shadow-lg shadow-[#FBBF24]/20"
                    onClick={() => handleAcceptRide(currentRide.id)}
                  >
                    <CheckCircle className="mr-2" size={18} />
                    Aceitar
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a] flex items-center justify-around">
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Ganhos Hoje</p>
                <p className="text-lg font-bold text-white">0 MZN</p>
              </div>
              <div className="w-px h-8 bg-[#2a2a2a]" />
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Viagens</p>
                <p className="text-lg font-bold text-white">0</p>
              </div>
              <div className="w-px h-8 bg-[#2a2a2a]" />
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Online</p>
                <p className="text-lg font-bold text-white">0h</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-8 space-y-6">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-8 rounded-3xl border border-[#2a2a2a] text-center space-y-4">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all ${isOnline ? 'bg-[#FBBF24]/20' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}>
                {isOnline ? <RouteIcon size={40} className="text-[#FBBF24] animate-pulse" /> : <ToggleLeft size={40} className="text-[#4B5563]" />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{isOnline ? 'Procurando passageiros...' : 'Estás Offline'}</h3>
                <p className="text-sm text-[#9CA3AF] mt-1">{isOnline ? 'Aguarde por novos pedidos na sua zona' : 'Fica online para começar a lucrar'}</p>
              </div>
              {!isOnline && (
                <Button onClick={toggleOnline} className="w-full mt-4">
                  Ficar Online
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a]">
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Total Mês</p>
                <p className="text-xl font-bold text-white">4.500 MZN</p>
              </div>
              <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a]">
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Avaliação</p>
                <p className="text-xl font-bold text-white">★ 4.9</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav
        activeTab="driver-dash"
        onTabChange={(tab) => onNavigate(tab)}
        userType="driver"
      />
    </div>
  );
}