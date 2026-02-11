import * as React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, DirectionsRenderer } from '@react-google-maps/api';
import { Loader2, Key } from 'lucide-react';

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ['places'];

interface MapComponentProps {
    center: [number, number];
    pickup?: { lat: number; lng: number; name: string } | null;
    destination?: { lat: number; lng: number; name: string } | null;
    userLocation?: [number, number] | null;
    height?: string;
    drivers?: Array<{ id: string; lat: number; lng: number; type: 'moto' | 'carro' | 'txopela' }>;
}

const getMapContainerStyle = (height = '100%') => ({
    width: '100%',
    height: height
});

const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#1d2c4d" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#8ec3b9" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a3646" }] },
    {
        featureType: "administrative.country",
        elementType: "geometry.stroke",
        stylers: [{ color: "#4b6878" }],
    },
    {
        featureType: "administrative.land_parcel",
        elementType: "labels.text.fill",
        stylers: [{ color: "#64779e" }],
    },
    {
        featureType: "administrative.province",
        elementType: "geometry.stroke",
        stylers: [{ color: "#4b6878" }],
    },
    {
        featureType: "landscape.man_made",
        elementType: "geometry.stroke",
        stylers: [{ color: "#334e87" }],
    },
    {
        featureType: "landscape.natural",
        elementType: "geometry",
        stylers: [{ color: "#023e58" }],
    },
    {
        featureType: "poi",
        elementType: "geometry",
        stylers: [{ color: "#283d6a" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6f9ba5" }],
    },
    {
        featureType: "poi",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#1d2c4d" }],
    },
    {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
    },
    {
        featureType: "poi.park",
        elementType: "geometry.fill",
        stylers: [{ color: "#023e58" }],
    },
    {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#3C7680" }],
    },
    {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#304a7d" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#98a5be" }],
    },
    {
        featureType: "road",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#1d2c4d" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#2c6675" }],
    },
    {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#255761" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#b0d5ce" }],
    },
    {
        featureType: "road.highway",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#023e58" }],
    },
    {
        featureType: "transit",
        elementType: "labels.text.fill",
        stylers: [{ color: "#98a5be" }],
    },
    {
        featureType: "transit",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#1d2c4d" }],
    },
    {
        featureType: "transit.line",
        elementType: "geometry.fill",
        stylers: [{ color: "#283d6a" }],
    },
    {
        featureType: "transit.station",
        elementType: "geometry",
        stylers: [{ color: "#3a4762" }],
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#0e1626" }],
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#4e6d70" }],
    },
];

export const MapComponent: React.FC<MapComponentProps> = ({
    center,
    pickup,
    destination,
    userLocation,
    height,
    drivers = []
}) => {
    const googleMapsApiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";
    const isApiKeyMissing = !googleMapsApiKey || googleMapsApiKey === "SUA_CHAVE_AQUI";

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey,
        libraries: LIBRARIES,
    });

    const mapRef = React.useRef<google.maps.Map | null>(null);
    const [directions, setDirections] = React.useState<google.maps.DirectionsResult | null>(null);

    // Estabilizar o objeto de centro para evitar re-renders infinitos do Google Maps
    const stableCenter = React.useMemo(() => ({
        lat: center[0],
        lng: center[1]
    }), [center[0], center[1]]);

    const onLoad = React.useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = React.useCallback(() => {
        mapRef.current = null;
    }, []);

    React.useEffect(() => {
        if (pickup && destination && isLoaded) {
            const directionsService = new google.maps.DirectionsService();
            directionsService.route(
                {
                    origin: { lat: pickup.lat, lng: pickup.lng },
                    destination: { lat: destination.lat, lng: destination.lng },
                    travelMode: google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK && result) {
                        setDirections(result);

                        // Ajustar o zoom para caber a rota, mas manter a fluidez
                        if (mapRef.current) {
                            const bounds = new google.maps.LatLngBounds();
                            bounds.extend({ lat: pickup.lat, lng: pickup.lng });
                            bounds.extend({ lat: destination.lat, lng: destination.lng });
                            mapRef.current.fitBounds(bounds, 80);
                        }
                    } else {
                        console.error('Directions request failed due to ' + status);
                    }
                }
            );
        } else {
            setDirections(null);
        }
    }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng, isLoaded]);

    if (loadError || isApiKeyMissing) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-[#1a1a1a] text-white p-8 text-center border-2 border-dashed border-red-500/30 rounded-2xl">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                    <Key className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Configuração Necessária</h2>
                <p className="text-sm text-gray-400 mb-6">
                    A chave da API do Google Maps é inválida ou está ausente no arquivo <code>.env</code>.
                </p>
                <div className="bg-black/40 p-4 rounded-xl text-left font-mono text-xs text-blue-400 border border-blue-500/20">
                    VITE_GOOGLE_MAPS_API_KEY=sua_chave_aqui
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="h-full flex items-center justify-center bg-[#1a1a1a]">
                <Loader2 className="w-10 h-10 text-[#FBBF24] animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full w-full relative map-container overflow-hidden">
            <style>
                {`
                    .gmnoprint, .gm-style-cc { display:none !important; }
                    .gm-style img { max-width: none; }
                    a[href^="https://maps.google.com/maps"] { display:none !important; }
                    a[href^="https://www.google.com/intl/en-US_US/help/terms_maps.html"] { display:none !important; }
                    .gm-bundled-control-on-bottom { display: none !important; }
                `}
            </style>
            <GoogleMap
                mapContainerStyle={getMapContainerStyle(height)}
                center={stableCenter}
                zoom={14}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    styles: darkMapStyle,
                    disableDefaultUI: true,
                    zoomControl: false,
                    mapTypeControl: false,
                    scaleControl: false,
                    streetViewControl: false,
                    rotateControl: false,
                    fullscreenControl: false,
                    gestureHandling: 'greedy',
                }}
            >
                {/* Marcador de Localização do Usuário */}
                {userLocation && isFinite(userLocation[0]) && isFinite(userLocation[1]) && (
                    <MarkerF
                        position={{ lat: userLocation[0], lng: userLocation[1] }}
                        icon={{
                            url: 'https://cdn-icons-png.flaticon.com/512/711/711769.png',
                            scaledSize: new google.maps.Size(30, 30),
                            anchor: new google.maps.Point(15, 15)
                        }}
                    />
                )}

                {/* Marcador de Pickup */}
                {pickup && isFinite(pickup.lat) && isFinite(pickup.lng) && !directions && (
                    <MarkerF
                        position={{ lat: pickup.lat, lng: pickup.lng }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#3b82f6',
                            fillOpacity: 1,
                            strokeWeight: 4,
                            strokeColor: '#ffffff',
                            scale: 8
                        }}
                    />
                )}

                {/* Marcador de Destino */}
                {destination && isFinite(destination.lat) && isFinite(destination.lng) && !directions && (
                    <MarkerF
                        position={{ lat: destination.lat, lng: destination.lng }}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#FBBF24',
                            fillOpacity: 1,
                            strokeWeight: 4,
                            strokeColor: '#ffffff',
                            scale: 8
                        }}
                    />
                )}

                {/* Renderização da Rota */}
                {directions && (
                    <DirectionsRenderer
                        directions={directions}
                        options={{
                            polylineOptions: {
                                strokeColor: '#FBBF24',
                                strokeWeight: 5,
                                strokeOpacity: 0.8
                            },
                            suppressMarkers: false,
                        }}
                    />
                )}

                {/* Marcadores de Motoristas */}
                {drivers.filter(d => isFinite(d.lat) && isFinite(d.lng)).map((driver) => (
                    <MarkerF
                        key={driver.id}
                        position={{ lat: driver.lat, lng: driver.lng }}
                        icon={{
                            url: driver.type === 'moto'
                                ? 'https://cdn-icons-png.flaticon.com/512/3421/3421526.png'
                                : 'https://cdn-icons-png.flaticon.com/512/2607/2607590.png',
                            scaledSize: new google.maps.Size(35, 35),
                            anchor: new google.maps.Point(17, 17)
                        }}
                    />
                ))}
            </GoogleMap>
        </div>
    );
};
