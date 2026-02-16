import * as React from 'react';
import { supabase } from '../lib/supabase';
import { BottomNav } from '../components/BottomNav';
import { DollarSign, Car, Clock, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DriverRidesPageProps {
    onNavigate: (page: string) => void;
}

export function DriverRidesPage({ onNavigate }: DriverRidesPageProps) {
    const [todaysEarnings, setTodaysEarnings] = React.useState(0);
    const [todaysRidesCount, setTodaysRidesCount] = React.useState(0);
    const [rideHistory, setRideHistory] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        fetchStats();
        fetchHistory();
    }, []);

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

    const fetchHistory = async () => {
        setLoading(true);
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data } = await supabase
            .from('rides')
            .select('*')
            .eq('driver_id', userData.user.id)
            .in('status', ['completed', 'cancelled']) // Show cancelled too for history
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            setRideHistory(data);
        }
        setLoading(false);
    };

    return (
        <div className="h-[100dvh] w-full flex flex-col bg-[#F9FAFB]">
            <div className="bg-white px-6 pt-12 pb-6 shadow-sm border-b border-gray-100 z-10 sticky top-0">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Viagens & Ganhos</h1>
                <p className="text-gray-500 text-sm mt-1">Resumo da sua atividade hoje</p>
            </div>

            <div className="flex-1 overflow-y-auto pb-[100px]">
                <div className="p-6 space-y-6">
                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-1">
                                <DollarSign size={20} />
                            </div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Ganhos Hoje</p>
                            <p className="text-2xl font-black text-gray-900">{todaysEarnings} MT</p>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                                <Car size={20} />
                            </div>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Viagens</p>
                            <p className="text-2xl font-black text-gray-900">{todaysRidesCount}</p>
                        </div>
                    </div>

                    {/* Histórico Recente */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Histórico Recente</h2>
                            <button className="text-xs font-bold text-[#FBBF24] uppercase">Ver Tudo</button>
                        </div>

                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center py-10 text-gray-400">Carregando histórico...</div>
                            ) : rideHistory.length > 0 ? (
                                rideHistory.map((ride) => (
                                    <div key={ride.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${ride.status === 'cancelled' ? 'bg-red-50 text-red-400' : 'bg-gray-50 text-gray-400'}`}>
                                                <Clock size={18} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-gray-900 truncate pr-2">{ride.destination_location}</h3>
                                                <p className="text-xs text-gray-500 mt-0.5 capitalize flex items-center gap-1">
                                                    {ride.status === 'cancelled' ? <span className="text-red-500 font-bold">Cancelada</span> : format(new Date(ride.created_at), "d MMM, HH:mm", { locale: ptBR })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 pl-2">
                                            {ride.status !== 'cancelled' && (
                                                <span className="text-sm font-black text-green-600 whitespace-nowrap">
                                                    {ride.estimate} MT
                                                </span>
                                            )}
                                            <ChevronRight size={16} className="text-gray-300" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                        <Car size={32} />
                                    </div>
                                    <p className="text-gray-900 font-medium">Nenhuma viagem encontrada</p>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">As suas viagens concluídas aparecerão aqui.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <BottomNav
                activeTab="earnings"
                onTabChange={(tab) => onNavigate(tab)}
                userType="driver"
            />
        </div>
    );
}
