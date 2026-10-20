-- Migration: 20261020163000_add_election_roles.sql
-- Description: Add election roles ('user-election', 'manager-election', 'admin-election') to user_role enum
-- and seed default election test accounts.

-- 1. Add roles to user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'user-election';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager-election';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin-election';

-- 2. Insert election auth users if they do not exist
INSERT INTO auth.users 
(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
VALUES 
('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'user@election.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'manager@election.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'admin@election.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert identities
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) 
VALUES 
(gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', format('{"sub":"%s","email":"%s"}', '66666666-6666-6666-6666-666666666666', 'user@election.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', format('{"sub":"%s","email":"%s"}', '77777777-7777-7777-7777-777777777777', 'manager@election.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '88888888-8888-8888-8888-888888888888', '88888888-8888-8888-8888-888888888888', format('{"sub":"%s","email":"%s"}', '88888888-8888-8888-8888-888888888888', 'admin@election.com')::jsonb, 'email', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 4. Update profiles
INSERT INTO public.profiles (id, name, role, is_active)
VALUES 
('66666666-6666-6666-6666-666666666666', 'Election User', 'user-election', true),
('77777777-7777-7777-7777-777777777777', 'Election Manager', 'manager-election', true),
('88888888-8888-8888-8888-888888888888', 'Election Admin', 'admin-election', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
