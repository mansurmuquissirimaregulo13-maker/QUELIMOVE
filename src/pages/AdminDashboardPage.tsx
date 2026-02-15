import * as React from 'react';
import { Header } from '../components/Header';
import {
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Loader2,
  X,
  FileText,
  MapPin,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav } from '../components/BottomNav';
import { supabase } from '../lib/supabase';
import { LeafletMapComponent as MapComponent } from '../components/LeafletMapComponent';
import { useNotifications } from '../hooks/useNotifications';
import { Button } from '../components/ui/Button';
import { QUELIMANE_LOCATIONS } from '../constants';

interface AdminDashboardPageProps {
  onNavigate: (page: string) => void;
}

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const { notify } = useNotifications();
  const [loading, setLoading] = React.useState(true);
  const [subView, setSubView] = React.useState<'none' | 'bairros' | 'prices' | 'logs'>('none');
  const [driverFilter, setDriverFilter] = React.useState<'all' | 'pending' | 'rejected'>('all');
  const [zoomImage, setZoomImage] = React.useState<string | null>(null);

  // Estados de Gestão
  const [locations, setLocations] = React.useState([...QUELIMANE_LOCATIONS]);
  const [pricing, setPricing] = React.useState({ base: 50, perKm: 15, commission: 20 });

  // Estado de Logs Dinâmicos
  const [systemLogs, setSystemLogs] = React.useState([
    { event: 'Sistema Iniciado', time: 'Agora', detail: 'Painel Admin carregado com sucesso.' }
  ]);

  const addLog = (event: string, detail: string) => {
    setSystemLogs(prev => [{
      event,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      detail
    }, ...prev].slice(0, 20)); // Mantém os últimos 20 logs
  };

  // Estado para Edição de Bairros
  const [editingLocation, setEditingLocation] = React.useState<{ index: number, name: string } | null>(null);
  const [newBairroName, setNewBairroName] = React.useState('');

  const handleEditBairro = () => {
    if (!editingLocation || !editingLocation.name.trim()) return;
    const updated = [...locations];
    const oldName = updated[editingLocation.index].name;
    updated[editingLocation.index].name = editingLocation.name;
    setLocations(updated);
    addLog('Gestão Bairros', `Bairro editado: ${oldName} -> ${editingLocation.name}`);
    setEditingLocation(null);
  };

  // --- Lógica Real de Estatísticas e Aprovações ---
  const [activeTab, setActiveTab] = React.useState<'metrics' | 'rides' | 'drivers' | 'settings'>('metrics');
  const [stats, setStats] = React.useState([
    { label: 'Total Viagens', value: '0', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Receita (MZN)', value: '0', icon: DollarSign, color: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/10' },
    { label: 'Motoristas', value: '0', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Pendentes', value: '0', icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' }
  ]);

  const [recentRides, setRecentRides] = React.useState<any[]>([]);
  const [allDrivers, setAllDrivers] = React.useState<any[]>([]);
  const [selectedRide, setSelectedRide] = React.useState<any | null>(null);
  const [selectedDriver, setSelectedDriver] = React.useState<any | null>(null);

  const fetchStats = async () => {
    try {
      const { data: ridesData, count: ridesCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      const { data: driversData, count: driversCount } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('created_at', { ascending: false });

      const pendingDriversCount = driversData?.filter(d => d.status === 'pending').length || 0;

      setStats([
        { label: 'Total Viagens', value: (ridesCount || 0).toString(), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Receita (MZN)', value: ((ridesCount || 0) * 60).toString(), icon: DollarSign, color: 'text-[#FBBF24]', bg: 'bg-[#FBBF24]/10' },
        { label: 'Motoristas', value: (driversCount || 0).toString(), icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { label: 'Pendentes (Motoristas)', value: pendingDriversCount.toString(), icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' }
      ]);

      if (ridesData) {
        setRecentRides(ridesData);
        if (ridesData.length > 0 && !selectedRide) {
          setSelectedRide(ridesData[0]);
        }
      }

      if (driversData) {
        const driversWithMetrics = driversData.map(driver => {
          const driverRides = ridesData?.filter(r => r.driver_id === driver.id && r.status === 'completed') || [];
          return {
            ...driver,
            totalRides: driverRides.length,
            totalPassengers: driverRides.length
          };
        });
        setAllDrivers(driversWithMetrics);
      }
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDriver = async (driverId: string, phone: string) => {
    if (!window.confirm('Tem certeza que deseja APROVAR este motorista?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', driverId);

      if (!error) {
        setSelectedDriver(null);
        addLog('Aprovação', `Motorista ${driverId} aprovado.`);
        fetchStats();

        // Abrir WhatsApp com mensagem automática
        let cleanPhone = (phone || '').replace(/\D/g, '');
        if (cleanPhone.startsWith('8')) cleanPhone = '258' + cleanPhone;

        if (cleanPhone) {
          const msg = encodeURIComponent(`Olá! Sua conta no Quelimove foi APROVADA com sucesso! 🎉\n\nJá podes abrir a aplicação e começar a faturar. Estamos felizes por te ter connosco! 🚀🚖\n\nAtt: Equipa Quelimove`);
          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
        } else {
          alert('Motorista aprovado, mas o telefone não foi encontrado para enviar WhatsApp.');
        }
      }
    } catch (err: any) {
      console.error('Error approving driver:', err);
      alert('Erro ao aprovar: ' + err.message);
    }
  };

  const handleRejectDriver = async (driverId: string) => {
    if (!window.confirm('Tem certeza que deseja BLOQUEAR/REJEITAR este motorista?')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', driverId);

      if (!error) {
        setSelectedDriver(null);
        addLog('Rejeição', `Motorista ${driverId} rejeitado.`);
        fetchStats();
        alert('Motorista bloqueado/rejeitado com sucesso.');
      }
    } catch (err: any) {
      console.error('Error rejecting driver:', err);
      alert('Erro ao rejeitar: ' + err.message);
    }
  };

  const handleApproveRide = async (rideId: string) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'accepted' })
        .eq('id', rideId);

      if (!error) {
        addLog('Viagens', `Ride ${rideId} aprovada.`);
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
        addLog('Viagens', `Ride ${rideId} cancelada.`);
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
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rides' }, (payload: any) => {
        if (payload.new.status === 'pending') {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3').play().catch((e) => console.error('Audio play error:', e));
          notify({ title: 'Nova Viagem!', body: 'Um cliente solicitou uma moto agora.' });
        }
        fetchStatsCallback();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload: any) => {
        if (payload.new.role === 'driver' && payload.new.status === 'pending') {
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch((e) => console.error('Audio play error:', e));
          alert('Um utilizador acaba de concluir o registo de motorista: ' + payload.new.full_name);
          notify({ title: 'Novo Motorista!', body: `${payload.new.full_name} concluiu o registo.` });
          fetchStatsCallback();
        } else {
          fetchStatsCallback();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        fetchStatsCallback();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides' }, () => {
        fetchStatsCallback();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Admin Dashboard Subscribed Successfully');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime Channel Error. Reconnecting...');
          // Supabase handles reconnect automatically usually, but we can log it.
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStatsCallback, notify]);

  const renderSubView = () => {
    switch (subView) {
      case 'bairros':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-primary)]">Gestão de Bairros</h3>
              <Button size="sm" onClick={() => { setSubView('none'); setEditingLocation(null); }}>Fechar</Button>
            </div>

            {/* Formulário de Adição */}
            {!editingLocation && (
              <div className="flex gap-2 bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)]">
                <input
                  type="text"
                  placeholder="Nome do novo bairro..."
                  value={newBairroName}
                  onChange={(e) => setNewBairroName(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-xs font-bold"
                />
                <button
                  onClick={handleAddBairro}
                  className="bg-[#FBBF24] text-black text-[10px] font-black px-4 py-2 rounded-lg"
                >
                  ADD
                </button>
              </div>
            )}

            {/* Lista de Bairros */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-none pr-1">
              {locations.filter(l => l.type === 'bairro').map((b, i) => {
                const actualIndex = locations.findIndex(loc => loc.name === b.name);
                return (
                  <div key={i} className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] flex justify-between items-center group">
                    {editingLocation?.index === actualIndex ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingLocation.name}
                          onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                          className="flex-1 bg-[var(--bg-primary)] p-1 rounded border border-[#FBBF24] text-xs font-bold"
                          autoFocus
                        />
                        <button onClick={handleEditBairro} className="text-[10px] text-green-500 font-bold">OK</button>
                        <button onClick={() => setEditingLocation(null)} className="text-[10px] text-red-500 font-bold">X</button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-bold">{b.name}</span>
                        <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingLocation({ index: actualIndex, name: b.name })}
                            className="text-[10px] text-blue-500 font-bold uppercase tracking-widest"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleRemoveBairro(actualIndex)}
                            className="text-[10px] text-red-500 font-bold uppercase tracking-widest"
                          >
                            Remover
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'prices':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-primary)]">Preços e Taxas</h3>
              <Button size="sm" onClick={() => setSubView('none')}>Fechar</Button>
            </div>
            <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest">Base (MZN)</label>
                <input type="number" value={pricing.base} onChange={(e) => setPricing({ ...pricing, base: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)] font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest">Preço por KM (MZN)</label>
                <input type="number" value={pricing.perKm} onChange={(e) => setPricing({ ...pricing, perKm: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)] font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest">Comissão Quelimove (%)</label>
                <input type="number" value={pricing.commission} onChange={(e) => setPricing({ ...pricing, commission: Number(e.target.value) })} className="w-full bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)] font-bold" />
              </div>
              <Button className="w-full shadow-lg shadow-[#FBBF24]/20" onClick={() => {
                alert('Preços atualizados com sucesso!');
                addLog('Sistema', 'Ajuste de Preços e Taxas efetuado.');
                setSubView('none');
              }}>
                Guardar Alterações
              </Button>
            </div>
          </div>
        );
      case 'logs':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[var(--text-primary)]">Logs do Sistema</h3>
              <Button size="sm" onClick={() => setSubView('none')}>Fechar</Button>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-none pr-1">
              {systemLogs.map((log, i) => (
                <div key={i} className="p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-[10px]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black uppercase tracking-tighter text-[#FBBF24]">{log.event}</span>
                    <span className="text-[var(--text-tertiary)]">{log.time}</span>
                  </div>
                  <p className="text-[var(--text-secondary)] font-medium">{log.detail}</p>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[var(--bg-primary)] overflow-hidden transition-colors duration-300">
      <Header title="Painel Admin" />

      <div className="flex-1 overflow-y-auto mt-[72px] mb-[100px] px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#FBBF24]" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {subView === 'none' ? (
              <>
                <div className="flex items-center justify-between mb-8 px-2">
                  <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Painel de Controlo</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-[var(--text-tertiary)] tracking-widest">Tempo Real Ativo</span>
                  </div>
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

                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider opacity-60">Visão Geral de Viagens</h3>
                    </div>

                    {selectedRide && (
                      <div className="space-y-4">
                        <MapComponent
                          center={[selectedRide.pickup_lat, selectedRide.pickup_lng]}
                          pickup={{ lat: selectedRide.pickup_lat, lng: selectedRide.pickup_lng, name: selectedRide.pickup_location }}
                          destination={{ lat: selectedRide.dest_lat, lng: selectedRide.dest_lng, name: selectedRide.destination_location }}
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
                            <div key={ride.id} className="bg-[var(--bg-secondary)] p-5 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-xl">
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
                          <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] space-y-2">
                            <Activity className="mx-auto text-[var(--text-tertiary)]" size={32} />
                            <p className="text-[var(--text-secondary)] text-sm">Sem pedidos pendentes</p>
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#FBBF24] uppercase tracking-wider">Gestão de Motoristas</h3>
                      <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">{allDrivers.length} Registados</span>
                    </div>

                    {/* Tabs de Filtro */}
                    <div className="flex p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'pending', label: 'Pendentes' },
                        { id: 'rejected', label: 'Reprovados' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setDriverFilter(tab.id as any)}
                          className={`flex-1 py-2 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${driverFilter === tab.id
                            ? 'bg-[var(--bg-primary)] text-[#FBBF24] shadow-sm'
                            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {allDrivers
                        .filter(d => {
                          if (driverFilter === 'all') return true;
                          return d.status === driverFilter;
                        })
                        .sort((a, b) => {
                          if (a.status === 'pending' && b.status !== 'pending') return -1;
                          if (a.status !== 'pending' && b.status === 'pending') return 1;
                          return 0;
                        }).map((driver) => (
                          <button
                            key={driver.id}
                            onClick={() => setSelectedDriver(driver)}
                            className="w-full bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] flex items-center justify-between hover:border-[var(--primary-color)]/50 transition-all text-left group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                                {driver.profile_url ? <img src={driver.profile_url} alt="" className="w-full h-full object-cover" /> : <Users className="text-[var(--text-tertiary)]" size={24} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-[var(--text-primary)]">{driver.full_name}</p>
                                  {driver.status === 'pending' && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  {driver.status === 'active' ? (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <Activity size={10} className="text-blue-500" />
                                        <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{driver.totalRides} Viagens</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Users size={10} className="text-purple-500" />
                                        <span className="text-[10px] font-bold text-[var(--text-tertiary)]">{driver.totalPassengers} Pass.</span>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-[9px] font-bold text-orange-500/60 flex items-center gap-1 italic">
                                      <Clock size={10} />
                                      {driver.status === 'pending' ? 'Aguarda aprovação inicial' : 'Conta desativada'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded text-[8px] font-black tracking-widest uppercase ${driver.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                {driver.status}
                              </span>
                              <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        ))}

                      {allDrivers.length === 0 && (
                        <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] space-y-4">
                          <Users className="mx-auto text-[var(--text-tertiary)]" size={40} />
                          <p className="text-[var(--text-secondary)] text-sm font-medium">Nenhum motorista registado</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-xl">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Perfil Administrador</h3>
                      <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#FBBF24] flex items-center justify-center font-black text-black">M</div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Mansur Regulo</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">mansurmuquissirimaregulo13@gmail.com</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-xl">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Sistema e Gestão</h3>
                      <div className="space-y-2">
                        <button onClick={() => setSubView('bairros')} className="w-full p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between text-left group active:scale-[0.98] transition-all">
                          <span className="text-xs font-bold text-[var(--text-primary)]">Gestão de Bairros</span>
                          <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button onClick={() => setSubView('prices')} className="w-full p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between text-left group active:scale-[0.98] transition-all">
                          <span className="text-xs font-bold text-[var(--text-primary)]">Preços e Taxas</span>
                          <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button onClick={() => setSubView('logs')} className="w-full p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between text-left group active:scale-[0.98] transition-all">
                          <span className="text-xs font-bold text-[var(--text-primary)]">Logs do Sistema</span>
                          <ChevronRight size={16} className="text-[var(--text-tertiary)] group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl border border-[var(--border-color)] space-y-4 shadow-xl">
                      <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Suporte e Contacto</h3>
                      <div className="space-y-2">
                        <a href="mailto:mansurmuquissirimaregulo13@gmail.com" className="w-full p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between text-left">
                          <span className="text-xs font-bold text-[var(--text-primary)]">Enviar Email Suporte</span>
                          <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
                        </a>
                        <button
                          className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center active:scale-[0.98] transition-all"
                          onClick={async () => {
                            await supabase.auth.signOut();
                            localStorage.clear();
                            onNavigate('home');
                          }}
                        >
                          <span className="text-xs font-black text-red-500 uppercase">Sair do Painel Admin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              renderSubView()
            )}
          </div>
        )}
      </div>

      {/* Driver Details Modal */}
      <AnimatePresence>
        {selectedDriver && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDriver(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-[var(--bg-primary)] rounded-t-[32px] sm:rounded-[32px] border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[var(--border-color)] flex items-center justify-between sticky top-0 bg-[var(--bg-primary)] z-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden">
                    {selectedDriver.avatar_url ? (
                      <img src={selectedDriver.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#FBBF24]/10 text-[#FBBF24] font-black">
                        {selectedDriver.full_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{selectedDriver.full_name}</h3>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">{selectedDriver.phone}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDriver(null)} className="p-2 bg-[var(--bg-secondary)] rounded-full text-[var(--text-secondary)]">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Stats Grid - Only for Active */}
                {selectedDriver.status === 'active' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
                      <Activity size={18} className="text-blue-500 mb-2" />
                      <p className="text-xl font-black text-[var(--text-primary)]">{selectedDriver.totalRides || 0}</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)]">Viagens Concluídas</p>
                    </div>
                    <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
                      <Users size={18} className="text-purple-500 mb-2" />
                      <p className="text-xl font-black text-[var(--text-primary)]">{selectedDriver.totalPassengers || 0}</p>
                      <p className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)]">Passageiros Levados</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Motorista Novo / Em Análise</p>
                    <p className="text-[11px] text-orange-500 mt-1 font-medium">As estatísticas estarão disponíveis após a ativação.</p>
                  </div>
                )}

                {/* Vehicle Info Detalhada */}
                <div className="bg-[var(--bg-secondary)] p-6 rounded-[32px] border border-[var(--border-color)] space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)]">Informação do Veículo</h4>
                    <span className="px-2 py-0.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-[8px] font-black uppercase text-[#FBBF24]">
                      {selectedDriver.vehicle_type}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[9px] uppercase font-black text-[var(--text-tertiary)] tracking-tighter mb-1">Modelo / Marca</p>
                      <p className="text-xs font-bold text-[var(--text-primary)] uppercase truncate">
                        {selectedDriver.vehicle_model || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black text-[var(--text-tertiary)] tracking-tighter mb-1">Matrícula</p>
                      <p className="text-xs font-bold text-[var(--text-primary)] uppercase">
                        {selectedDriver.vehicle_plate || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black text-[var(--text-tertiary)] tracking-tighter mb-1">Cor Predominante</p>
                      <p className="text-xs font-bold text-[var(--text-primary)] uppercase">
                        {selectedDriver.vehicle_color || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black text-[var(--text-tertiary)] tracking-tighter mb-1">Ano de Fabrico</p>
                      <p className="text-xs font-bold text-[var(--text-primary)] uppercase">
                        {selectedDriver.vehicle_year || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Documents Verification - Bigger & Zoom */}
                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase font-black tracking-widest text-[var(--text-tertiary)] ml-1">Documentos de Identificação</h4>
                  <div className="grid grid-cols-1 gap-6">
                    {[
                      { label: 'BI (Frente)', url: selectedDriver.bi_front_url },
                      { label: 'BI (Verso)', url: selectedDriver.bi_back_url },
                      { label: 'Carta de Condução', url: selectedDriver.license_url },
                      { label: 'Livrete da Viatura', url: selectedDriver.vehicle_doc_url }
                    ].map((doc, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <p className="text-[10px] font-black uppercase text-[var(--text-secondary)]">{doc.label}</p>
                          <span className="text-[8px] text-[var(--text-tertiary)] font-bold italic">Toca para ampliar</span>
                        </div>
                        <div
                          className="aspect-[4/3] bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] overflow-hidden group relative cursor-zoom-in active:scale-[0.98] transition-all shadow-md"
                          onClick={() => doc.url && setZoomImage(doc.url)}
                        >
                          {doc.url ? (
                            <img src={doc.url} alt={doc.label} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-40">
                              <FileText size={32} />
                              <span className="text-[10px] font-bold">Não carregado</span>
                            </div>
                          )}
                          <div className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-xl text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            <Activity size={16} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex gap-3 sticky bottom-0">
                {selectedDriver.status === 'pending' || selectedDriver.status === 'rejected' ? (
                  <>
                    <Button variant="outline" className="flex-1 h-14 border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10" onClick={() => handleRejectDriver(selectedDriver.id)}>
                      Rejeitar
                    </Button>
                    <Button className="flex-1 h-14 shadow-xl shadow-[var(--primary-glow)]" onClick={() => handleApproveDriver(selectedDriver.id, selectedDriver.phone)}>
                      Aprovar e WhatsApp
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col w-full gap-2">
                    <Button
                      variant="outline"
                      className="w-full h-14 border-green-500/20 text-green-500 bg-green-500/5 hover:bg-green-500/10"
                      onClick={() => {
                        const driverPhone = selectedDriver.phone_whatsapp || selectedDriver.phone || '';
                        let cleanPhone = driverPhone.replace(/\D/g, '');
                        if (cleanPhone.startsWith('8')) cleanPhone = '258' + cleanPhone;

                        if (cleanPhone) {
                          const msg = encodeURIComponent('Olá! Precisamos falar sobre sua conta no Quelimove.');
                          window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                        } else {
                          alert('Telefone não encontrado.');
                        }
                      }}
                    >
                      Conversar no WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-12 border-blue-500/20 text-blue-500 bg-blue-500/5 hover:bg-blue-500/10"
                      onClick={() => {
                        const driverPhone = selectedDriver.phone || selectedDriver.phone_whatsapp || '';
                        let cleanPhone = driverPhone.replace(/\D/g, '');
                        if (cleanPhone.startsWith('8')) cleanPhone = '258' + cleanPhone;

                        if (cleanPhone) {
                          const msg = 'Olá! Precisamos falar sobre sua conta no Quelimove.';
                          window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(msg)}`;
                        } else {
                          alert('Telefone não encontrado.');
                        }
                      }}
                    >
                      Enviar SMS Normal
                    </Button>
                    <Button variant="outline" className="w-full h-12 border-red-500/20 text-red-500 bg-red-500/5" onClick={() => handleRejectDriver(selectedDriver.id)}>
                      Desativar / Bloquear
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'metrics' || tab === 'drivers' || tab === 'settings' || tab === 'rides') {
            setActiveTab(tab as any);
            setSubView('none');
          } else {
            onNavigate(tab);
          }
        }}
        userType="admin"
      />
    </div>
  );
}