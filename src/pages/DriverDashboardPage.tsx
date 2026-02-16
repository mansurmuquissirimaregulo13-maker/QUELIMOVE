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
  Phone,
  Clock as LucideClock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LeafletMapComponent as MapComponent } from '../components/LeafletMapComponent';
import { requestForToken } from '../lib/firebase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNotifications } from '../hooks/useNotifications';

// Haversine formula to calculate distance in KM
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface DriverDashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DriverDashboardPage({ onNavigate }: DriverDashboardPageProps) {
  const [isOnline, setIsOnline] = React.useState(false);
  const [lastCoords, setLastCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [currentRide, setCurrentRide] = React.useState<any | null>(null);
  const [driverName, setDriverName] = React.useState('Motorista');
  const [vehicleInfo, setVehicleInfo] = React.useState('Carregando...');
  // Initialize with cached status to prevent flashing "Analysis" screen
  const [driverStatus, setDriverStatus] = React.useState<'active' | 'pending' | 'rejected'>(() => {
    const cached = localStorage.getItem('driverStatus');
    return (cached as 'active' | 'pending' | 'rejected') || 'pending';
  });

  const { notify } = useNotifications();

  // Monitorar mudanças na corrida atual
  React.useEffect(() => {
    if (!currentRide) return;

    const rideChannel = supabase
      .channel(`driver-active-ride-${currentRide.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${currentRide.id}`
        },
        (payload) => {
          if (payload.new.status === 'cancelled') {
            notify({ title: 'Atenção', body: 'A viagen foi cancelada pelo cliente.' });
            setCurrentRide(null);
          } else {
            setCurrentRide(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rideChannel);
    };
  }, [currentRide?.id]);

  const fetchPotentialRides = async () => {
    if (!isOnline) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    if (currentRide && currentRide.status !== 'completed' && currentRide.status !== 'cancelled') return;

    const { data } = await supabase
      .from('rides')
      .select('*')
      .in('status', ['pending', 'accepted', 'arrived', 'in_progress'])
      .or(`target_driver_id.is.null,target_driver_id.eq.${userData.user.id},driver_id.eq.${userData.user.id}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setCurrentRide(data[0]);
    }
  };

  const fetchPotentialRidesCallback = React.useCallback(fetchPotentialRides, [isOnline, currentRide]);

  // Optimized Location Update
  const updateLocationInDB = async (lat: number, lng: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && isOnline) {
        // Fire and forget - don't await to improve UI responsiveness
        supabase
          .from('profiles')
          .update({
            current_lat: lat,
            current_lng: lng,
            is_available: true,
            last_online: new Date().toISOString()
          })
          .eq('id', userData.user.id)
          .then(({ error }) => {
            if (error) console.error('Background location update error:', error);
          });

        setLastCoords({ lat, lng });
      }
    } catch (err) {
      console.error('Location update failed:', err);
    }
  };

  React.useEffect(() => {
    let watchId: number | undefined;
    let syncInterval: number | undefined;

    if (isOnline) {
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setLastCoords({ lat: latitude, lng: longitude });
          },
          (error) => console.error('Error watching location:', error),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }

      syncInterval = window.setInterval(() => {
        if (lastCoords) {
          updateLocationInDB(lastCoords.lat, lastCoords.lng);
        }
      }, 5000);

      fetchPotentialRidesCallback();

      const channelName = 'driver-rides-presence';
      const subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'rides' },
          (payload) => {
            if (payload.new.status === 'pending' && !currentRide) {
              setCurrentRide(payload.new);
              notify({
                title: 'Nova Corrida!',
                body: `Passageiro em ${payload.new.pickup_location}. Valor: ${payload.new.estimate} MZN`
              });
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2505/2505-preview.mp3');
              audio.play().catch(e => console.log('Audio error', e));
            }
          }
        )
        .subscribe();

      return () => {
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        if (syncInterval) clearInterval(syncInterval);
        supabase.removeChannel(subscription);
      };
    } else {
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
      setCurrentRide(null);
    }
  }, [isOnline, fetchPotentialRidesCallback, lastCoords]);

  const [passengerPhone, setPassengerPhone] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchPassengerPhone = async () => {
      if (currentRide && currentRide.user_id) {
        const { data } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', currentRide.user_id)
          .single();
        if (data) setPassengerPhone(data.phone);
      } else {
        setPassengerPhone(null);
      }
    };
    fetchPassengerPhone();
  }, [currentRide]);



  const fetchDriverProfile = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    // First try to get from cache to display immediately
    const cachedStatus = localStorage.getItem('driverStatus');
    if (cachedStatus) {
      setDriverStatus(cachedStatus as any);
      if (cachedStatus !== 'active') setIsOnline(false);
    }

    // Then update from network
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, vehicle_type, vehicle_plate, status')
      .eq('id', userData.user.id)
      .single();

    if (profile) {
      setDriverName(profile.full_name || 'Motorista');
      setVehicleInfo(`${profile.vehicle_type || 'Moto'} • ${profile.vehicle_plate || 'S/M'}`);

      // Update state and cache
      setDriverStatus(profile.status as any);
      localStorage.setItem('driverStatus', profile.status);

      if (profile.status !== 'active') {
        setIsOnline(false);
      }
    }
  };

  React.useEffect(() => {
    fetchDriverProfile();
  }, []);

  const handleAcceptRide = async (rideId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Use atomic function to prevent race conditions
      const { data: success, error } = await supabase
        .rpc('accept_ride_atomic', {
          ride_id: rideId,
          driver_id: userData.user.id
        });

      if (error) {
        // Fallback for when function doesn't exist yet
        console.warn('Atomic Accept failed, falling back to standard update', error);

        const { data: legacyData, error: legacyError } = await supabase
          .from('rides')
          .update({
            status: 'accepted',
            driver_id: userData.user.id,
            target_driver_id: userData.user.id
          })
          .eq('id', rideId)
          .eq('status', 'pending')
          .select();

        if (legacyError) throw legacyError;

        if (legacyData && legacyData.length > 0) {
          notify({ title: 'Viagem Aceite!', body: 'Vá ao encontro do cliente.' });
          setCurrentRide(legacyData[0]);
        } else {
          alert('Esta viagem já foi aceite por outro motorista.');
          setCurrentRide(null);
          fetchPotentialRides();
        }
        return;
      }

      if (success) {
        notify({ title: 'Viagem Aceite!', body: 'Vá ao encontro do cliente.' });
        // Fetch the active ride details to set currentRide
        const { data: ride } = await supabase
          .from('rides')
          .select('*')
          .eq('id', rideId)
          .single();
        if (ride) setCurrentRide(ride);
      } else {
        alert('Esta viagem já foi aceite por outro motorista.');
        setCurrentRide(null);
        // Refresh potential rides to remove the stale one
        fetchPotentialRides();
      }
    } catch (err) {
      console.error('Error accepting ride:', err);
      notify({ title: 'Erro', body: 'Não foi possível aceitar a viagem.' });
    }
  };

  const handleFinishRide = async () => {
    if (!currentRide) return;
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'completed' })
        .eq('id', currentRide.id);

      if (error) throw error;

      notify({ title: 'Viagem Finalizada', body: 'O valor foi adicionado aos teus ganhos.' });
      setCurrentRide(null);
    } catch (err) {
      console.error('Error finishing ride:', err);
    }
  };

  const handleArriveAtPickup = async () => {
    if (!currentRide) return;
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'arrived' })
        .eq('id', currentRide.id);
      if (error) throw error;
      notify({ title: 'Mensagem enviada', body: 'O cliente foi notificado que chegaste.' });
    } catch (err) {
      console.error('Error arriving at pickup:', err);
    }
  };

  const handleStartRide = async () => {
    if (!currentRide) return;
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'in_progress' })
        .eq('id', currentRide.id);
      if (error) throw error;
      notify({ title: 'Corrida Iniciada', body: 'Vá ao destino com segurança.' });
    } catch (err) {
      console.error('Error starting ride:', err);
    }
  };

  const [distToPickup, setDistToPickup] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (currentRide?.status === 'accepted' && lastCoords) {
      const d = calculateDistance(
        lastCoords.lat,
        lastCoords.lng,
        currentRide.pickup_lat,
        currentRide.pickup_lng
      );
      setDistToPickup(d);
    } else {
      setDistToPickup(null);
    }
  }, [currentRide?.status, lastCoords, currentRide?.pickup_lat, currentRide?.pickup_lng]);

  const toggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);

    if (nextState) {
      try {
        if (Capacitor.isNativePlatform()) {
          const permission = await PushNotifications.requestPermissions();
          if (permission.receive === 'granted') {
            await PushNotifications.register();
            PushNotifications.addListener('registration', async (token) => {
              const { data: userData } = await supabase.auth.getUser();
              if (userData.user) {
                await supabase.from('profiles').update({ fcm_token: token.value }).eq('id', userData.user.id);
              }
            });
          }
        } else {
          const token = await requestForToken();
          if (token) {
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              await supabase.from('profiles').update({ fcm_token: token }).eq('id', userData.user.id);
            }
          }
        }
      } catch (err) {
        console.error('FCM Token error:', err);
      }
    }
  };

  // Force Light Mode for Driver Dashboard
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    return () => {
      // Optional: Reset to system or previous preference if needed, 
      // but for now we leave it as is or could reset to auto.
      // document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  const getRouteColor = () => {
    if (currentRide?.status === 'accepted') return '#FBBF24'; // Yellow for Pickup
    if (currentRide?.status === 'in_progress') return '#3b82f6'; // Blue for Trip
    return '#3b82f6'; // Default
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      <div className="fixed top-0 left-0 right-0 px-4 pt-4 pb-4 flex items-center justify-between bg-[var(--bg-primary)] z-[60] border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Olá, {driverName}</h1>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">{vehicleInfo}</p>
        </div>
        <button
          onClick={toggleOnline}
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-lg ${isOnline ? 'bg-[#FBBF24] text-black scale-105' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}
        >
          <span className="text-sm font-bold">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          {isOnline ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mt-[72px] mb-[100px] safe-area-bottom">
        {driverStatus === 'pending' ? (
          <div className="px-4 py-12 text-center space-y-6">
            <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500">
              <LucideClock size={48} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">CONTA EM ANÁLISE</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Obrigado pelo teu registo, **{driverName}**! 🚀<br />
                Os teus dados já estão com o nosso admin Mansur. Assim que fores aprovado, poderás começar a receber pedidos.
              </p>
            </div>
            <Button
              className="w-full h-16 bg-[#25D366] hover:bg-[#128C7E] text-white"
              onClick={() => {
                const msg = encodeURIComponent(`Olá Mansur! Sou o motorista ${driverName}. Já fiz o meu cadastro e estou à espera de aprovação. Podes verificar? 🤔📲`);
                window.open(`https://wa.me/258868840054?text=${msg}`, '_blank');
              }}
            >
              Lembrar Admin no WhatsApp
            </Button>
          </div>
        ) : isOnline && currentRide ? (
          <div className="p-4 space-y-4">
            <div className="bg-[var(--bg-secondary)] rounded-2xl border-2 border-[#FBBF24] overflow-hidden shadow-2xl">
              <div className="p-2">
                <MapComponent
                  center={currentRide.status === 'in_progress' ? [currentRide.dest_lat, currentRide.dest_lng] : [currentRide.pickup_lat, currentRide.pickup_lng]}
                  pickup={currentRide.status === 'accepted' && lastCoords
                    ? { lat: lastCoords.lat, lng: lastCoords.lng, name: 'Minha Posição' }
                    : { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng, name: currentRide.pickup_location }
                  }
                  destination={currentRide.status === 'accepted' || currentRide.status === 'arrived' || currentRide.status === 'pending'
                    ? { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng, name: currentRide.pickup_location }
                    : { lat: currentRide.dest_lat, lng: currentRide.dest_lng, name: currentRide.destination_location }
                  }
                  userLocation={lastCoords ? [lastCoords.lat, lastCoords.lng] : undefined}
                  height="200px"
                  drivers={[]} // Ensure no other drivers are shown
                  routeColor={getRouteColor()}
                />
              </div>

              <div className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1 inline-block ${currentRide.status === 'pending' ? 'bg-[#FBBF24]/20 text-[#FBBF24]' : 'bg-green-500/20 text-green-500'}`}>
                      {currentRide.status === 'pending' ? 'Nova Solicitação' : 'Em Curso'}
                    </span>
                    <h3 className="text-[var(--text-primary)] font-bold text-lg">Cliente em {currentRide.pickup_location}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#FBBF24]">{currentRide.estimate} MT</p>
                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">{currentRide.distance?.toFixed(1)} KM</p>
                    {passengerPhone && (
                      <button
                        onClick={() => window.open(`tel:${passengerPhone}`)}
                        className="mt-2 text-xs bg-green-500/20 text-green-500 px-3 py-1 rounded-full border border-green-500/30 flex items-center justify-end gap-1 ml-auto"
                      >
                        <Phone size={12} className="fill-current" />
                        Ligar
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 relative py-2">
                  <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-[var(--border-color)]" />
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-[#3B82F6]/20 flex items-center justify-center shrink-0 border border-[#3B82F6]/30">
                      <MapPin size={14} className="text-[#3B82F6]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Recolha</p>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{currentRide.pickup_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="w-6 h-6 rounded-full bg-[#FBBF24]/20 flex items-center justify-center shrink-0 border border-[#FBBF24]/30">
                      <Navigation size={14} className="text-[#FBBF24]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Destino</p>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{currentRide.destination_location}</p>
                    </div>
                  </div>
                </div>

                {currentRide.status === 'pending' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="ghost"
                      className="border border-[var(--border-color)] text-[var(--text-primary)]"
                      onClick={async () => {
                        await supabase.from('rides').update({ target_driver_id: null }).eq('id', currentRide.id);
                        setCurrentRide(null);
                      }}
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
                ) : currentRide.status === 'accepted' ? (
                  <div className="space-y-3">
                    {distToPickup !== null && distToPickup <= 0.05 && (
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold animate-bounce shadow-lg shadow-blue-500/30"
                        onClick={handleArriveAtPickup}
                      >
                        <CheckCircle className="mr-2" size={18} />
                        Cheguei ao local
                      </Button>
                    )}
                    <p className="text-[10px] text-center text-[var(--text-secondary)] font-bold uppercase">
                      {distToPickup !== null ? `Estás a ${Math.round(distToPickup * 1000)}m do cliente` : 'A caminho do cliente...'}
                    </p>
                  </div>
                ) : currentRide.status === 'arrived' ? (
                  <Button
                    className="w-full bg-[#FBBF24] text-black font-bold shadow-xl shadow-[#FBBF24]/20"
                    onClick={handleStartRide}
                  >
                    <Navigation className="mr-2" size={18} />
                    Iniciar corrida
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={handleFinishRide}
                  >
                    <CheckCircle className="mr-2" size={18} />
                    Finalizar Corrida
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute top-20 left-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
            {/* Floating Status Card */}
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-gray-100 pointer-events-auto animate-in slide-in-from-top-5 duration-500">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOnline ? 'bg-[#FBBF24]/20' : 'bg-gray-100'}`}>
                  {isOnline ? <div className="w-3 h-3 bg-[#FBBF24] rounded-full animate-ping" /> : <ToggleLeft size={24} className="text-gray-400" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    {isOnline ? 'Procurando passageiros...' : 'Estás Offline'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isOnline ? 'Mantém a app aberta' : 'Fica online para aceitar corridas'}
                  </p>
                </div>
              </div>
              {!isOnline && (
                <Button onClick={toggleOnline} size="sm" className="w-full mt-3 h-9 bg-gray-900 text-white hover:bg-black">
                  Ficar Online
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-0">
        <MapComponent
          center={lastCoords ? [lastCoords.lat, lastCoords.lng] : [-17.88, 36.88]}
          pickup={currentRide?.status === 'accepted' && lastCoords
            ? { lat: lastCoords.lat, lng: lastCoords.lng, name: 'Minha Posição' }
            : currentRide ? { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng, name: currentRide.pickup_location } : null
          }
          destination={currentRide?.status === 'accepted' || currentRide?.status === 'arrived' || currentRide?.status === 'pending'
            ? { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng, name: currentRide.pickup_location }
            : currentRide ? { lat: currentRide.dest_lat, lng: currentRide.dest_lng, name: currentRide.destination_location } : null
          }
          userLocation={lastCoords ? [lastCoords.lat, lastCoords.lng] : undefined}
          height="100%"
          routeColor={getRouteColor()}
        />
      </div>

      <BottomNav
        activeTab="driver-dash"
        onTabChange={(tab) => onNavigate(tab)}
        userType="driver"
      />
    </div>
  );
}