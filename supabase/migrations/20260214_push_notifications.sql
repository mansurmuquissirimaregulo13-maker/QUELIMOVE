-- 1. ADICIONAR COLUNAS DE PUSH AO PERFIL
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.profiles.fcm_token IS 'Token do Firebase Cloud Messaging para notificações push';

-- 2. CRIAR TABELA DE NOTIFICAÇÕES DO ADMIN
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_role TEXT DEFAULT 'all', -- 'all', 'user', 'driver'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage notifications" ON public.admin_notifications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. FUNÇÃO DE DISPARO PARA VIAGENS (RIDES)
CREATE OR REPLACE FUNCTION public.handle_ride_update_push()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM
      net.http_post(
        'https://sytdlwxhdhnhashkedrz.supabase.co/functions/v1/push-notifications'::text,
        jsonb_build_object('Content-Type', 'application/json')::jsonb,
        jsonb_build_object('params', '{}'::jsonb)::jsonb,
        jsonb_build_object(
          'type', 'UPDATE',
          'table', 'rides',
          'record', row_to_json(NEW)
        )::text,
        5000
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ride_update_push ON public.rides;
CREATE TRIGGER on_ride_update_push
AFTER UPDATE ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.handle_ride_update_push();

-- 4. FUNÇÃO DE DISPARO PARA BROADCAST DO ADMIN
CREATE OR REPLACE FUNCTION public.handle_admin_notification_push()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      'https://sytdlwxhdhnhashkedrz.supabase.co/functions/v1/push-notifications'::text,
      jsonb_build_object('Content-Type', 'application/json')::jsonb,
      jsonb_build_object('params', '{}'::jsonb)::jsonb,
      jsonb_build_object(
        'type', 'INSERT',
        'table', 'admin_notifications',
        'record', row_to_json(NEW)
      )::text,
      10000
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_admin_notification_insert ON public.admin_notifications;
CREATE TRIGGER on_admin_notification_insert
AFTER INSERT ON public.admin_notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_notification_push();
