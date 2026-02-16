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
  Route as RouteIcon,
  Phone,
  Clock as LucideClock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LeafletMapComponent as MapComponent } from '../components/LeafletMapComponent';
import { requestForToken } from '../lib/firebase';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNotifications } from '../hooks/useNotifications';

interface DriverDashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DriverDashboardPage({ onNavigate }: DriverDashboardPageProps) {
  const [isOnline, setIsOnline] = React.useState(false);
  const [lastCoords, setLastCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [currentRide, setCurrentRide] = React.useState<any | null>(null);
  const [driverName, setDriverName] = React.useState('Motorista');
  const [vehicleInfo, setVehicleInfo] = React.useState('Carregando...');
  const [driverStatus, setDriverStatus] = React.useState<'active' | 'pending' | 'rejected'>('pending');
  const { notify } = useNotifications();

  // Monitorar mudanças na corrida atual (Ex: Cancelamento pelo cliente)
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
          console.log('Active ride update:', payload.new);
          if (payload.new.status === 'cancelled') {
            notify({ title: 'Atenção', body: 'A viagen foi cancelada pelo cliente.' });
            setCurrentRide(null);
          } else {
            // Atualizar estado local (ex: mudanças de destino, etc)
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

    // Se já temos uma corrida ativa/pendente na tela, não buscar outra
    if (currentRide && currentRide.status !== 'completed' && currentRide.status !== 'cancelled') return;

    const { data } = await supabase
      .from('rides')
      .select('*')
      .in('status', ['pending', 'accepted', 'a_caminho', 'em_corrida'])
      .or(`target_driver_id.is.null,target_driver_id.eq.${userData.user.id},driver_id.eq.${userData.user.id}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setCurrentRide(data[0]);
    }
  };

  const fetchPotentialRidesCallback = React.useCallback(fetchPotentialRides, [isOnline, currentRide]);

  React.useEffect(() => {
    let watchId: number | undefined;
    const updateLocationInDB = async (lat: number, lng: number) => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user && isOnline) {
          const { error } = await supabase
            .from('profiles')
            .update({
              current_lat: lat,
              current_lng: lng,
              is_available: true,
              last_online: new Date().toISOString()
            })
            .eq('id', userData.user.id);

          if (error) {
            console.error('Retry: Location update failed', error);
          }
        }
      } catch (err) {
        console.error('Fatal: Location update error', err);
      }
    };

    let syncInterval: number | undefined;

    if (isOnline) {
      // 1. Iniciar monitoramento GPS
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setLastCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => console.error('Error watching location:', error),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }

      // 2. Sincronizar com banco a cada 5 segundos
      syncInterval = window.setInterval(() => {
        if (lastCoords) {
          updateLocationInDB(lastCoords.lat, lastCoords.lng);
        }
      }, 5000);

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
    }

    if (isOnline) {
      fetchPotentialRidesCallback();

      const channelName = 'driver-rides-presence';
      // Subscrever para NOVAS corridas
      const subscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT', // Escutar novas inserções também
            schema: 'public',
            table: 'rides'
          },
          (payload) => {
            if (payload.new.status === 'pending') {
              // Verificar se é pra mim (se tiver target_driver_id logica no backend ou filtro aqui)
              // Como RLS filtra, se recebermos é porque podemos ver
              if (!currentRide) {
                setCurrentRide(payload.new);
                notify({
                  title: 'Nova Corrida Disponível!',
                  body: `Passageiro em ${payload.new.pickup_location}. Valor: ${payload.new.estimate} MZN`
                });
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2505/2505-preview.mp3');
                audio.play().catch(e => console.log('Audio play failed', e));
              }
            }
          }
        )
        .subscribe();

      (window as any)[`supabase_${channelName}`] = subscription;

      return () => {
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        if (syncInterval) clearInterval(syncInterval);
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

  // Hook to fetch passenger phone when currentRide is set
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

  const [todaysEarnings, setTodaysEarnings] = React.useState(0);
  const [todaysRidesCount, setTodaysRidesCount] = React.useState(0);

  const fetchStats = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('rides')
      .select('estimate')
      .eq('driver_id', userData.user.id)
      .eq('status', 'completed')
      .gte('created_at', startOfDay.toISOString());

    if (data) {
      const total = data.reduce((sum, ride) => sum + (parseInt(ride.estimate) || 0), 0);
      setTodaysEarnings(total);
      setTodaysRidesCount(data.length);
    }
  };

  const fetchDriverProfile = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, vehicle_type, vehicle_plate, status')
      .eq('id', userData.user.id)
      .single();

    if (profile) {
      setDriverName(profile.full_name || 'Motorista');
      setVehicleInfo(`${profile.vehicle_type || 'Moto'} • ${profile.vehicle_plate || 'S/M'}`);
      setDriverStatus(profile.status as any);

      // If pending, ensure we are offline
      if (profile.status !== 'active') {
        setIsOnline(false);
      }
    }
  };

  React.useEffect(() => {
    fetchDriverProfile();
    fetchStats();
  }, []);

  const handleAcceptRide = async (rideId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('rides')
        .update({
          status: 'accepted',
          driver_id: userData.user.id,
          target_driver_id: userData.user.id
        })
        .eq('id', rideId)
        .eq('status', 'pending')
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        notify({ title: 'Viagem Aceite!', body: 'Vá ao encontro do cliente.' });
        setCurrentRide(data[0]); // Atualizar com os dados novos (status accepted)
        fetchStats();
      } else {
        alert('Esta viagem já foi aceite por outro motorista.');
        setCurrentRide(null);
      }
    } catch (err) {
      console.error('Error accepting ride:', err);
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
      fetchStats();
    } catch (err) {
      console.error('Error finishing ride:', err);
    }
  };

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

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      <div className="fixed top-0 left-0 right-0 px-4 pt-4 pb-4 flex items-center justify-between bg-[#0a0a0a] z-[60] border-b border-[#1a1a1a]">
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

      <div className="flex-1 overflow-y-auto mt-[72px] mb-[100px] safe-area-bottom">
        {driverStatus === 'pending' ? (
          <div className="px-4 py-12 text-center space-y-6">
            <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500">
              <LucideClock size={48} className="animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">CONTA EM ANÁLISE</h2>
              <p className="text-sm text-gray-400">
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
        ) : driverStatus === 'rejected' ? (
          <div className="px-4 py-12 text-center space-y-6">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500">
              <XCircle size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">CONTA REJEITADA</h2>
              <p className="text-sm text-gray-400">
                Infelizmente a tua conta não foi aprovada. Por favor, contacta o suporte para saber o motivo.
              </p>
            </div>
          </div>
        ) : isOnline && currentRide ? (
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
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1 inline-block ${currentRide.status === 'pending' ? 'bg-[#FBBF24]/20 text-[#FBBF24]' : 'bg-green-500/20 text-green-500'}`}>
                      {currentRide.status === 'pending' ? 'Nova Solicitação' : 'Em Curso'}
                    </span>
                    <h3 className="text-white font-bold text-lg">Cliente em {currentRide.pickup_location}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#FBBF24]">{currentRide.estimate}</p>
                    <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">{currentRide.distance?.toFixed(1)} KM</p>
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

                {currentRide.status === 'pending' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="ghost"
                      className="border border-[#2a2a2a]"
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

            <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a] flex items-center justify-around">
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Ganhos Hoje</p>
                <p className="text-lg font-bold text-white">{todaysEarnings} MZN</p>
              </div>
              <div className="w-px h-8 bg-[#2a2a2a]" />
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Viagens</p>
                <p className="text-lg font-bold text-white">{todaysRidesCount}</p>
              </div>
              <div className="w-px h-8 bg-[#2a2a2a]" />
              <div className="text-center">
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Online</p>
                <p className="text-lg font-bold text-white">Pro</p>
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