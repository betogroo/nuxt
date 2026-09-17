create trigger set_profiles_updated_at before
update on public.profiles for each row execute function set_updated_at ();