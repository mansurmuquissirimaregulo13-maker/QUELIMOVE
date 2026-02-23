export interface Profile {
    id: string;
    full_name: string | null;
    role: 'user' | 'driver' | 'admin';
    phone: string | null;
    vehicle_type?: string | null;
    vehicle_plate?: string | null;
    status: 'active' | 'inactive' | 'pending';
    created_at?: string;
    updated_at?: string;
    avatar_url?: string | null;
    balance?: number;
    [key: string]: any; // Allow for extra fields from Supabase
}

export interface UserProfile extends Profile {
    name: string | null; // Used in App state
}

export interface Ride {
    id: string;
    user_id: string;
    driver_id: string | null;
    pickup_location: string;
    destination_location: string;
    pickup_lat: number;
    pickup_lng: number;
    dest_lat: number;
    dest_lng: number;
    estimate: string;
    status: 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
    price_final?: number;
    driver_earnings?: number;
    distance?: number;
}
