-- Seed auth users
INSERT INTO auth.users 
(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) 
VALUES (
'465079c2-747f-4020-ac90-10f4584c9d6f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'admin@admin.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''), 

('670684ef-59cd-4dbf-832a-e9d3d4b6e9f3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'user@user.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('5e8d25a0-b7ef-4f48-806f-4e53f5939b46', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'uge@uge.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('1b9c7265-dd98-406d-a397-b699253d2acc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'user@rg.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '') ,

('314eb1aa-8574-4a7f-bd02-fdfe8cd1d8a7', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'admin@rg.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('05e0416c-c91f-48b6-8cc3-3bf89b80200a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'user@election.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('8b57e3ad-0fde-45a8-ae1a-1bd9c0be5ef4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'manager@election.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', ''),

('46a51eef-4de7-4a10-a1c4-e481f9cb3945', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 
'admin@election.com', crypt('123456', gen_salt('bf')), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '', '', '') 

ON CONFLICT (id) DO NOTHING;

-- Insert identities
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) 
VALUES 
(gen_random_uuid(), '465079c2-747f-4020-ac90-10f4584c9d6f', '465079c2-747f-4020-ac90-10f4584c9d6f', format('{"sub":"%s","email":"%s"}', '465079c2-747f-4020-ac90-10f4584c9d6f', 'admin@admin.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '670684ef-59cd-4dbf-832a-e9d3d4b6e9f3', '670684ef-59cd-4dbf-832a-e9d3d4b6e9f3', format('{"sub":"%s","email":"%s"}', '670684ef-59cd-4dbf-832a-e9d3d4b6e9f3', 'user@user.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '5e8d25a0-b7ef-4f48-806f-4e53f5939b46', '5e8d25a0-b7ef-4f48-806f-4e53f5939b46', format('{"sub":"%s","email":"%s"}', '5e8d25a0-b7ef-4f48-806f-4e53f5939b46', 'uge@uge.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '1b9c7265-dd98-406d-a397-b699253d2acc', '1b9c7265-dd98-406d-a397-b699253d2acc', format('{"sub":"%s","email":"%s"}', '1b9c7265-dd98-406d-a397-b699253d2acc', 'user@rg.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '314eb1aa-8574-4a7f-bd02-fdfe8cd1d8a7', '314eb1aa-8574-4a7f-bd02-fdfe8cd1d8a7', format('{"sub":"%s","email":"%s"}', '314eb1aa-8574-4a7f-bd02-fdfe8cd1d8a7', 'admin@rg.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '05e0416c-c91f-48b6-8cc3-3bf89b80200a', '05e0416c-c91f-48b6-8cc3-3bf89b80200a', format('{"sub":"%s","email":"%s"}', '05e0416c-c91f-48b6-8cc3-3bf89b80200a', 'user@election.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '8b57e3ad-0fde-45a8-ae1a-1bd9c0be5ef4', '8b57e3ad-0fde-45a8-ae1a-1bd9c0be5ef4', format('{"sub":"%s","email":"%s"}', '8b57e3ad-0fde-45a8-ae1a-1bd9c0be5ef4', 'manager@election.com')::jsonb, 'email', NOW(), NOW(), NOW()),
(gen_random_uuid(), '46a51eef-4de7-4a10-a1c4-e481f9cb3945', '46a51eef-4de7-4a10-a1c4-e481f9cb3945', format('{"sub":"%s","email":"%s"}', '46a51eef-4de7-4a10-a1c4-e481f9cb3945', 'admin@election.com')::jsonb, 'email', NOW(), NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Update created profiles
UPDATE public.profiles SET role = 'admin', name = 'Admin', is_active = true WHERE id = '465079c2-747f-4020-ac90-10f4584c9d6f';
UPDATE public.profiles SET role = 'user', name = 'User', is_active = true WHERE id = '670684ef-59cd-4dbf-832a-e9d3d4b6e9f3';
UPDATE public.profiles SET role = 'uge', name = 'Uge', is_active = true WHERE id = '5e8d25a0-b7ef-4f48-806f-4e53f5939b46';
UPDATE public.profiles SET role = 'iirgd_user', name = 'IIRGD user', is_active = true WHERE id = '1b9c7265-dd98-406d-a397-b699253d2acc';
UPDATE public.profiles SET role = 'iirgd_manager', name = 'IIRGD Admin', is_active = true WHERE id = '314eb1aa-8574-4a7f-bd02-fdfe8cd1d8a7';
UPDATE public.profiles SET role = 'user-election', name = 'Election User', is_active = true WHERE id = '05e0416c-c91f-48b6-8cc3-3bf89b80200a';
UPDATE public.profiles SET role = 'manager-election', name = 'Election Manager', is_active = true WHERE id = '8b57e3ad-0fde-45a8-ae1a-1bd9c0be5ef4';
UPDATE public.profiles SET role = 'admin-election', name = 'Election Admin', is_active = true WHERE id = '46a51eef-4de7-4a10-a1c4-e481f9cb3945';

insert into
  "public"."measurement_units" (
    "id",
    "name",
    "is_active",
    "created_at",
    "updated_at",
    "is_pending"
  )
values
  (
    '538d5e23-244b-42a9-b1f2-beb160d96375',
    'Unidade',
    true,
    '2026-09-28 18:00:02.703051+00',
    '2026-09-28 18:00:02.703051+00',
    false
  )
ON CONFLICT (name) DO UPDATE SET is_active = true;