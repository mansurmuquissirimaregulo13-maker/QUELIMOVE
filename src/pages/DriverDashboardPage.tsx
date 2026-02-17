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
  const [balance, setBalance] = React.useState<number>(0);
  const [showSummary, setShowSummary] = React.useState(false);
  const [lastRideEarnings, setLastRideEarnings] = React.useState<number | null>(null);

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

  const lastSavedCoords = React.useRef<{ lat: number; lng: number } | null>(null);

  const updateLocationInDB = async (lat: number, lng: number) => {
    try {
      if (lastSavedCoords.current) {
        const dist = calculateDistance(lat, lng, lastSavedCoords.current.lat, lastSavedCoords.current.lng);
        // Skip update if moved less than 5 meters (0.005 km)
        if (dist < 0.005) return;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user && isOnline) {
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
            if (!error) {
              lastSavedCoords.current = { lat, lng };
            } else {
              console.error('Background location update error:', error);
            }
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
      .select('full_name, vehicle_type, vehicle_plate, status, balance')
      .eq('id', userData.user.id)
      .single();

    if (profile) {
      setDriverName(profile.full_name || 'Motorista');
      setVehicleInfo(`${profile.vehicle_type || 'Moto'} • ${profile.vehicle_plate || 'S/M'}`);

      // Update state and cache
      setDriverStatus(profile.status as any);
      localStorage.setItem('driverStatus', profile.status);

      if (profile.balance !== undefined) {
        setBalance(profile.balance || 0);
      }

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

      // Calculate earnings for summary (local estimate)
      const earnings = (parseFloat(currentRide.estimate) || 0) * 0.85;
      setLastRideEarnings(earnings);
      setBalance(prev => prev + earnings);
      setShowSummary(true);
      setCurrentRide(null);

      // Refresh profile to sync balance
      fetchDriverProfile();
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
      <div className="fixed top-0 left-0 right-0 px-6 pt-12 pb-6 flex items-center justify-between bg-white/80 backdrop-blur-xl z-[60] border-b border-gray-100 rounded-b-[32px] transition-all duration-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FBBF24]/10 flex items-center justify-center border border-[#FBBF24]/20 group">
            <User size={20} className="text-[#FBBF24] group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight">Olá, {driverName.split(' ')[0]}</h1>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{isOnline ? 'Em Trabalho' : 'Descansando'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Saldo</p>
            <p className="text-lg font-black text-gray-900">{balance.toLocaleString('pt-MZ', { minimumFractionDigits: 0 })} <span className="text-[10px]">MT</span></p>
          </div>
          <button
            onClick={toggleOnline}
            className={`w-14 h-8 rounded-full relative transition-all duration-300 ${isOnline ? 'bg-[#FBBF24]' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${isOnline ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>



      <div className="flex-1 overflow-y-auto mt-[110px] mb-[100px] safe-area-bottom">
        {driverStatus === 'pending' ? (
          <div className="px-6 py-12 text-center space-y-8 bg-white/90 backdrop-blur-xl rounded-t-[40px] shadow-2xl mt-32 h-full">
            <div className="w-24 h-24 bg-[#FBBF24]/10 rounded-full flex items-center justify-center mx-auto text-[#FBBF24] border-2 border-white shadow-xl relative">
              <LucideClock size={48} className="animate-pulse" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full p-1 shadow-md">
                <div className="w-full h-full bg-orange-500 rounded-full" />
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-tight">Quase Lá!<br />CONTA EM ANÁLISE</h2>
              <p className="text-sm text-gray-500 font-medium px-4">
                Obrigado pelo registo, <span className="text-black font-bold">{driverName.split(' ')[0]}</span>! 🚀<br />
                Os teus dados estão com o <span className="text-black font-bold">Admin Mansur</span>. Clica abaixo para ativar agora.
              </p>
            </div>
            <Button
              className="w-full h-16 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl font-black shadow-xl shadow-green-500/20 flex items-center justify-center gap-3 uppercase tracking-wider"
              onClick={() => {
                const msg = encodeURIComponent(`Olá Mansur! Sou o motorista ${driverName}. Já fiz o meu registo na Quelimove e aguardo activação rápida. 🤔📲`);
                window.open(`https://wa.me/258868840054?text=${msg}`, '_blank');
              }}
            >
              <Phone size={24} />
              Chamar no WhatsApp
            </Button>
          </div>
        ) : isOnline && currentRide ? (
          <div className="fixed bottom-[100px] left-0 right-0 z-50 px-4 animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-white/95 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white overflow-hidden pb-4">
              <div className="h-1.5 w-12 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />

              <div className="p-5 space-y-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-50">
                      <User size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${currentRide.status === 'pending' ? 'bg-[#FBBF24] text-black' : 'bg-green-500 text-white'}`}>
                        {currentRide.status === 'pending' ? 'Novo Pedido' : 'Em Curso'}
                      </span>
                      <h3 className="text-gray-900 font-black text-lg mt-0.5">{currentRide.pickup_location}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#FBBF24] leading-tight">{currentRide.estimate} <span className="text-xs">MT</span></p>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{currentRide.distance?.toFixed(1)} KM</p>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-black leading-none">Recolha</p>
                      <p className="text-sm text-gray-900 font-bold">{currentRide.pickup_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#FBBF24] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-black leading-none">Destino</p>
                      <p className="text-sm text-gray-900 font-bold">{currentRide.destination_location}</p>
                    </div>
                  </div>
                </div>

                {currentRide.status === 'pending' ? (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <Button
                      variant="ghost"
                      className="h-14 bg-gray-100/50 text-gray-500 font-bold rounded-2xl"
                      onClick={async () => {
                        await supabase.from('rides').update({ target_driver_id: null }).eq('id', currentRide.id);
                        setCurrentRide(null);
                      }}
                    >
                      Recusar
                    </Button>
                    <Button
                      className="h-14 bg-[#FBBF24] text-black font-black rounded-2xl shadow-lg shadow-[#FBBF24]/30"
                      onClick={() => handleAcceptRide(currentRide.id)}
                    >
                      ACEITAR
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    <div className="flex gap-3">
                      {passengerPhone && (
                        <button
                          onClick={() => window.open(`tel:${passengerPhone}`)}
                          className="flex-1 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center gap-2 text-gray-600 font-bold text-sm shadow-sm"
                        >
                          <Phone size={16} />
                          Ligar Cliente
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${currentRide.status === 'in_progress' ? currentRide.dest_lat + ',' + currentRide.dest_lng : currentRide.pickup_lat + ',' + currentRide.pickup_lng}`;
                          window.open(url, '_blank');
                        }}
                        className="flex-1 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm border border-blue-100"
                      >
                        <Navigation size={16} />
                        Navegação
                      </button>
                    </div>

                    {currentRide.status === 'accepted' ? (
                      <Button
                        className={`w-full h-16 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transform transition-all active:scale-95 ${distToPickup !== null && distToPickup <= 0.1 ? 'animate-bounce' : ''}`}
                        onClick={handleArriveAtPickup}
                      >
                        {distToPickup !== null && distToPickup <= 0.1 ? 'CHEGUEI AO LOCAL' : 'AVISAR CHEGADA'}
                      </Button>
                    ) : currentRide.status === 'arrived' ? (
                      <Button
                        className="w-full h-16 bg-[#FBBF24] text-black font-black rounded-2xl shadow-xl shadow-[#FBBF24]/20"
                        onClick={handleStartRide}
                      >
                        INICIAR VIAGEM
                      </Button>
                    ) : (
                      <Button
                        className="w-full h-16 bg-red-500 text-white font-black rounded-2xl shadow-xl shadow-red-500/20"
                        onClick={handleFinishRide}
                      >
                        FINALIZAR VIAGEM
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed top-32 left-0 right-0 z-50 px-6 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[28px] shadow-2xl border border-white pointer-events-auto transform transition-all duration-500">
              <div className="flex items-center gap-5">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-4 border-white shadow-lg transition-all ${isOnline ? 'bg-[#FBBF24]/20 scale-110' : 'bg-gray-100'}`}>
                  {isOnline ? (
                    <div className="w-4 h-4 bg-[#FBBF24] rounded-full animate-ping" />
                  ) : (
                    <ToggleLeft size={28} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-gray-900 tracking-tighter leading-none">
                    {isOnline ? 'À Procura...' : 'Estás Offline'}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1 font-bold uppercase tracking-widest opacity-80">
                    {isOnline ? 'Pedidoss ativos na zona' : 'Fica online para faturar'}
                  </p>
                </div>
                {!isOnline && (
                  <button
                    onClick={toggleOnline}
                    className="bg-black text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 border-white shadow-lg"
                  >
                    Entrar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ride Summary Modal */}
        {showSummary && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="bg-[#FBBF24] p-8 text-center text-black">
                <div className="w-16 h-16 bg-black/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} className="text-black" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Viagem Concluída!</h2>
              </div>

              <div className="p-8 space-y-6">
                <div className="text-center space-y-1">
                  <p className="text-xs text-gray-500 font-bold uppercase">Teus Ganhos (85%)</p>
                  <p className="text-4xl font-black text-gray-900">
                    {lastRideEarnings?.toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                  </p>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total da Viagem</span>
                    <span className="font-bold text-gray-900">{((lastRideEarnings || 0) / 0.85).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Taxa Quelimove (15%)</span>
                    <span className="font-bold text-red-500">-{((lastRideEarnings || 0) * 0.15 / 0.85).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}</span>
                  </div>
                </div>

                <Button
                  className="w-full h-14 bg-black text-white hover:bg-gray-800 rounded-2xl font-bold"
                  onClick={() => setShowSummary(false)}
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-0 z-0">
        <div className="clean-map-light h-full w-full">
          <MapComponent
            center={lastCoords ? [lastCoords.lat, lastCoords.lng] : [-17.88, 36.88]}
            pickup={currentRide?.status === 'accepted' || currentRide?.status === 'arrived' || currentRide?.status === 'pending'
              ? { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng, name: currentRide.pickup_location }
              : null
            }
            destination={currentRide?.status === 'in_progress'
              ? { lat: currentRide.dest_lat, lng: currentRide.dest_lng, name: currentRide.destination_location }
              : null
            }
            userLocation={lastCoords ? [lastCoords.lat, lastCoords.lng] : undefined}
            height="100%"
            routeColor={getRouteColor()}
          />
        </div>
      </div>

      <BottomNav
        activeTab="driver-dash"
        onTabChange={(tab) => onNavigate(tab)}
        userType="driver"
      />
    </div>
  );
}