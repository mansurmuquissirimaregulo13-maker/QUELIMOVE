-- QUELIMOVE - CORE BACKEND MIGRATION
-- Robustness: Error handling, Recursive-safe RLS, and Spatial Performance

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. SCHEMA UPDATE: PROFILES
-- Adding phone numbers (WhatsApp and Call) and spatial location
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_call TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles USING GIST (location);
CREATE INDEX IF NOT EXISTS profiles_phone_whatsapp_idx ON public.profiles (phone_whatsapp);
CREATE INDEX IF NOT EXISTS profiles_phone_call_idx ON public.profiles (phone_call);

-- 3. NEW TABLES
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now(),
    delivered BOOLEAN DEFAULT FALSE,
    read BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    request_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS locations_location_idx ON public.locations USING GIST (location);
CREATE INDEX IF NOT EXISTS verification_codes_phone_idx ON public.verification_codes (phone);

-- 4. ROBUST RLS POLICIES (JWT metadata-based to prevent recursion)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Visibility
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
CREATE POLICY "Profiles visibility" ON public.profiles
    FOR SELECT USING (
        (auth.uid() = id) OR 
        (role = 'driver' AND EXISTS (
            SELECT 1 FROM public.rides 
            WHERE user_id = auth.uid() AND driver_id = public.profiles.id 
            AND status IN ('accepted', 'a_caminho', 'em_corrida')
        )) OR
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    );

-- Profiles Self Management
DROP POLICY IF EXISTS "Self registration" ON public.profiles;
CREATE POLICY "Self registration" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Self update" ON public.profiles;
CREATE POLICY "Self update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Rides Visibility
DROP POLICY IF EXISTS "Rides visibility" ON public.rides;
CREATE POLICY "Rides visibility" ON public.rides
    FOR SELECT USING (
        (auth.uid() = user_id) OR 
        (auth.uid() = driver_id) OR 
        (auth.uid() = target_driver_id) OR
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
        (status = 'pending' AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'driver'))
    );

-- Other tables: Simplified
CREATE POLICY "Users view own locations" ON public.locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own locations" ON public.locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- 5. ROBUST FUNCTIONS & LOGIC

-- OTP Logic
CREATE OR REPLACE FUNCTION public.request_otp(phone_number TEXT)
RETURNS TEXT AS $$
DECLARE new_code TEXT;
BEGIN
    new_code := floor(random() * 900000 + 100000)::text;
    UPDATE public.verification_codes SET expires_at = now() WHERE phone = phone_number AND expires_at > now();
    INSERT INTO public.verification_codes (phone, code, expires_at) VALUES (phone_number, new_code, now() + interval '10 minutes');
    RETURN new_code;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in request_otp: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.verify_otp(phone_number TEXT, input_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE is_valid BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.verification_codes WHERE phone = phone_number AND code = input_code AND expires_at > now() AND verified = false
    ) INTO is_valid;
    IF is_valid THEN
        UPDATE public.verification_codes SET verified = true WHERE phone = phone_number AND code = input_code;
    END IF;
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Driver Registration
CREATE OR REPLACE FUNCTION public.register_driver(
    p_full_name TEXT, p_phone_call TEXT, p_phone_whatsapp TEXT, p_vehicle_type TEXT
) RETURNS UUID AS $$
DECLARE new_user_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE phone_call = p_phone_call OR phone_whatsapp = p_phone_whatsapp) THEN
        RAISE EXCEPTION 'Este número de telefone já está registado.';
    END IF;
    INSERT INTO public.profiles (id, full_name, phone_call, phone_whatsapp, vehicle_type, role, status, verified)
    VALUES (auth.uid(), p_full_name, p_phone_call, p_phone_whatsapp, p_vehicle_type, 'driver', 'pending', false)
    RETURNING id INTO new_user_id;
    INSERT INTO public.admin_notifications (title, message, target_role)
    VALUES ('Novo Motorista!! 🚦', 'O motorista ' || p_full_name || ' registou-se e aguarda aprovação.', 'admin');
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Location Sychronization
CREATE OR REPLACE FUNCTION public.sync_profile_location() RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.current_lat IS NOT NULL AND NEW.current_lng IS NOT NULL) THEN
        NEW.location = ST_SetSRID(ST_Point(NEW.current_lng, NEW.current_lat), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_location_update ON public.profiles;
CREATE TRIGGER on_profile_location_update BEFORE INSERT OR UPDATE OF current_lat, current_lng ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_location();

-- 6. MATCHING & NOTIFICATION LOGIC
CREATE OR REPLACE FUNCTION public.find_nearby_drivers(pickup_lat FLOAT8, pickup_lng FLOAT8, radius_meters FLOAT8 DEFAULT 3000, max_drivers INT DEFAULT 5)
RETURNS TABLE (id UUID, full_name TEXT, distance FLOAT8, vehicle_type TEXT) AS $$
BEGIN
    RETURN QUERY SELECT p.id, p.full_name, ST_Distance(p.location, ST_SetSRID(ST_Point(pickup_lng, pickup_lat), 4326)::geography) AS distance, p.vehicle_type
    FROM public.profiles p WHERE p.role = 'driver' AND p.is_available = true AND p.status = 'active'
    AND ST_DWithin(p.location, ST_SetSRID(ST_Point(pickup_lng, pickup_lat), 4326)::geography, radius_meters)
    ORDER BY distance ASC LIMIT max_drivers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Auto-Assignment
CREATE OR REPLACE FUNCTION public.assign_initial_driver() RETURNS TRIGGER AS $$
DECLARE nearest_driver_id UUID;
BEGIN
    IF (NEW.status = 'pending') THEN
        SELECT id INTO nearest_driver_id FROM find_nearby_drivers(NEW.pickup_lat, NEW.pickup_lng, 3000, 1);
        IF nearest_driver_id IS NOT NULL THEN
            NEW.target_driver_id := nearest_driver_id;
            INSERT INTO public.notifications (user_id, title, body) VALUES (nearest_driver_id, 'Nova Solicitação! 🔔', 'Tens um novo pedido de corrida por perto.');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ride_created_assign ON public.rides;
CREATE TRIGGER on_ride_created_assign BEFORE INSERT ON public.rides FOR EACH ROW EXECUTE FUNCTION public.assign_initial_driver();
