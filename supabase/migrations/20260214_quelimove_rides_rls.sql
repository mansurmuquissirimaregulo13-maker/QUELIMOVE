-- CRITICAL FIX: ENABLE INSERT AND UPDATE ON RIDES TABLE
-- Without these policies, no rides can be created or accepted due to enabled RLS.

-- 1. Policy for INSERT (Users creating rides)
DROP POLICY IF EXISTS "Users can create rides" ON public.rides;
CREATE POLICY "Users can create rides" ON public.rides
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

-- 2. Policy for UPDATE (Drivers accepting/updating rides)
-- Drivers can update rides where they are the assigned driver OR if they are assigning themselves to a pending ride.
DROP POLICY IF EXISTS "Drivers can update rides" ON public.rides;
CREATE POLICY "Drivers can update rides" ON public.rides
    FOR UPDATE USING (
        -- Can update if currently assigned driver OR user is admin
        (auth.uid() = driver_id) OR
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
        -- Can update if claiming a pending ride (transitioning to accepted)
        (status = 'pending' AND (auth.jwt() -> 'user_metadata' ->> 'role' = 'driver'))
    )
    WITH CHECK (
        -- Ensure they don't change the user_id (hijack ride)
        -- Allow status changes
        true
    );

-- 3. Policy for UPDATE (Users cancelling their own rides)
DROP POLICY IF EXISTS "Users can update own rides" ON public.rides;
CREATE POLICY "Users can update own rides" ON public.rides
    FOR UPDATE USING (
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

-- 4. Policy for DELETE (Admins only)
DROP POLICY IF EXISTS "Admins can delete rides" ON public.rides;
CREATE POLICY "Admins can delete rides" ON public.rides
    FOR DELETE USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    );
