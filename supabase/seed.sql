-- Seed auth users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@admin.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''), ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user@user.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '') ON CONFLICT (id) DO NOTHING;

-- Insert identities
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'admin@admin.com')::jsonb, 'email', NOW(), NOW(), NOW()), (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222222', 'user@user.com')::jsonb, 'email', NOW(), NOW(), NOW()) ON CONFLICT DO NOTHING;

-- Update created profiles
UPDATE public.profiles SET role = 'admin', name = 'Administrador Teste', is_active = true WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET role = 'user', name = 'Usuário Comum Teste', is_active = true WHERE id = '22222222-2222-2222-2222-222222222222';

-- Seed suppliers
INSERT INTO public.suppliers (cnpj, company_name, email, responsible_name, is_simples_optant, is_active) VALUES ('12345678000199', 'Fornecedor Master Ltda', 'contato@master.com', 'Jo�o Silva', true, true), ('98765432000111', 'Distribuidora Global', 'vendas@global.com', 'Maria Souza', false, true) ON CONFLICT DO NOTHING;

