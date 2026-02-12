import * as React from 'react';
import { Header } from '../components/Header';
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Loader2,
  ShieldCheck,
  Check,
  X,
  FileText,
  Phone as PhoneIcon,
  MapPin,
  Clock
} from 'lucide-react';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../lib/supabase';
import { LeafletMapComponent as MapComponent } from '../components/LeafletMapComponent';
import { Button } from '../components/ui/Button';

interface AdminDashboardPageProps {
  onNavigate: (page: string) => void;
}

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'metrics' | 'rides' | 'drivers'>('metrics');
  const [stats, setStats] = React.useState([
    { label: 'Total Viagens', value: '0', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Receita (MZN)', value: '0', icon: DollarSign, color: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/10' },
    { label: 'Motoristas', value: '0', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Pendentes', value: '0', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' }
  ]);

  const [recentRides, setRecentRides] = React.useState<any[]>([]);
  const [pendingDrivers, setPendingDrivers] = React.useState<any[]>([]);
  const [selectedRide, setSelectedRide] = React.useState<any | null>(null);

  const fetchStats = async () => {
    try {
      const { count: ridesCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true });

      const { count: driversCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'driver');

      const { count: pendingCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { data: ridesData } = await supabase
        .from('rides')
        .select(`*`)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: driversData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .eq('status', 'pending');

      setStats([
        { label: 'Total Viagens', value: (ridesCount || 0).toString(), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Receita (MZN)', value: ((ridesCount || 0) * 60).toString(), icon: DollarSign, color: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/10' },
        { label: 'Motoristas', value: (driversCount || 0).toString(), icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { label: 'Pendentes', value: (pendingCount || 0).toString(), icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' }
      ]);

      if (ridesData) {
        setRecentRides(ridesData);
        if (ridesData.length > 0 && !selectedRide) {
          setSelectedRide(ridesData[0]);
        }
      }

      if (driversData) {
        setPendingDrivers(driversData);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDriver = async (driverId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', driverId);

      if (!error) {
        setPendingDrivers(prev => prev.filter(d => d.id !== driverId));
        fetchStats();
      }
    } catch (err) {
      console.error('Error approving driver:', err);
    }
  };

  const handleRejectDriver = async (driverId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', driverId);

      if (!error) {
        setPendingDrivers(prev => prev.filter(d => d.id !== driverId));
        fetchStats();
      }
    } catch (err) {
      console.error('Error rejecting driver:', err);
    }
  };

  const handleApproveRide = async (rideId: string) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'accepted' })
        .eq('id', rideId);

      if (!error) {
        fetchStats();
      }
    } catch (err) {
      console.error('Error approving ride:', err);
    }
  };

  const handleRejectRide = async (rideId: string) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', rideId);

      if (!error) {
        fetchStats();
      }
    } catch (err) {
      console.error('Error rejecting ride:', err);
    }
  };

  const fetchStatsCallback = React.useCallback(fetchStats, [selectedRide]);

  React.useEffect(() => {
    fetchStatsCallback();

    const channelName = 'admin-dashboard-channel';
    const timeoutId = setTimeout(() => {
      const subscription = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' }, (payload: any) => {
          if (payload.new.status === 'pending') {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch((e) => console.error('Audio play error:', e));
          }
          fetchStatsCallback();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides' }, () => {
          fetchStatsCallback();
        })
        .subscribe();

      (window as any)[`supabase_${channelName}`] = subscription;
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const ch = (window as any)[`supabase_${channelName}`];
      if (ch) {
        supabase.removeChannel(ch);
        delete (window as any)[`supabase_${channelName}`];
      }
    };
  }, [fetchStatsCallback]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-300">
      <Header title="Painel Admin" onBack={() => onNavigate('home')} />

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#FBBF24]" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs Navigation */}
            <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] mb-8">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'metrics' ? 'bg-[#FBBF24] text-black shadow-lg shadow-[#FBBF24]/20' : 'text-[var(--text-secondary)]'}`}
              >
                Métricas
              </button>
              <button
                onClick={() => setActiveTab('rides')}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'rides' ? 'bg-[#FBBF24] text-black shadow-lg shadow-[#FBBF24]/20' : 'text-[var(--text-secondary)]'}`}
              >
                Viagens {recentRides.filter(r => r.status === 'pending').length > 0 && <span className="ml-1 px-1.5 bg-red-500 text-white rounded-full text-[8px]">{recentRides.filter(r => r.status === 'pending').length}</span>}
              </button>
              <button
                onClick={() => setActiveTab('drivers')}
                className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all ${activeTab === 'drivers' ? 'bg-[#FBBF24] text-black shadow-lg shadow-[#FBBF24]/20' : 'text-[var(--text-secondary)]'}`}
              >
                Motoristas {pendingDrivers.length > 0 && <span className="ml-1 px-1.5 bg-red-500 text-white rounded-full text-[8px]">{pendingDrivers.length}</span>}
              </button>
            </div>

            {activeTab === 'metrics' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, i) => (
                    <div key={i} className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
                      <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                        <stat.icon size={20} className={stat.color} />
                      </div>
                      <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                      <p className="text-xs text-[var(--text-secondary)] lowercase">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {selectedRide && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider opacity-60">Monitor de Viagem</h3>
                    <MapComponent
                      center={[selectedRide.pickup_lat, selectedRide.pickup_lng]}
                      pickup={[selectedRide.pickup_lat, selectedRide.pickup_lng]}
                      destination={[selectedRide.dest_lat, selectedRide.dest_lng]}
                      height="250px"
                    />
                    <div className="bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)]">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{selectedRide.pickup_location} → {selectedRide.destination_location}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock size={12} className="text-[var(--text-secondary)]" />
                            <p className="text-xs text-[var(--text-secondary)]">{new Date(selectedRide.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${selectedRide.status === 'pending' ? 'bg-orange-500/20 text-orange-500' :
                          selectedRide.status === 'accepted' ? 'bg-blue-500/20 text-blue-500' :
                            'bg-green-500/20 text-green-500'
                          }`}>
                          {selectedRide.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rides' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                  <h3 className="text-sm font-bold text-[#FBBF24] mb-4 uppercase tracking-wider flex items-center gap-2">
                    Aprovações de Viagens
                    {recentRides.filter(r => r.status === 'pending').length > 0 && <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full" />}
                  </h3>
                  <div className="space-y-3">
                    {recentRides.filter(r => r.status === 'pending').length > 0 ? (
                      recentRides.filter(r => r.status === 'pending').map(ride => (
                        <div key={ride.id} className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[#FBBF24]/30 space-y-4 shadow-xl">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-[#3B82F6]" />
                                <p className="text-sm font-bold text-[var(--text-primary)]">{ride.pickup_location}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-[#FBBF24]" />
                                <p className="text-sm font-bold text-[var(--text-primary)]">{ride.destination_location}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-[#FBBF24] bg-[#FBBF24]/10 px-2 py-1 rounded">{ride.estimate}</span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-all"
                              onClick={() => handleRejectRide(ride.id)}
                            >
                              Recusar
                            </button>
                            <button
                              className="flex-1 py-3 bg-[#FBBF24] text-black rounded-xl text-xs font-bold shadow-lg shadow-[#FBBF24]/10"
                              onClick={() => handleApproveRide(ride.id)}
                            >
                              Aprovar Pedido
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] space-y-2">
                        <Activity className="mx-auto text-[#4B5563]" size={32} />
                        <p className="text-[#9CA3AF] text-sm">Sem pedidos pendentes</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wider opacity-50">Histórico Recente</h3>
                  <div className="space-y-3">
                    {recentRides.filter(r => r.status !== 'pending').map((ride) => (
                      <button
                        key={ride.id}
                        onClick={() => { setSelectedRide(ride); setActiveTab('metrics'); }}
                        className={`w-full text-left bg-[var(--bg-secondary)] p-4 rounded-xl border transition-all ${selectedRide?.id === ride.id ? 'border-[#FBBF24]' : 'border-[var(--border-color)]'} flex justify-between items-center hover:opacity-80`}
                      >
                        <div>
                          <p className="text-xs text-[var(--text-primary)] font-medium truncate max-w-[150px]">{ride.pickup_location} → {ride.destination_location}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-1">{new Date(ride.created_at).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold uppercase ${ride.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>{ride.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'drivers' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h3 className="text-sm font-bold text-[#FBBF24] mb-4 uppercase tracking-wider">Verificação de Motoristas</h3>
                <div className="space-y-6">
                  {pendingDrivers.length > 0 ? (
                    pendingDrivers.map((driver) => (
                      <div key={driver.id} className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--border-color)] space-y-6 shadow-2xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-lg text-[var(--text-primary)] font-bold">{driver.full_name}</p>
                            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-1 mt-1">
                              <PhoneIcon size={14} className="text-[#FBBF24]" /> {driver.phone}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="bg-[#FBBF24]/20 text-[#FBBF24] text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-[#FBBF24]/30">
                              BI: {driver.bi_number}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-widest pl-1">BI Frente</p>
                            <div className="h-28 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                              {driver.bi_front_url ? <img src={driver.bi_front_url} alt="BI" className="w-full h-full object-cover" /> : <FileText size={24} className="text-[var(--text-tertiary)]" />}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-widest pl-1">BI Verso</p>
                            <div className="h-28 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                              {driver.bi_back_url ? <img src={driver.bi_back_url} alt="BI" className="w-full h-full object-cover" /> : <FileText size={24} className="text-[var(--text-tertiary)]" />}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1 h-12 border-[#2a2a2a] text-red-500 hover:bg-red-500/5"
                            onClick={() => handleRejectDriver(driver.id)}
                          >
                            <X size={18} className="mr-2" /> Recusar
                          </Button>
                          <Button
                            className="flex-1 h-12"
                            onClick={() => handleApproveDriver(driver.id)}
                          >
                            <Check size={18} className="mr-2" /> Aprovar Cadastro
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] space-y-4">
                      <ShieldCheck className="mx-auto text-[var(--text-tertiary)]" size={40} />
                      <p className="text-[var(--text-secondary)] text-sm font-medium">Todos os motoristas estão verificados</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav
        activeTab="admin-dash"
        onTabChange={(tab) => onNavigate(tab)}
        userType="admin"
      />
    </div>
  );
}