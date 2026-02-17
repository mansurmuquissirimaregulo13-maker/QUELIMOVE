-- QUELIMOVE - DRIVER FUNCTIONALITY & EARNINGS MIGRATION

-- 1. FIX RIDES STATUS CONSTRAINT
-- We need to allow 'arrived' and 'in_progress' states
ALTER TABLE public.rides DROP CONSTRAINT IF EXISTS rides_status_check;
ALTER TABLE public.rides ADD CONSTRAINT rides_status_check 
    CHECK (status IN ('pending', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'));

-- 2. ADD EARNINGS TRACKING TO RIDES
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS price_final NUMERIC;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS driver_earnings NUMERIC;

-- 3. ADD BALANCE TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;

-- 4. TRIGGER TO UPDATE BALANCE ON COMPLETION
CREATE OR REPLACE FUNCTION public.handle_ride_completion_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to completed
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed')) THEN
        -- Calculate earnings (e.g., 85% for driver, 15% platform fee)
        -- 'estimate' is text, so we need to cast it
        DECLARE
            v_price NUMERIC;
            v_earnings NUMERIC;
        BEGIN
            v_price := COALESCE(NEW.price_final, NEW.estimate::numeric);
            v_earnings := v_price * 0.85; -- 85% para o motorista
            
            -- Update the ride record
            UPDATE public.rides SET 
                price_final = v_price,
                driver_earnings = v_earnings
            WHERE id = NEW.id;

            -- Update driver balance
            IF NEW.driver_id IS NOT NULL THEN
                UPDATE public.profiles 
                SET balance = balance + v_earnings
                WHERE id = NEW.driver_id;
            END IF;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ride_completion_earnings ON public.rides;
CREATE TRIGGER tr_ride_completion_earnings
    AFTER UPDATE OF status ON public.rides
    FOR EACH ROW
    WHEN (NEW.status = 'completed')
    EXECUTE FUNCTION public.handle_ride_completion_earnings();

-- 5. FUNCTION TO FORCE ARRIVED STATUS (OPTIONAL SAFETY)
CREATE OR REPLACE FUNCTION public.mark_ride_arrived(p_ride_id UUID, p_driver_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.rides
    SET status = 'arrived', updated_at = now()
    WHERE id = p_ride_id 
    AND driver_id = p_driver_id 
    AND status = 'accepted';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
