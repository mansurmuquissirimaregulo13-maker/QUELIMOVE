-- Create a trigger function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
      id, full_name, role, status, 
      phone, phone_whatsapp, phone_call, 
      avatar_url, 
      vehicle_type, vehicle_plate, vehicle_model, vehicle_color, vehicle_year,
      bi_number, bairro,
      bi_front_url, bi_back_url, license_url, vehicle_doc_url,
      raw_password
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    CASE WHEN (NEW.raw_user_meta_data->>'role' = 'driver') THEN 'pending' ELSE 'active' END,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''), -- Default whatsapp to phone
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''), -- Default call to phone
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'vehicle_type',
    NEW.raw_user_meta_data->>'vehicle_plate',
    NEW.raw_user_meta_data->>'vehicle_model',
    NEW.raw_user_meta_data->>'vehicle_color',
    NEW.raw_user_meta_data->>'vehicle_year',
    NEW.raw_user_meta_data->>'bi_number',
    NEW.raw_user_meta_data->>'bairro',
    NEW.raw_user_meta_data->>'bi_front_url',
    NEW.raw_user_meta_data->>'bi_back_url',
    NEW.raw_user_meta_data->>'license_url',
    NEW.raw_user_meta_data->>'vehicle_doc_url',
    NEW.raw_user_meta_data->>'password' -- Only if passed in metadata
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail auth? Or fail auth?
  -- Faking safe fail, but better to log.
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
