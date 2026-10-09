-- Seed auth users
INSERT INTO auth.users 
(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
VALUES (
'11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'admin@admin.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''), 

('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'user@user.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'uge@uge.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'user@rg.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '') ,

('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'admin@rg.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '') 

ON CONFLICT (id) DO NOTHING;

-- Insert identities
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) 
VALUES 
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'admin@admin.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222222', 'user@user.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', format('{"sub":"%s","email":"%s"}', '33333333-3333-3333-3333-333333333333', 'uge@uge.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', format('{"sub":"%s","email":"%s"}', '44444444-4444-4444-4444-444444444444', 'user@rg.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', format('{"sub":"%s","email":"%s"}', '55555555-5555-5555-5555-555555555555', 'admin@rg.com')::jsonb, 'email', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Update created profiles
UPDATE public.profiles SET role = 'admin', name = 'Admin', is_active = true WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'user', name = 'User', is_active = true WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET role = 'uge', name = 'Uge', is_active = true WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE public.profiles SET role = 'iirgd_user', name = 'IIRGD user', is_active = true WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE public.profiles SET role = 'iirgd_manager', name = 'IIRGD Admin', is_active = true WHERE id = '55555555-5555-5555-5555-555555555555';

-- Seed suppliers
INSERT INTO public.suppliers (cnpj, company_name, email, responsible_name, is_simples_optant, is_active) 
VALUES 
('13848763000139', 'Sebastiana e Leonardo Eletrônica ME', 'ouvidoria@sebastianaeleonardoeletronicame.com.br', 'Sebastiana Silva', true, true), 
('28611962000104', 'Pedro Henrique e Enrico Construções ME', 'presidencia@louiseeagathabuffetltda.com.br', 'Pedro Souza', false, true),
('75145472000131', 'Edson e Lucas Telas Ltda', 'posvenda@edsonelucastelasltda.com.br', 'Edson Souza', false, true)
ON CONFLICT DO NOTHING;

