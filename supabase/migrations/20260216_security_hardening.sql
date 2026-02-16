-- SECURITY HARDENING MIGRATION
-- Goal: Prevent Race Conditions and Unauthorized Edits

-- 1. TIGHTEN RIDES UPDATE POLICY FOR DRIVERS
-- Drivers should ONLY be able to update:
-- a) status to 'accepted' IF current status is 'pending'
-- b) driver_id to their own ID IF current status is 'pending'
-- c) status to 'arrived', 'in_progress', 'completed' IF they are already the driver

DROP POLICY IF EXISTS "Drivers can update rides" ON public.rides;

CREATE POLICY "Drivers can update rides" ON public.rides
    FOR UPDATE USING (
        -- Allowed to update if:
        (auth.uid() = driver_id) OR -- Already the driver
        (status = 'pending' AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'driver')) -- Claiming a ride
    )
    WITH CHECK (
        -- If claiming a ride (was pending):
        (
            (SELECT status FROM public.rides WHERE id = id) = 'pending' AND
            status = 'accepted' AND
            driver_id = auth.uid()
        ) OR
        -- If already the driver:
        (
            driver_id = auth.uid() AND
            -- Ensure they don't change the user_id or price (unless logic requires, but usually not)
            user_id = (SELECT user_id FROM public.rides WHERE id = id)
        )
    );

-- 2. PREVENT RACE CONDITIONS (Atomic Acceptance)
-- Function to safely accept a ride
CREATE OR REPLACE FUNCTION public.accept_ride_atomic(ride_id UUID, driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INT;
BEGIN
    UPDATE public.rides
    SET 
        status = 'accepted',
        driver_id = accept_ride_atomic.driver_id,
        updated_at = now()
    WHERE 
        id = accept_ride_atomic.ride_id AND
        status = 'pending';
        
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENSURE PROFILES ARE READABLE (Fix for 'Analysis' screen issues)
-- Public profiles should be minimal, but full profile readable by self and admins/drivers in context.
-- Existing policies seem OK but ensuring 'active' status is visible to owner is key.

DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;

CREATE POLICY "Profiles visibility" ON public.profiles
    FOR SELECT USING (
        (auth.uid() = id) OR -- Self
        (role = 'driver' AND status = 'active') OR -- Active drivers visible for matching (filtered by location in query)
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
        -- Visible if involved in a ride with the user
        EXISTS (
            SELECT 1 FROM public.rides 
            WHERE (user_id = auth.uid() OR driver_id = auth.uid())
            AND (user_id = public.profiles.id OR driver_id = public.profiles.id)
        )
    );
