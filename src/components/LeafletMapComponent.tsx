import * as React from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

// Fix para ícones padrão do Leaflet no Vite
// Fix para ícones padrão do Leaflet no Vite
// Usando abordagens que evitam erros de resolução de módulo em TS se os assets não estiverem tipados
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Ícones Customizados fixos
const USER_ICON = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/711/711769.png',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

const MOTO_ICON = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3421/3421526.png',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});

const CAR_ICON = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2607/2607590.png',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
});

const PICKUP_ICON = L.divIcon({
    className: 'custom-pickup-icon',
    html: '<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

const DEST_ICON = L.divIcon({
    className: 'custom-dest-icon',
    html: '<div style="background-color: #FBBF24; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(251,191,36,0.5);"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

interface LeafletMapComponentProps {
    center: [number, number];
    pickup?: { lat: number; lng: number; name: string } | null;
    destination?: { lat: number; lng: number; name: string } | null;
    userLocation?: [number, number] | null;
    height?: string;
    drivers?: Array<{ id: string; lat: number; lng: number; type: string }>;
    onMoveEnd?: (center: [number, number]) => void;
}

export const LeafletMapComponent: React.FC<LeafletMapComponentProps> = ({
    center,
    pickup,
    destination,
    userLocation,
    height = '100%',
    drivers = [],
    onMoveEnd
}) => {
    const mapRef = React.useRef<L.Map | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const markersRef = React.useRef<{ [key: string]: L.Marker }>({});
    const routeLayerRef = React.useRef<L.Polyline | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = React.useState(false);

    // Inicialização do Mapa (Apenas uma vez)
    React.useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
            center: center,
            zoom: 14,
            zoomControl: false,
            attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        map.on('moveend', () => {
            if (onMoveEnd) {
                const { lat, lng } = map.getCenter();
                onMoveEnd([lat, lng]);
            }
        });

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Ref to track the last center prop value processed to avoid re-centering on same values
    const lastCenterPropRef = React.useRef<string>('');

    // Atualizar centro do mapa
    React.useEffect(() => {
        // Only update center if we DON'T have a route actively showing, 
        // to avoid fighting the fitBounds in the route effect
        // AND ensure map reference exists
        // AND ensure center is valid
        if (mapRef.current && !routeLayerRef.current && isFinite(center[0]) && isFinite(center[1])) {
            const centerKey = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;

            // If the PROP hasn't changed from what we last processed, DON'T TOUCH THE MAP
            // This stops the map from snapping back when user drags it
            if (centerKey === lastCenterPropRef.current) {
                return;
            }

            // Prop changed! Update map.
            lastCenterPropRef.current = centerKey;
            mapRef.current.setView(center, mapRef.current.getZoom());
        }
    }, [center[0], center[1]]);

    // Gerenciar Marcador do Usuário
    React.useEffect(() => {
        if (!mapRef.current) return;

        if (userLocation && isFinite(userLocation[0]) && isFinite(userLocation[1])) {
            if (!markersRef.current['user']) {
                markersRef.current['user'] = L.marker(userLocation, { icon: USER_ICON }).addTo(mapRef.current);
            } else {
                markersRef.current['user'].setLatLng(userLocation);
            }
        } else if (markersRef.current['user']) {
            markersRef.current['user'].remove();
            delete markersRef.current['user'];
        }
    }, [userLocation]);

    // Gerenciar Marcadores de Pickup e Destino
    React.useEffect(() => {
        if (!mapRef.current) return;

        // Pickup
        if (pickup && isFinite(pickup.lat) && isFinite(pickup.lng)) {
            if (!markersRef.current['pickup']) {
                markersRef.current['pickup'] = L.marker([pickup.lat, pickup.lng], { icon: PICKUP_ICON }).addTo(mapRef.current);
            } else {
                markersRef.current['pickup'].setLatLng([pickup.lat, pickup.lng]);
            }
        } else if (markersRef.current['pickup']) {
            markersRef.current['pickup'].remove();
            delete markersRef.current['pickup'];
        }

        // Destination
        if (destination && isFinite(destination.lat) && isFinite(destination.lng)) {
            if (!markersRef.current['destination']) {
                markersRef.current['destination'] = L.marker([destination.lat, destination.lng], { icon: DEST_ICON }).addTo(mapRef.current);
            } else {
                markersRef.current['destination'].setLatLng([destination.lat, destination.lng]);
            }
        } else if (markersRef.current['destination']) {
            markersRef.current['destination'].remove();
            delete markersRef.current['destination'];
        }
    }, [pickup, destination]);

    // Gerenciar Rota (OSRM)
    React.useEffect(() => {
        if (!mapRef.current) return;

        if (pickup && destination && isFinite(pickup.lat) && isFinite(destination.lat)) {
            console.log('Fetching route from', pickup, 'to', destination);
            const fetchRoute = async () => {
                setIsLoadingRoute(true);
                try {
                    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.routes && data.routes.length > 0 && mapRef.current) {
                        console.log('Route found:', data.routes[0].distance, 'meters');
                        const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]) as [number, number][];

                        if (routeLayerRef.current) {
                            routeLayerRef.current.setLatLngs(coords);
                        } else {
                            routeLayerRef.current = L.polyline(coords, { color: '#0000FF', weight: 8, opacity: 1.0 }).addTo(mapRef.current);
                        }

                        // Fit bounds to route
                        mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });
                    }
                } catch (error) {
                    console.error('OSRM Route error:', error);
                } finally {
                    setIsLoadingRoute(false);
                }
            };
            fetchRoute();
        } else {
            if (routeLayerRef.current) {
                routeLayerRef.current.remove();
                routeLayerRef.current = null;
            }
        }
    }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng]);

    // Gerenciar Marcadores de Motoristas
    React.useEffect(() => {
        if (!mapRef.current) return;

        const currentDriverIds = new Set(drivers.map(d => d.id));

        // Remover motoristas que sumiram
        Object.keys(markersRef.current).forEach(id => {
            if (id.startsWith('driver_') && !currentDriverIds.has(id.replace('driver_', ''))) {
                markersRef.current[id].remove();
                delete markersRef.current[id];
            }
        });

        // Adicionar ou atualizar motoristas
        drivers.forEach(driver => {
            if (!isFinite(driver.lat) || !isFinite(driver.lng)) return;
            const markerId = `driver_${driver.id}`;
            const latlng: [number, number] = [driver.lat, driver.lng];
            const icon = driver.type === 'moto' ? MOTO_ICON : CAR_ICON;

            if (!markersRef.current[markerId]) {
                markersRef.current[markerId] = L.marker(latlng, { icon }).addTo(mapRef.current!);
            } else {
                markersRef.current[markerId].setLatLng(latlng);
            }
        });
    }, [drivers]);

    return (
        <div style={{ height, width: '100%', position: 'relative' }}>
            <div ref={containerRef} style={{ height: '100%', width: '100%', background: '#e5e5e5' }} />

            {isLoadingRoute && (
                <div className="absolute top-4 right-4 bg-black/60 p-2 rounded-full z-[1000]">
                    <Loader2 className="w-5 h-5 text-[#FBBF24] animate-spin" />
                </div>
            )}
        </div>
    );
};
