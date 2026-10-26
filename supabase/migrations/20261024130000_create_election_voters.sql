-- Migration: 20261024130000_create_election_voters.sql
-- Description:
-- 1. Create public.election_voters table.
-- 2. Add voter_id column to public.election_voter_attendance.
-- 3. Populate public.election_voters with the 200 voters from CSV.
-- 4. Enable RLS and Realtime on election_voters.
-- 5. Update generate_system_backup and restore_system_backup to version 1.6 (28 tables).

-- 1. Create election_voters table
CREATE TABLE IF NOT EXISTS public.election_voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_registration_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_election_voters_number
  ON public.election_voters(voter_registration_number);

CREATE INDEX IF NOT EXISTS idx_election_voters_name
  ON public.election_voters(name);

ALTER TABLE public.election_voters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow election authorized users to read voters" ON public.election_voters;
CREATE POLICY "Allow election authorized users to read voters"
  ON public.election_voters FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

DROP POLICY IF EXISTS "Allow election authorized users to insert voters" ON public.election_voters;
CREATE POLICY "Allow election authorized users to insert voters"
  ON public.election_voters FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

DROP POLICY IF EXISTS "Allow election authorized users to update voters" ON public.election_voters;
CREATE POLICY "Allow election authorized users to update voters"
  ON public.election_voters FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

DROP POLICY IF EXISTS "Allow election authorized users to delete voters" ON public.election_voters;
CREATE POLICY "Allow election authorized users to delete voters"
  ON public.election_voters FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager-election', 'admin-election', 'user-election')
    )
  );

GRANT ALL ON TABLE public.election_voters TO authenticated, service_role;
GRANT SELECT ON TABLE public.election_voters TO anon;

-- 2. Add voter_id column to election_voter_attendance
ALTER TABLE public.election_voter_attendance
  ADD COLUMN IF NOT EXISTS voter_id UUID REFERENCES public.election_voters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_election_voter_attendance_voter_id
  ON public.election_voter_attendance(voter_id);

-- 3. Enable Realtime on election_voters
ALTER TABLE public.election_voters REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'election_voters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.election_voters;
  END IF;
END $$;

-- 4. Populate election_voters with 200 voters
INSERT INTO public.election_voters (id, voter_registration_number, name)
VALUES
  ('e8bdca7a-7a26-4b64-b4cf-e799447e855a', '100599', 'Bruno Alves Alves'),
  ('273b2490-d331-4277-ab15-9dfb642c7108', '103402', 'Pedro Machado Nascimento'),
  ('36ef36a1-aa6a-4ab8-a56f-af50bb2efaf9', '106814', 'Patrícia Marques Freitas'),
  ('bf9b9ff9-22ea-400d-9c85-db4c64c3a41b', '107540', 'Marcos Souza Alves'),
  ('9e47c9d0-05c2-459f-b830-1a50e1876409', '112038', 'Beatriz Nunes Dias'),
  ('a6d88dac-bae7-4d93-a252-d6e3b77fd3d3', '120422', 'Gustavo Lopes Martins'),
  ('3394883f-22f7-4bc1-b081-0ea690871e81', '122056', 'Bruno Teixeira Mendes'),
  ('fb62b6c3-e196-4e9e-9120-e5d850e02dd4', '126225', 'Felipe Machado Ribeiro'),
  ('081be400-0511-4259-9236-e5997cbe2297', '127824', 'Letícia Freitas Lopes'),
  ('c43b4bb9-16ce-4c2f-b6ea-8aa053be6cde', '131244', 'Matheus Mendes Araújo'),
  ('fc8e81cf-5856-4ca7-bbbd-efeb8fb5ec1b', '132938', 'Gustavo Souza Teixeira'),
  ('df075f71-b468-4734-93d3-be5fb786abf7', '133326', 'Lucas Ferreira Lopes'),
  ('22a04747-b7f1-477e-8ceb-517c7c19a097', '133659', 'Rodrigo Marques Ramos'),
  ('44dc1808-578b-4027-ad80-22278aee63cb', '145561', 'Marcelo Carvalho Nunes'),
  ('98fffed9-620e-4503-98ab-baa4e75df9d6', '148050', 'Beatriz Costa Moreira'),
  ('7a494dd6-623d-4a1c-9901-941f640eb757', '149405', 'Lucas Moreira Soares'),
  ('0651c027-8219-4e62-b2d6-efb64e06f9fe', '158655', 'Aline Vieira Machado'),
  ('3ab00ad1-7269-4f55-9a43-2cdaa524b750', '160738', 'Carlos Araújo Ramos'),
  ('35e48cba-1569-49f5-8353-3fb344b075a7', '161733', 'Camila Martins Vieira'),
  ('fad13372-ecf1-4b9e-ad48-df890f3f0004', '166613', 'Fernanda Souza Pinto'),
  ('692604b4-b810-4b4e-a29f-3f269ce2ad00', '167136', 'Alice Teixeira Souza'),
  ('883fc4c0-a858-4f21-8cdb-6bfe7f0300f9', '169403', 'Alice Rocha Souza'),
  ('36c95190-5699-467c-8cc2-ad8516341c00', '170674', 'Beatriz Pinto Cardoso'),
  ('264f0a2a-1eea-4381-aa67-439583f5846b', '172574', 'Guilherme Santana Costa'),
  ('92534564-31bc-4fae-bc47-a937f7b6c1ef', '172933', 'Beatriz Gonçalves Ferreira'),
  ('455d56c7-2226-419c-85db-30053f966d92', '174299', 'Juliana Rodrigues Cavalcanti'),
  ('4eab9bc9-8f88-434f-bf07-8879181009d7', '174441', 'Matheus Lopes Nunes'),
  ('36897f28-9bab-4133-81a8-da71553903d7', '174870', 'Mariana Castro Lopes'),
  ('18d82f36-d172-43f4-b7a7-829af9216e9d', '182582', 'Renata Cavalcanti Oliveira'),
  ('4fb8898e-2ae0-4659-9f7c-337adc740feb', '182627', 'Luana Ferreira Marques'),
  ('718fe2d0-055f-43f3-8135-7ef79d09c484', '183667', 'Pedro Pinto Castro'),
  ('e65c2764-2b43-419b-b953-afb13405fa41', '189814', 'Vanessa Rocha Soares'),
  ('a93f8156-7f68-48cc-a6a0-bbb33075d336', '191161', 'Fernanda Rocha Lopes'),
  ('a729479b-cb62-4927-90e2-680563488b62', '195325', 'Rafael Nunes Lima'),
  ('c7ce025c-e006-43ac-854c-2e97e4e5533e', '197251', 'Pedro Barbosa Freitas'),
  ('7600ec2f-3708-49ec-ba0a-70cde0792b8b', '198246', 'Vinícius Rodrigues Silva'),
  ('a5554eb1-7feb-4dce-ba29-9751621c4f67', '201414', 'Aline Monteiro Castro'),
  ('58db6276-96a3-411f-a61c-d9451a566cf2', '205907', 'Gustavo Rodrigues Teixeira'),
  ('e69c0876-687f-478b-ace6-e8dcacc6001f', '207175', 'Fernanda Gonçalves Soares'),
  ('bded905b-ca14-4b46-8b1b-523f05586edf', '207473', 'Felipe Nascimento Rodrigues'),
  ('dd9d76bb-cb34-4b0d-b464-20ca450f6288', '211579', 'Amanda Andrade Vieira'),
  ('4c4b8e61-479f-4cea-a783-ef0bc5aa3522', '214975', 'Rodrigo Mendes Teixeira'),
  ('2149bd71-e99c-4940-a7b1-2a381d91750f', '216739', 'Helena Barbosa Monteiro'),
  ('1bce7ff6-f14b-4744-838c-6c3e020eacd3', '216970', 'Maria Santana Silva'),
  ('3bcbf624-fe34-4958-86c8-41c3660af840', '217301', 'Pedro Araújo Barbosa'),
  ('e207a870-f534-4b66-ac47-fdda145769ab', '220116', 'Pedro Alves Lima'),
  ('4a6287b8-9a69-47de-8271-cd861bc2a7e1', '226882', 'Rafael Pereira Alves'),
  ('816f1428-cf2b-48c9-bb24-d3d16404263d', '230889', 'Alice Araújo Gomes'),
  ('75088046-6758-457b-9105-87b290ad594b', '231869', 'Letícia Vieira Cavalcanti'),
  ('4adfe786-76b1-49a8-a4ce-616cf92f66aa', '234628', 'Fernanda Dias Carvalho'),
  ('d59c1599-1f0c-445e-a7bc-4a1cf67dc4e0', '238739', 'Clara Soares Gonçalves'),
  ('18469134-b691-4efa-aa63-f3beb2433d98', '245051', 'Bianca Soares Souza'),
  ('dfb9af89-5ecc-40b1-a490-6f262158f169', '246316', 'Larissa Machado Fernandes'),
  ('bbb58639-5d8e-4e83-93c2-7a8dd0e28452', '246413', 'Gabriel Silva Dias'),
  ('daf5f1d7-ca82-49d7-84b6-1a31adb770ec', '249811', 'Sofia Lima Soares'),
  ('443f4ea3-f6e9-4dad-91b7-d5556fd3a7f3', '260263', 'Rodrigo Mendes Araújo'),
  ('2e78be19-274e-4b75-afc9-03d823eee5cc', '260265', 'Helena Machado Araújo'),
  ('aafe7ca1-d601-4f11-bbe4-06f4f9899f72', '263032', 'Lucas Pereira Rodrigues'),
  ('de8c72f6-acc0-4c60-bdfd-870d8f24adb5', '265840', 'Carlos Gomes Teixeira'),
  ('cbe29793-ceab-46b9-8036-d181d60218c5', '267414', 'Gabriel Andrade Pinto'),
  ('e3066ae3-b3b6-47af-8fb6-ce82d53507ab', '267753', 'Priscila Gomes Machado'),
  ('47c0d9ab-d392-42af-93aa-598e9b4c78e7', '269396', 'Felipe Oliveira Barbosa'),
  ('067cc311-c7cd-4ff6-9fcd-13f5bb296430', '270555', 'Jéssica Oliveira Nascimento'),
  ('96185dc7-0297-4c41-be06-96fa04c8bf15', '271339', 'Fernanda Lopes Alves'),
  ('1c64dd24-f69b-47ae-8bd6-c99cf264498d', '273148', 'Diego Araújo Marques'),
  ('d350b5c8-71fa-4f37-bb47-2015d43c31cf', '279451', 'Luana Gomes Lopes'),
  ('5696a9e0-8368-4283-8a4f-3ab603f4af5f', '287330', 'Rodrigo Ribeiro Marques'),
  ('eada9dc9-caef-4125-a3b9-c27b9b0453a6', '301629', 'Ana Ribeiro Dias'),
  ('52a4f89c-61a2-458c-9c99-60ded28ddb9a', '308496', 'Daniel Lopes Fernandes'),
  ('3158f0c3-9eb2-40e0-a712-ef6c63ede197', '308573', 'Rodrigo Alves Moreira'),
  ('549b2f1c-56b7-47f0-8f3e-2ce8f838f317', '310922', 'Gabriel Cardoso Almeida'),
  ('9e7821aa-5d00-47df-aea2-54ae03071e31', '319684', 'Bruno Freitas Nascimento'),
  ('3b08eb44-8fa5-495c-93d2-6637b812fcca', '321231', 'Bruna Almeida Almeida'),
  ('4e218157-6ba9-438c-8279-ce59b35c4b22', '322086', 'Ana Martins Nunes'),
  ('a306b623-a2ee-4dee-bf3a-14daeeeb4cce', '322955', 'Natália Fernandes Rodrigues'),
  ('4fb327d4-097a-4a41-95b5-98a2e8fc5c8b', '324643', 'Sofia Fernandes Nascimento'),
  ('4159e451-3da7-41dd-bd57-707c8516c340', '325772', 'Maria Gonçalves Nunes'),
  ('69b01409-1811-4f5e-86b8-31820552b08d', '329258', 'Clara Teixeira Dias'),
  ('cf3b77d7-930e-4bb7-84c0-a3bb4eab76d9', '329974', 'Ana Pereira Soares'),
  ('944e94da-eef4-4b93-b44b-1b7c20f0575c', '330283', 'Juliana Pinto Soares'),
  ('ca6570d7-e0fa-4d4b-a61e-c397c290b5d1', '330914', 'Gabriel Alves Cavalcanti'),
  ('586fcc26-684c-49b5-bfbb-b47f8d06dc7f', '331148', 'Patrícia Nascimento Rocha'),
  ('1705e586-34cc-4fd8-b76d-c30feae740f6', '334053', 'Patrícia Cavalcanti Gonçalves'),
  ('cb7f4210-4e97-4981-b55c-ff5da6eded69', '335612', 'Mariana Moreira Castro'),
  ('12e358b3-94e5-4ddb-8394-0926e9c5254a', '338968', 'Bruno Soares Oliveira'),
  ('d81ce288-e3fc-4162-9d10-111054ef27ae', '340062', 'Helena Machado Silva'),
  ('c8dd844d-eec6-407f-8c8b-e4d0e1dd763a', '340174', 'Vanessa Teixeira Martins'),
  ('2ff75d5f-054c-4a08-b044-44eb4e53cbc1', '341292', 'Jéssica Machado Rodrigues'),
  ('6b1387d8-ec65-426d-ac8d-16de6bba1fc9', '343962', 'Pedro Dias Monteiro'),
  ('2a0e3594-f9e7-4f7e-9a6f-60a686862992', '344098', 'Vinícius Pereira Barbosa'),
  ('8e632d76-5b87-46b1-a678-051a51cc4798', '349565', 'Guilherme Barbosa Marques'),
  ('6eb0730e-35bb-48a1-96cc-d607d8fe4818', '351083', 'Vinícius Nunes Vieira'),
  ('abc0fa64-be5b-48e5-b9ad-6aad67e15881', '352572', 'Priscila Lima Martins'),
  ('e555d9f8-1805-49d8-b005-dcff1029682b', '354801', 'Daniel Moreira Ribeiro'),
  ('03846dd8-4793-4eb7-89be-86062eee800a', '356702', 'Luana Castro Barbosa'),
  ('1088c4d5-f25e-4167-9335-85d5507e1652', '356787', 'Carolina Araújo Silva'),
  ('e4928925-388a-4bd3-9746-a9141a08916f', '358607', 'Bruna Vieira Carvalho'),
  ('6b67d5e0-b5cb-42e6-86e0-779b1178353b', '359947', 'Patrícia Pinto Cavalcanti'),
  ('da7261ed-e220-4062-b3b1-d6a4e237e95c', '363626', 'Maria Rocha Freitas'),
  ('6f61cd2c-afe3-4790-a574-5706edf8b065', '375504', 'André Mendes Carvalho'),
  ('a81130b0-cbe6-4503-830f-6d1f89b37403', '376183', 'Guilherme Cardoso Costa'),
  ('ff7acd05-bece-47f6-8583-e98172d3cc47', '377370', 'Pedro Ferreira Vieira'),
  ('6a6b0d3d-9103-4690-bf6a-0343549dbd17', '377746', 'Guilherme Monteiro Dias'),
  ('496a2486-d72c-4877-a25c-4ac7febdb563', '377932', 'Larissa Lopes Barbosa'),
  ('33497b55-5caf-4a17-96a2-3298cb0d43d6', '379786', 'Thiago Martins Gomes'),
  ('5eec4d6a-c40d-44b2-897b-d2a4e91e2f62', '379946', 'Ana Oliveira Lopes'),
  ('32ae8eea-23af-4afd-bfc4-2293ad728c52', '380746', 'Marcelo Monteiro Rodrigues'),
  ('0e48f088-3a0f-4161-a895-2dbe85e9d149', '383060', 'Aline Marques Castro'),
  ('e92e8451-d20c-47a6-8d9d-ff28377b3296', '388389', 'Bruno Moreira Ramos'),
  ('c3fbb380-7954-4f5c-b448-5d334c0c4d28', '391369', 'Carolina Lopes Gomes'),
  ('c0d02239-7a23-4234-8e64-88e4ebcbe90f', '391476', 'Maria Silva Alves'),
  ('0e9471e7-dd21-475e-8701-23601c84cf17', '391704', 'Sofia Machado Almeida'),
  ('810701d5-4ba5-4bb4-9879-87b7fc94a4b2', '392004', 'Juliana Santana Freitas'),
  ('1df82a10-46a2-4628-8634-1825501a6e91', '403445', 'Beatriz Araújo Lopes'),
  ('4d66831f-b3e4-40b7-89ef-006ca31eac02', '407419', 'Mariana Freitas Lima'),
  ('7ac1b3d8-b6ba-410b-ab6c-fb380db88623', '407757', 'Aline Santana Araújo'),
  ('c50fa8a0-def0-4286-9a90-1386fae4e68e', '412942', 'Caio Rocha Mendes'),
  ('d583c7c7-d7a6-4b45-bd62-6aabde5301ef', '422451', 'Luana Gonçalves Machado'),
  ('3d150267-88f8-43b2-9fab-52d1b60b726b', '426858', 'Priscila Mendes Costa'),
  ('4aca2739-2997-4739-9d18-85523f1110a8', '429963', 'Alice Cardoso Mendes'),
  ('7c1f6646-9fa0-4ce5-be70-162b77efbf7f', '430776', 'Rafael Lopes Fernandes'),
  ('dabc1c5a-6881-4994-a7f1-16fff19b3cd9', '439902', 'Sofia Santana Ramos'),
  ('c2fa3150-ba4e-46b5-8535-984ea458cf21', '440035', 'João Lopes Fernandes'),
  ('177d77fd-fb99-47e9-9527-f349eb38ec3b', '446479', 'André Rodrigues Vieira'),
  ('e076fa7f-1644-4ce3-bcdd-b7b638c72402', '452944', 'Amanda Fernandes Dias'),
  ('dda54a93-eaf3-4e68-9681-195dc411d1f0', '454508', 'Vinícius Teixeira Ferreira'),
  ('d93ad19e-a63e-4206-9fb9-78c87c38bfc8', '456699', 'Felipe Gomes Almeida'),
  ('71d2c535-7d0f-4a18-8ae3-87c2bb46422b', '456778', 'Eduardo Gomes Carvalho'),
  ('42a66c96-fa8a-4e1c-ac4a-a24460ccdb9a', '460663', 'Matheus Marques Marques'),
  ('86d3c673-3a22-4770-a0e9-60afe66d77ea', '472528', 'Natália Teixeira Freitas'),
  ('b43b582b-9baf-4990-8da1-441773f205e4', '476417', 'Daniel Souza Carvalho'),
  ('89a7f0da-a92d-454b-a587-c804b5c788a6', '479201', 'Daniel Moreira Pinto'),
  ('95162652-eb94-40bb-8135-922ce58db9cf', '479580', 'Carlos Santos Castro'),
  ('e1f026fb-57a6-47da-b9bc-e09f4b1ae10e', '480612', 'Eduardo Cardoso Silva'),
  ('dcf11b16-238b-4489-8e08-bc3cf054cb23', '482554', 'Diego Barbosa Moreira'),
  ('932d971f-cc3b-4800-bd77-62a2804a9c76', '488162', 'Daniel Teixeira Teixeira'),
  ('9b47b7cd-abf6-420b-8235-c78d5705075f', '491559', 'Caio Almeida Ramos'),
  ('fd868b72-505a-4fe7-9f7a-5ce464ea1692', '492077', 'Thiago Fernandes Machado'),
  ('5ddf3ccc-a8d1-49dd-afd1-3f83829aa8cf', '496922', 'Bianca Santos Moreira'),
  ('7570464f-7946-4b0e-ab5a-6049dc7e2b5b', '497887', 'Natália Nunes Costa'),
  ('c1cb08c8-dba6-4ce4-b87c-425e8c3bd96b', '498382', 'Aline Lima Monteiro'),
  ('0dd826fb-771f-4039-bc44-5233975cca2f', '498591', 'Alexandre Santos Nunes'),
  ('ee0c7367-476a-4cfd-993e-f37f5a1d32d2', '500156', 'Renata Castro Santos'),
  ('3fe8ff97-b1d4-46b6-b337-c56741d99b9c', '503457', 'Larissa Machado Lima'),
  ('77f9919b-b768-4b3d-b8e0-9f4ba569c55c', '514850', 'Aline Ribeiro Souza'),
  ('e5d50b8b-b7fb-4938-aa60-7e9cbbf20283', '518373', 'Rafael Moreira Rocha'),
  ('185dd7e4-e416-4b1a-867b-6ace5cd1bb30', '518801', 'Fernanda Freitas Rocha'),
  ('ffe985f4-4782-4d23-9e00-f5f596431d54', '520651', 'Natália Moreira Fernandes'),
  ('d86da563-5c01-4948-9e47-07fdd27b46bd', '526833', 'Paulo Marques Soares'),
  ('5f5736f1-8bb4-4a89-af61-db2e0bb20fda', '539898', 'Larissa Cardoso Santos'),
  ('2a9d0395-6f8f-4d4c-8010-4e2c7341b491', '542417', 'Alice Teixeira Souza'),
  ('13b924fe-fd20-4b93-9dd3-12bda4aa2818', '542666', 'Diego Almeida Rodrigues'),
  ('fec64a9a-57c5-4548-b35b-168de9205f7d', '543143', 'Sofia Oliveira Santos'),
  ('5e0f658e-8633-49fd-83dc-8d42b619c3de', '543692', 'Amanda Martins Santos'),
  ('a3a3caf6-26f6-41cc-abe1-3bef6b6e013f', '549245', 'Luana Gomes Lopes'),
  ('d41929a3-ccde-4632-af4b-bbd2e77c9e32', '555884', 'Felipe Cardoso Pereira'),
  ('1495fd4d-19c1-4010-878e-0d6e3598b8c6', '559381', 'Renan Carvalho Freitas'),
  ('b3dcab36-5f92-4ab5-9867-d06c1c7df882', '571029', 'Carlos Soares Andrade'),
  ('f9eb7235-b7fc-4d13-bb2c-500c9e461981', '573417', 'Rodrigo Cavalcanti Cavalcanti'),
  ('92aca38b-4674-4ef0-b4ab-f62004707de8', '575435', 'Alice Pereira Costa'),
  ('790fc377-26db-43b6-8a47-c705b67837db', '575763', 'Bruna Alves Pinto'),
  ('da75de45-40b2-4274-a45e-6846fb110334', '581141', 'Ana Barbosa Castro'),
  ('e5b5b827-4c2a-4383-b14f-f57c5ed7159c', '581741', 'Clara Moreira Nunes'),
  ('b369b62b-6995-4ce7-8b36-24b43546870c', '584714', 'Helena Martins Rodrigues'),
  ('b800d1fe-b292-4ff6-94fb-3ba67a77a986', '590785', 'Renata Lopes Alves'),
  ('c5d4ae96-3bb5-42e7-b88f-068e09e67711', '595631', 'Carlos Barbosa Cavalcanti'),
  ('5347c24a-7d22-4c6e-8d6b-c26f1409b76b', '595948', 'Mariana Castro Oliveira'),
  ('0b66dbea-4bbe-44aa-ae0c-ef907ff09dfa', '598369', 'Diego Teixeira Machado'),
  ('f99c049d-9300-4869-aa61-5d730ebe1f6f', '608993', 'Pedro Andrade Rodrigues'),
  ('6e5e38c1-4f3e-4741-a5e5-07f5503909d7', '609597', 'Guilherme Dias Silva'),
  ('d5ee86df-cff9-4779-9b66-8109c8db8645', '612340', 'Daniel Ramos Alves'),
  ('c17b0d3b-5399-4fea-b40c-98aa487aab3c', '617488', 'Patrícia Andrade Freitas'),
  ('d03b8dba-a81f-441c-a2b0-86f0cf0e49f3', '623481', 'Helena Gomes Machado'),
  ('d873faae-5abd-459e-857d-f12e2b23a8f2', '624902', 'Juliana Santana Fernandes'),
  ('4b7e20e0-f1a8-4f10-8c29-4c026d1d9329', '629903', 'Luana Teixeira Cardoso'),
  ('35878bf9-16c9-4c60-b1c1-f9607e2b04ea', '632323', 'Aline Machado Pinto'),
  ('278bf766-56df-457e-84a9-c5068b83d1fd', '632342', 'Letícia Rocha Lopes'),
  ('d8c195fa-5a78-4d7d-a15f-a77fe76f0996', '634277', 'Larissa Fernandes Mendes'),
  ('6adff471-8489-46eb-a9de-f9775f2a2b1e', '639131', 'Amanda Freitas Castro'),
  ('bf71ae16-24c7-430e-b225-245637494317', '642717', 'Luana Moreira Dias'),
  ('98fe1018-d5c4-47f5-8934-c98e3252fe38', '653306', 'Ana Ramos Rocha'),
  ('d3f29e8d-5834-4fef-843f-678dcb87c7ee', '654816', 'Juliana Ramos Carvalho'),
  ('93ac75a5-97bc-4e3a-b2c7-8c1239ce93eb', '656116', 'Diego Soares Dias'),
  ('986b3d9f-be66-43df-8a33-240e859d86c6', '658582', 'Letícia Cavalcanti Fernandes'),
  ('88110d47-054f-47eb-9ec8-00e76e41b62a', '660086', 'Priscila Silva Santana'),
  ('508da15b-11d7-4782-8559-f21900d69d34', '662275', 'Bruno Ferreira Lopes'),
  ('98f6f079-947e-40e4-9a33-27dcdf7f810e', '663054', 'Marcos Marques Ramos'),
  ('f853759b-d245-4c49-9ba9-a182d4503ba9', '665158', 'Priscila Lopes Cardoso'),
  ('e6c5ef50-6960-4835-978a-67f5ace1caec', '665427', 'Maria Ramos Mendes'),
  ('55c182d4-18fd-415d-9961-304b2d7cf206', '665492', 'Ana Ferreira Vieira'),
  ('1a7d5083-454a-48ec-bd8f-afab8bec6315', '665579', 'Thiago Nunes Lopes'),
  ('1b86be16-c15d-467f-b1bb-de6dc5789679', '671412', 'Bruna Pinto Andrade'),
  ('b0e3bb19-2143-4e0b-8526-5e8a16e3aa7a', '671858', 'Marcelo Araújo Santana'),
  ('d9dd54b6-7ebe-47b8-b9c1-1d68f0b11401', '676510', 'Diego Machado Araújo'),
  ('67ea476b-2e64-4faa-8cc5-4aa481044453', '678856', 'Natália Nascimento Freitas'),
  ('4b509c36-14ff-4a9f-9f10-14c770290b85', '680099', 'Letícia Barbosa Soares'),
  ('8cf866a4-12fa-401c-8866-4a22e612dace', '680828', 'Thiago Pereira Martins'),
  ('464610ee-3608-45b8-ae6c-f607b8c6bf5b', '684004', 'Vinícius Pereira Teixeira'),
  ('753ffa28-36c9-4c51-99fb-347036efee05', '688508', 'Paulo Ribeiro Martins'),
  ('d74a7b9b-0098-4630-872b-40959587999a', '688637', 'Fernanda Cardoso Fernandes'),
  ('49082e4b-735a-49a3-866e-a5b2188511ca', '694731', 'Marcos Pinto Santana'),
  ('fd23ffb7-c0fa-4027-bf20-8847b266ece7', '694916', 'Caio Vieira Alves'),
  ('7242da87-3201-4150-9863-2f915aedd1b9', '698782', 'Bruno Vieira Almeida'),
  ('4c655eef-4e96-40be-be46-94c3cb092ad0', '704201', 'Jéssica Ribeiro Barbosa'),
  ('f56e6c01-ca90-4488-8703-c3181546b914', '705397', 'Lucas Teixeira Lima'),
  ('207fdca0-8c41-43de-a2d9-0ddb3faf4ebb', '711878', 'Letícia Oliveira Souza'),
  ('1edf005b-2632-4d4b-9f14-bc7a3e41a720', '712982', 'Priscila Vieira Lima'),
  ('00dc10d5-863b-4445-a656-d6723c704954', '716886', 'João Ramos Alves'),
  ('2a37962a-e90a-40d9-b5ad-7c25c0244f3b', '717024', 'Lucas Castro Vieira'),
  ('d937a471-9768-4493-9ad6-1571b4ccf6dd', '717889', 'Marcelo Cardoso Mendes'),
  ('483c0bab-d54d-4fd8-9155-d237c993572c', '719176', 'Natália Ribeiro Souza'),
  ('34ede7c1-1f11-4b4b-9433-cf117f989814', '724834', 'Rafael Cardoso Pereira'),
  ('5a284b04-fdb1-4a7e-a3d0-3b00a9b186b0', '725380', 'Matheus Nunes Ramos'),
  ('dcebdbad-ea74-4c64-ada7-b141e43d624f', '728038', 'Matheus Castro Souza'),
  ('c82fcb98-935a-4dd2-9f97-f581eb9cda77', '731262', 'Camila Gomes Castro'),
  ('0971e272-24a8-4903-9a4e-e2b0d34b5fca', '733052', 'Bruna Ferreira Lopes'),
  ('33487cda-cc8e-4ce3-9100-7e738da3110d', '736059', 'Mariana Araújo Marques'),
  ('df70a7a4-508c-4bf7-8a2f-cefb3ac8d475', '738551', 'Caio Cavalcanti Monteiro'),
  ('c571e7e2-b8ef-4fe6-8d5b-2601ae255b00', '738720', 'Thiago Santana Moreira'),
  ('ba8a1b1b-354f-46ad-96d2-ac5c43c4a6fb', '748564', 'André Mendes Barbosa'),
  ('a27c736b-44cb-4a33-8760-0c48f51badec', '755674', 'Renata Machado Barbosa'),
  ('03396463-6bfd-4cb9-9d01-f685baed565a', '757924', 'Renan Monteiro Souza'),
  ('015b24ac-edfb-4f5e-ad0d-3e8e86b77582', '759176', 'Luana Alves Carvalho'),
  ('093da5bd-0ab3-438e-bb7f-fe09bcc88340', '761759', 'João Carvalho Soares'),
  ('f77ccf38-3c95-46c0-af90-955e892f158d', '765822', 'Pedro Ferreira Costa'),
  ('a0e04ad8-415c-413f-bb23-f4f64a10b50a', '766563', 'Amanda Ribeiro Araújo'),
  ('3635fa32-62e3-4e94-ac4d-c5c814041015', '769987', 'Matheus Costa Silva'),
  ('9f2eed40-b853-4fa1-b20c-ddd8c7c33dae', '770487', 'Daniel Mendes Cavalcanti'),
  ('3eb0aed7-bb38-4918-9b97-10fa15c4a9c1', '771088', 'Marcelo Vieira Oliveira'),
  ('714b4abc-d284-43cd-a065-dafb6f33c7a4', '772097', 'Thiago Vieira Vieira'),
  ('cf3b381f-8a64-4ef1-9b33-a85cdb9f0b0f', '774079', 'Carlos Freitas Rodrigues'),
  ('9f383785-78d3-4b98-bdf7-0277371a0e42', '779514', 'Clara Almeida Soares'),
  ('40502b9f-fa75-47e2-a233-e3b8944aa168', '781446', 'João Pinto Martins'),
  ('97c46de9-6ca6-4bc6-8f79-3c34851beb30', '781453', 'Patrícia Pereira Teixeira'),
  ('4f96fff1-9e88-4b3b-9900-7206724df20f', '787277', 'Thiago Gomes Fernandes'),
  ('75d6eff2-98fb-476a-8d62-fb23d539937c', '791798', 'Camila Rodrigues Souza'),
  ('a856ae4c-3022-4490-bbda-538cddba6998', '793384', 'Rodrigo Barbosa Cavalcanti'),
  ('44cdccfb-4565-4b52-beb5-8e0416a166fa', '801474', 'Alice Castro Vieira'),
  ('f468737f-6f16-43ee-9f49-451b0013c94e', '802729', 'André Pereira Freitas'),
  ('9d1aa2ca-65d1-43c8-b97f-17ef278811bd', '804314', 'Carlos Barbosa Nunes'),
  ('712ac682-197a-4073-848e-cead4d50f8d2', '809570', 'Letícia Gonçalves Teixeira'),
  ('66305665-0340-49ce-b421-d4906580bb5c', '813328', 'Bianca Mendes Ferreira'),
  ('3a5de12a-5621-456a-b96e-b9c071e24de7', '813536', 'Caio Oliveira Machado'),
  ('c38558b6-8253-4b62-b33e-5b002ae7dbda', '814825', 'Alice Rocha Cavalcanti'),
  ('f6a04391-0778-46e5-8e56-0efdafeadc83', '816751', 'Rafael Santos Ferreira'),
  ('36f9bf69-0675-4f9f-a104-079ca9b1d620', '817870', 'Thiago Castro Pinto'),
  ('c99021e1-3f28-4a3c-a114-da156100992f', '821590', 'Ana Fernandes Castro'),
  ('a5e5f055-445c-4931-acb0-ced9b655e4f9', '823378', 'Gabriel Ribeiro Cardoso'),
  ('3b37192c-31df-4e01-8832-ebc49efb3dc0', '832052', 'Vanessa Mendes Fernandes'),
  ('b5658e8f-5a40-4ab9-a681-3865bcc34080', '835392', 'Juliana Pinto Machado'),
  ('d9f00b98-bbab-47c8-b37b-c8cb822436f5', '835911', 'João Ramos Ferreira'),
  ('0cdf732a-a665-4165-bb41-8b73819a5d2b', '838797', 'Marcelo Nascimento Marques'),
  ('afc24074-ede1-4efb-8b28-b250fb547985', '842225', 'Natália Rocha Alves'),
  ('e7bf3d69-9779-4d7c-a765-fb3aca532df1', '847581', 'Rodrigo Dias Marques'),
  ('19138cf1-f110-48b9-a161-ad5cf1c89c52', '850800', 'Carlos Ramos Vieira'),
  ('d3ecabc3-2b39-433f-a894-4900dc074dec', '852787', 'Pedro Nunes Araújo'),
  ('71c5cfdc-1feb-481c-a55b-2106d7d6a058', '854639', 'Gabriel Freitas Ferreira'),
  ('2275e574-94dd-43ca-ada0-6a4e9669a6fa', '855731', 'Vinícius Soares Rocha'),
  ('bf591e4c-b2d8-4fc1-a7b9-09543a9d4b45', '857168', 'Mariana Nunes Gonçalves'),
  ('f0325864-4298-4912-b496-7f911e748292', '858490', 'Lucas Teixeira Freitas'),
  ('778f3894-c8b4-4d5c-b006-1b11dc45d11c', '864544', 'Daniel Souza Martins'),
  ('b353a920-9ffe-488b-abaf-d4d51500f920', '865179', 'Vanessa Andrade Monteiro'),
  ('bbcdbad9-655a-46fe-a2de-dcf881f078a3', '865388', 'Paulo Ramos Mendes'),
  ('1da6a434-0b77-4435-842f-dc491bafc138', '867460', 'Paulo Souza Carvalho'),
  ('c560c93c-38da-413a-b735-68576aee576b', '872246', 'Letícia Araújo Lima'),
  ('b73f9f3f-481d-42da-ab3f-a137e38e4e28', '876646', 'Leonardo Mendes Ramos'),
  ('ecc09849-f258-4030-b11b-abdfa4095c65', '877572', 'Mariana Santos Cavalcanti'),
  ('082d04a8-70a1-4ae9-a938-23049f518956', '881177', 'Amanda Costa Barbosa'),
  ('cd9d7fd5-7969-418c-ab86-5f2e06cb64c0', '883300', 'Priscila Silva Araújo'),
  ('89abd37d-0a08-457a-9521-b516d9e1f2e6', '887352', 'Daniel Ferreira Almeida'),
  ('87baa15e-a2b5-487a-8f2a-44917e1ec31b', '891952', 'Mariana Freitas Pereira'),
  ('0ca48763-cd44-4321-910e-d25892b24ddd', '892495', 'Maria Gomes Ramos'),
  ('94f65f81-27d0-4a65-85ac-5eb5e980c845', '895667', 'Helena Vieira Gonçalves'),
  ('d6ac4b12-85c6-4d1f-9033-acfdd9032bbb', '897549', 'Helena Fernandes Marques'),
  ('419c4cd3-a6d5-4851-acbf-467a5b33d3fe', '898975', 'Marcelo Cardoso Lopes'),
  ('c77908fa-cfd9-4c82-b4bf-0783e39bfda9', '899550', 'Aline Araújo Gomes'),
  ('28af63ba-2fc5-4ce4-84db-9b480a79db79', '900581', 'Eduardo Martins Cavalcanti'),
  ('bdd49c87-85cf-4655-8e58-bbe4416ca84b', '903035', 'Guilherme Lima Rodrigues'),
  ('e0190ad2-f776-4cdc-931a-9fa04400d48b', '905635', 'Letícia Marques Dias'),
  ('9cfb66cc-0073-46ed-899e-9aedc8266601', '905934', 'Guilherme Fernandes Silva'),
  ('0a0f617c-a66d-4af5-8d3a-c4accdef8150', '910620', 'Leonardo Barbosa Pinto'),
  ('c8ce7fe0-b041-42b0-936f-3b6c85846b6c', '913694', 'Renata Ramos Gomes'),
  ('64f21dfa-5fed-4398-8ae8-61d36d3eb874', '916449', 'André Teixeira Cardoso'),
  ('59c091ed-142d-480b-8fb0-123a45ba7f6d', '922733', 'Diego Dias Araújo'),
  ('3d6b91af-f615-4525-86c9-e46c8da2bb82', '930555', 'Paulo Teixeira Moreira'),
  ('f02be602-de49-40f1-953e-a7841b5ace6a', '944151', 'Aline Rocha Martins'),
  ('f5b1e7b2-eb69-48ad-b647-2ac807305b1d', '944962', 'Carlos Lopes Castro'),
  ('40c45598-06b2-46b8-9084-efbe8eea35eb', '945964', 'Eduardo Almeida Marques'),
  ('92c2b59c-96dd-45d3-8f61-968652ff51b2', '946335', 'Gabriel Rocha Cardoso'),
  ('37b96ba9-ade9-4e88-af98-745bb1219ef2', '946721', 'Helena Moreira Moreira'),
  ('ab2819d1-be95-4d77-951a-2eac21aebf01', '948749', 'Pedro Gomes Ramos'),
  ('33bf5605-8ca6-4011-b322-27beb38833cc', '955662', 'Gabriel Lima Gonçalves'),
  ('ea76f298-941f-4ff2-9798-41610b3fb014', '961722', 'Renata Dias Alves'),
  ('bf2cf5fd-475d-413e-9cbe-7ab2fb845db6', '969693', 'André Alves Santana'),
  ('6bcb13bf-9a5e-4825-aa83-0c9fcbc3ca83', '972064', 'Aline Silva Gomes'),
  ('9f38fc3c-ff21-4920-b9f3-e9d71b266673', '974628', 'Daniel Gomes Rodrigues'),
  ('db9b9e96-2a05-4b49-bd56-4ae19473f932', '982554', 'Marcelo Soares Dias'),
  ('f3d3e02c-8b77-4cc3-b833-6e11c489920a', '983794', 'Luana Nunes Ferreira'),
  ('ff6c9d8c-4777-446f-9f8f-7d737b0fe505', '988662', 'Natália Teixeira Moreira'),
  ('d9773ee4-26b6-4e46-89c2-6558e2bee37a', '996865', 'Vinícius Ramos Teixeira')
ON CONFLICT (id) DO UPDATE SET
  voter_registration_number = EXCLUDED.voter_registration_number,
  name = EXCLUDED.name,
  updated_at = now();


-- 5. UPDATE GENERATE_SYSTEM_BACKUP TO v1.6
CREATE OR REPLACE FUNCTION public.generate_system_backup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_result jsonb;
  v_caller_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem gerar backups do sistema.';
  END IF;

  SELECT name INTO v_caller_name FROM public.profiles WHERE id = auth.uid();

  SELECT jsonb_build_object(
    'system', 'Demandas, IIRGD & Eleições',
    'version', '1.6',
    'timestamp', now(),
    'generated_by', jsonb_build_object(
      'id', auth.uid(),
      'name', COALESCE(v_caller_name, 'Admin')
    ),
    'summary', jsonb_build_object(
      'profiles', (SELECT count(*) FROM public.profiles),
      'suppliers', (SELECT count(*) FROM public.suppliers),
      'expense_natures', (SELECT count(*) FROM public.expense_natures),
      'product_classes', (SELECT count(*) FROM public.product_classes),
      'measurement_units', (SELECT count(*) FROM public.measurement_units),
      'measurement_unit_aliases', (SELECT count(*) FROM public.measurement_unit_aliases),
      'measurement_unit_alias_links', (SELECT count(*) FROM public.measurement_unit_alias_links),
      'products', (SELECT count(*) FROM public.products),
      'product_units', (SELECT count(*) FROM public.product_units),
      'demands', (SELECT count(*) FROM public.demands),
      'demand_products', (SELECT count(*) FROM public.demand_products),
      'demand_product_bids', (SELECT count(*) FROM public.demand_product_bids),
      'demand_responsibles', (SELECT count(*) FROM public.demand_responsibles),
      'demand_item_status_history', (SELECT count(*) FROM public.demand_item_status_history),
      'iirgd_document_types', (SELECT count(*) FROM public.iirgd_document_types),
      'iirgd_citizens', (SELECT count(*) FROM public.iirgd_citizens),
      'iirgd_demands', (SELECT count(*) FROM public.iirgd_demands),
      'iirgd_demand_status_history', (SELECT count(*) FROM public.iirgd_demand_status_history),
      'iirgd_settings', (SELECT count(*) FROM public.iirgd_settings),
      'system_settings', (SELECT count(*) FROM public.system_settings),
      'elections', (SELECT count(*) FROM public.elections),
      'candidates', (SELECT count(*) FROM public.candidates),
      'ballot_boxes', (SELECT count(*) FROM public.ballot_boxes),
      'election_committee_members', (SELECT count(*) FROM public.election_committee_members),
      'election_voters', (SELECT count(*) FROM public.election_voters),
      'election_voter_attendance', (SELECT count(*) FROM public.election_voter_attendance),
      'election_votes', (SELECT count(*) FROM public.election_votes),
      'logs', (SELECT count(*) FROM public.logs)
    ),
    'data', jsonb_build_object(
      'profiles', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.profiles t), '[]'::jsonb),
      'suppliers', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.suppliers t), '[]'::jsonb),
      'expense_natures', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.expense_natures t), '[]'::jsonb),
      'product_classes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.product_classes t), '[]'::jsonb),
      'measurement_units', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.measurement_units t), '[]'::jsonb),
      'measurement_unit_aliases', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.measurement_unit_aliases t), '[]'::jsonb),
      'measurement_unit_alias_links', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.measurement_unit_alias_links t), '[]'::jsonb),
      'products', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.products t), '[]'::jsonb),
      'product_units', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.product_units t), '[]'::jsonb),
      'demands', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demands t), '[]'::jsonb),
      'demand_products', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_products t), '[]'::jsonb),
      'demand_product_bids', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_product_bids t), '[]'::jsonb),
      'demand_responsibles', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_responsibles t), '[]'::jsonb),
      'demand_item_status_history', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.demand_item_status_history t), '[]'::jsonb),
      'iirgd_document_types', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_document_types t), '[]'::jsonb),
      'iirgd_citizens', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_citizens t), '[]'::jsonb),
      'iirgd_demands', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_demands t), '[]'::jsonb),
      'iirgd_demand_status_history', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_demand_status_history t), '[]'::jsonb),
      'iirgd_settings', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.iirgd_settings t), '[]'::jsonb),
      'system_settings', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.system_settings t), '[]'::jsonb),
      'elections', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.elections t), '[]'::jsonb),
      'candidates', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.candidates t), '[]'::jsonb),
      'ballot_boxes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.ballot_boxes t), '[]'::jsonb),
      'election_committee_members', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_committee_members t), '[]'::jsonb),
      'election_voters', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_voters t), '[]'::jsonb),
      'election_voter_attendance', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_voter_attendance t), '[]'::jsonb),
      'election_votes', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.election_votes t), '[]'::jsonb),
      'logs', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.logs t), '[]'::jsonb)
    )
  ) INTO v_result;

  INSERT INTO public.logs (user_id, action, description)
  VALUES (auth.uid(), 'GENERATE_SYSTEM_BACKUP', 'Backup completo do sistema gerado com sucesso.');

  RETURN v_result;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.generate_system_backup() TO authenticated;

-- 6. UPDATE RESTORE_SYSTEM_BACKUP TO v1.6
CREATE OR REPLACE FUNCTION public.restore_system_backup(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_data jsonb;
  v_restored_counts jsonb;
  v_count_profiles int := 0;
  v_count_suppliers int := 0;
  v_count_expense_natures int := 0;
  v_count_product_classes int := 0;
  v_count_measurement_units int := 0;
  v_count_unit_aliases int := 0;
  v_count_unit_alias_links int := 0;
  v_count_products int := 0;
  v_count_product_units int := 0;
  v_count_doc_types int := 0;
  v_count_iirgd_settings int := 0;
  v_count_system_settings int := 0;
  v_count_citizens int := 0;
  v_count_demands int := 0;
  v_count_demand_products int := 0;
  v_count_demand_bids int := 0;
  v_count_demand_responsibles int := 0;
  v_count_demand_item_history int := 0;
  v_count_iirgd_demands int := 0;
  v_count_iirgd_history int := 0;
  v_count_elections int := 0;
  v_count_candidates int := 0;
  v_count_ballot_boxes int := 0;
  v_count_committee_members int := 0;
  v_count_voters int := 0;
  v_count_voter_attendance int := 0;
  v_count_election_votes int := 0;
  v_count_logs int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem restaurar backups do sistema.';
  END IF;

  IF p_payload ? 'data' THEN
    v_data := p_payload->'data';
  ELSE
    v_data := p_payload;
  END IF;

  IF v_data IS NULL OR jsonb_typeof(v_data) != 'object' THEN
    RAISE EXCEPTION 'Payload de backup inválido: bloco de dados ausente.';
  END IF;

  ALTER TABLE public.iirgd_demands DISABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.elections DISABLE TRIGGER trg_check_election_digits_count_update;

  -- 1. PROFILES
  IF v_data ? 'profiles' AND jsonb_typeof(v_data->'profiles') = 'array' THEN
    INSERT INTO public.profiles (id, name, role, is_active, theme, avatar_url, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'role')::public.user_role, 'user'::public.user_role),
      COALESCE((elem->>'is_active')::boolean, true),
      elem->>'theme',
      elem->>'avatar_url',
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'profiles') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_active = EXCLUDED.is_active,
      theme = COALESCE(EXCLUDED.theme, profiles.theme),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_profiles = ROW_COUNT;
  END IF;

  -- 2. SUPPLIERS
  IF v_data ? 'suppliers' AND jsonb_typeof(v_data->'suppliers') = 'array' THEN
    DELETE FROM public.suppliers s
    WHERE s.cnpj IN (
      SELECT elem->>'cnpj' 
      FROM jsonb_array_elements(v_data->'suppliers') elem
      WHERE (elem->>'cnpj') IS NOT NULL AND (elem->>'cnpj') != ''
    )
    AND s.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'suppliers') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_product_bids b WHERE b.supplier_id = s.id
    );

    INSERT INTO public.suppliers (id, cnpj, company_name, responsible_name, email, cell_phone, landline, address, has_bb_account, is_simples_optant, simples_optant_verified_at, is_active, created_at, updated_at, created_by)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'cnpj',
      elem->>'company_name',
      NULLIF(TRIM(elem->>'responsible_name'), ''),
      NULLIF(TRIM(elem->>'email'), ''),
      NULLIF(TRIM(elem->>'cell_phone'), ''),
      NULLIF(TRIM(elem->>'landline'), ''),
      NULLIF(TRIM(elem->>'address'), ''),
      NULLIF(TRIM(elem->>'has_bb_account'), ''),
      COALESCE((elem->>'is_simples_optant')::boolean, false),
      (elem->>'simples_optant_verified_at')::timestamptz,
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now()),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END
    FROM jsonb_array_elements(v_data->'suppliers') elem
    WHERE (elem->>'id') IS NOT NULL AND (elem->>'cnpj') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      cnpj = EXCLUDED.cnpj,
      company_name = EXCLUDED.company_name,
      responsible_name = EXCLUDED.responsible_name,
      email = EXCLUDED.email,
      cell_phone = EXCLUDED.cell_phone,
      landline = EXCLUDED.landline,
      address = EXCLUDED.address,
      has_bb_account = EXCLUDED.has_bb_account,
      is_simples_optant = EXCLUDED.is_simples_optant,
      simples_optant_verified_at = EXCLUDED.simples_optant_verified_at,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_suppliers = ROW_COUNT;
  END IF;

  -- 3. EXPENSE_NATURES
  IF v_data ? 'expense_natures' AND jsonb_typeof(v_data->'expense_natures') = 'array' THEN
    DELETE FROM public.expense_natures en
    WHERE (
      en.id IN (
        SELECT elem->>'id' 
        FROM jsonb_array_elements(v_data->'expense_natures') elem
        WHERE (elem->>'id') IS NOT NULL
      )
      OR en.name IN (
        SELECT elem->>'name' 
        FROM jsonb_array_elements(v_data->'expense_natures') elem
        WHERE (elem->>'name') IS NOT NULL
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.products p WHERE p.expense_nature_id = en.id
    );

    INSERT INTO public.expense_natures (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      elem->>'id',
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'expense_natures') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_expense_natures = ROW_COUNT;
  END IF;

  -- 4. PRODUCT_CLASSES
  IF v_data ? 'product_classes' AND jsonb_typeof(v_data->'product_classes') = 'array' THEN
    DELETE FROM public.product_classes pc
    WHERE (
      pc.id IN (
        SELECT elem->>'id' 
        FROM jsonb_array_elements(v_data->'product_classes') elem
        WHERE (elem->>'id') IS NOT NULL
      )
      OR pc.name IN (
        SELECT elem->>'name' 
        FROM jsonb_array_elements(v_data->'product_classes') elem
        WHERE (elem->>'name') IS NOT NULL
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.products p WHERE p.product_class_id = pc.id
    );

    INSERT INTO public.product_classes (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      elem->>'id',
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_classes') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_product_classes = ROW_COUNT;
  END IF;

  -- 5. MEASUREMENT_UNITS
  IF v_data ? 'measurement_units' AND jsonb_typeof(v_data->'measurement_units') = 'array' THEN
    DELETE FROM public.measurement_units mu
    WHERE mu.name IN (
      SELECT elem->>'name' 
      FROM jsonb_array_elements(v_data->'measurement_units') elem
      WHERE (elem->>'name') IS NOT NULL
    )
    AND mu.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'measurement_units') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_products dp WHERE dp.unit_id = mu.id
    );

    INSERT INTO public.measurement_units (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_units') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_measurement_units = ROW_COUNT;
  END IF;

  -- 6. MEASUREMENT_UNIT_ALIASES
  IF v_data ? 'measurement_unit_aliases' AND jsonb_typeof(v_data->'measurement_unit_aliases') = 'array' THEN
    DELETE FROM public.measurement_unit_aliases mua
    WHERE (
      mua.code IN (
        SELECT (elem->>'code')::integer 
        FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
        WHERE (elem->>'code') IS NOT NULL
      )
      OR mua.name IN (
        SELECT elem->>'name' 
        FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
        WHERE (elem->>'name') IS NOT NULL
      )
    )
    AND mua.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_products dp WHERE dp.alias_id = mua.id
    );

    INSERT INTO public.measurement_unit_aliases (id, code, name, unit_id, is_pending, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'code')::integer,
      elem->>'name',
      CASE WHEN (elem->>'unit_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
           THEN (elem->>'unit_id')::uuid
           ELSE NULL
      END,
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_aliases') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      unit_id = EXCLUDED.unit_id,
      is_pending = EXCLUDED.is_pending;

    GET DIAGNOSTICS v_count_unit_aliases = ROW_COUNT;
  END IF;

  -- 7. IIRGD_DOCUMENT_TYPES
  IF v_data ? 'iirgd_document_types' AND jsonb_typeof(v_data->'iirgd_document_types') = 'array' THEN
    DELETE FROM public.iirgd_document_types dt
    WHERE dt.name IN (
      SELECT elem->>'name' 
      FROM jsonb_array_elements(v_data->'iirgd_document_types') elem
      WHERE (elem->>'name') IS NOT NULL
    )
    AND dt.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'iirgd_document_types') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.iirgd_demands d WHERE d.document_type_id = dt.id
    );

    INSERT INTO public.iirgd_document_types (id, name, is_active, is_pending, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'is_pending')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_document_types') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      is_pending = EXCLUDED.is_pending,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_doc_types = ROW_COUNT;
  END IF;

  -- 8. IIRGD_SETTINGS
  IF v_data ? 'iirgd_settings' AND jsonb_typeof(v_data->'iirgd_settings') = 'array' THEN
    INSERT INTO public.iirgd_settings (id, alert_days, delay_days, updated_by, singleton_key, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      COALESCE((elem->>'alert_days')::integer, (elem->>'warning_days')::integer, 10),
      COALESCE((elem->>'delay_days')::integer, (elem->>'deadline_days')::integer, 5),
      CASE WHEN (elem->>'updated_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'updated_by')::uuid)
           THEN (elem->>'updated_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'singleton_key')::boolean, true),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_settings') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (singleton_key) DO UPDATE SET
      alert_days = EXCLUDED.alert_days,
      delay_days = EXCLUDED.delay_days,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_iirgd_settings = ROW_COUNT;
  END IF;

  -- 9. SYSTEM_SETTINGS
  IF v_data ? 'system_settings' AND jsonb_typeof(v_data->'system_settings') = 'array' THEN
    INSERT INTO public.system_settings (key, value, description, updated_by, updated_at)
    SELECT 
      elem->>'key',
      elem->>'value',
      elem->>'description',
      CASE WHEN (elem->>'updated_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'updated_by')::uuid)
           THEN (elem->>'updated_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'system_settings') elem
    WHERE (elem->>'key') IS NOT NULL
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      description = EXCLUDED.description,
      updated_by = EXCLUDED.updated_by,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_system_settings = ROW_COUNT;
  END IF;

  -- 10. PRODUCTS
  IF v_data ? 'products' AND jsonb_typeof(v_data->'products') = 'array' THEN
    DELETE FROM public.products p
    WHERE (
      (p.cat_mat IS NOT NULL AND p.cat_mat IN (
        SELECT COALESCE((elem->>'cat_mat')::bigint, (elem->>'catmat')::bigint)
        FROM jsonb_array_elements(v_data->'products') elem 
        WHERE (elem->>'cat_mat') IS NOT NULL OR (elem->>'catmat') IS NOT NULL
      ))
      OR (p.cat_bec IS NOT NULL AND p.cat_bec IN (
        SELECT COALESCE((elem->>'cat_bec')::bigint, (elem->>'catbec')::bigint)
        FROM jsonb_array_elements(v_data->'products') elem 
        WHERE (elem->>'cat_bec') IS NOT NULL OR (elem->>'catbec') IS NOT NULL
      ))
    )
    AND p.id NOT IN (
      SELECT (elem->>'id')::uuid 
      FROM jsonb_array_elements(v_data->'products') elem 
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_products dp WHERE dp.product_id = p.id
    );

    INSERT INTO public.products (id, name, cat_mat, cat_bec, expense_nature_id, product_class_id, is_active, created_by, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'cat_mat')::bigint, (elem->>'catmat')::bigint),
      COALESCE((elem->>'cat_bec')::bigint, (elem->>'catbec')::bigint),
      elem->>'expense_nature_id',
      elem->>'product_class_id',
      COALESCE((elem->>'is_active')::boolean, true),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'products') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (
        (elem->>'expense_nature_id') IS NULL 
        OR EXISTS (SELECT 1 FROM public.expense_natures WHERE id = elem->>'expense_nature_id')
      )
      AND (
        (elem->>'product_class_id') IS NULL 
        OR EXISTS (SELECT 1 FROM public.product_classes WHERE id = elem->>'product_class_id')
      )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      cat_mat = EXCLUDED.cat_mat,
      cat_bec = EXCLUDED.cat_bec,
      expense_nature_id = EXCLUDED.expense_nature_id,
      product_class_id = EXCLUDED.product_class_id,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_products = ROW_COUNT;
  END IF;

  -- 11. IIRGD_CITIZENS
  IF v_data ? 'iirgd_citizens' AND jsonb_typeof(v_data->'iirgd_citizens') = 'array' THEN
    INSERT INTO public.iirgd_citizens (id, name, rg, cpf, other_document, created_by, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      UPPER(TRIM(elem->>'name')),
      NULLIF(TRIM(elem->>'rg'), ''),
      NULLIF(TRIM(elem->>'cpf'), ''),
      NULLIF(TRIM(elem->>'other_document'), ''),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_citizens') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (
        NULLIF(TRIM(elem->>'rg'), '') IS NOT NULL 
        OR NULLIF(TRIM(elem->>'cpf'), '') IS NOT NULL 
        OR NULLIF(TRIM(elem->>'other_document'), '') IS NOT NULL
      )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      rg = EXCLUDED.rg,
      cpf = EXCLUDED.cpf,
      other_document = EXCLUDED.other_document,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_citizens = ROW_COUNT;
  END IF;

  -- 12. DEMANDS
  IF v_data ? 'demands' AND jsonb_typeof(v_data->'demands') = 'array' THEN
    DELETE FROM public.demands d
    WHERE d.internal_process_number IN (
      SELECT elem->>'internal_process_number'
      FROM jsonb_array_elements(v_data->'demands') elem
      WHERE (elem->>'internal_process_number') IS NOT NULL AND (elem->>'internal_process_number') != ''
    )
    AND d.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'demands') elem
      WHERE (elem->>'id') IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_products dp WHERE dp.demand_id = d.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.demand_responsibles dr WHERE dr.demand_id = d.id
    );

    INSERT INTO public.demands (
      id, name, type, status, user_id,
      internal_process_number, process_number, id_pca,
      bidding_notice_number, dispute_number, contract_number,
      dispute_date, offer_opening_date, siafem_number,
      is_return_requested, deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      COALESCE((elem->>'type')::public.demand_type, 'consumption'::public.demand_type),
      COALESCE((elem->>'status')::public.demand_status, 'planning'::public.demand_status),
      CASE WHEN (elem->>'user_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
           THEN (elem->>'user_id')::uuid
           WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      elem->>'internal_process_number',
      elem->>'process_number',
      COALESCE(elem->>'id_pca', elem->>'pca_number'),
      elem->>'bidding_notice_number',
      elem->>'dispute_number',
      elem->>'contract_number',
      (elem->>'dispute_date')::timestamptz,
      (elem->>'offer_opening_date')::timestamptz,
      elem->>'siafem_number',
      COALESCE((elem->>'is_return_requested')::boolean, false),
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demands') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      status = EXCLUDED.status,
      user_id = EXCLUDED.user_id,
      internal_process_number = EXCLUDED.internal_process_number,
      process_number = EXCLUDED.process_number,
      id_pca = EXCLUDED.id_pca,
      bidding_notice_number = EXCLUDED.bidding_notice_number,
      dispute_number = EXCLUDED.dispute_number,
      contract_number = EXCLUDED.contract_number,
      dispute_date = EXCLUDED.dispute_date,
      offer_opening_date = EXCLUDED.offer_opening_date,
      siafem_number = EXCLUDED.siafem_number,
      is_return_requested = EXCLUDED.is_return_requested,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demands = ROW_COUNT;
  END IF;

  -- 13. ELECTIONS
  IF v_data ? 'elections' AND jsonb_typeof(v_data->'elections') = 'array' THEN
    INSERT INTO public.elections (
      id, name, election_date, digits_count, is_uppercase, status, voting_mode,
      description, created_by, deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      elem->>'name',
      (elem->>'election_date')::timestamptz,
      COALESCE((elem->>'digits_count')::integer, 2),
      COALESCE((elem->>'is_uppercase')::boolean, false),
      (elem->>'status')::public.election_status,
      COALESCE((elem->>'voting_mode')::public.election_voting_mode, 'simple'::public.election_voting_mode),
      elem->>'description',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'elections') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      election_date = EXCLUDED.election_date,
      digits_count = EXCLUDED.digits_count,
      is_uppercase = EXCLUDED.is_uppercase,
      status = EXCLUDED.status,
      voting_mode = EXCLUDED.voting_mode,
      description = EXCLUDED.description,
      created_by = EXCLUDED.created_by,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_elections = ROW_COUNT;
  END IF;

  -- 14. MEASUREMENT_UNIT_ALIAS_LINKS
  IF v_data ? 'measurement_unit_alias_links' AND jsonb_typeof(v_data->'measurement_unit_alias_links') = 'array' THEN
    INSERT INTO public.measurement_unit_alias_links (id, unit_id, alias_id, created_at)
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'unit_id')::uuid,
      (elem->>'alias_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'measurement_unit_alias_links') elem
    WHERE (elem->>'unit_id') IS NOT NULL
      AND (elem->>'alias_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_unit_aliases WHERE id = (elem->>'alias_id')::uuid)
    ON CONFLICT (unit_id, alias_id) DO NOTHING;

    GET DIAGNOSTICS v_count_unit_alias_links = ROW_COUNT;
  END IF;

  INSERT INTO public.measurement_unit_alias_links (unit_id, alias_id)
  SELECT mu.id, mua.id
  FROM public.measurement_units mu
  CROSS JOIN public.measurement_unit_aliases mua
  WHERE LOWER(mu.name) = 'unidade' AND mua.code = 1
  ON CONFLICT (unit_id, alias_id) DO NOTHING;

  -- 15. PRODUCT_UNITS
  IF v_data ? 'product_units' AND jsonb_typeof(v_data->'product_units') = 'array' THEN
    DELETE FROM public.product_units pu
    WHERE (pu.product_id, pu.unit_id) IN (
      SELECT (elem->>'product_id')::uuid, (elem->>'unit_id')::uuid
      FROM jsonb_array_elements(v_data->'product_units') elem
      WHERE (elem->>'product_id') IS NOT NULL AND (elem->>'unit_id') IS NOT NULL
    )
    AND pu.id NOT IN (
      SELECT (elem->>'id')::uuid
      FROM jsonb_array_elements(v_data->'product_units') elem
      WHERE (elem->>'id') IS NOT NULL
    );

    INSERT INTO public.product_units (id, product_id, unit_id, created_at)
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'product_id')::uuid,
      (elem->>'unit_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'product_units') elem
    WHERE (elem->>'product_id') IS NOT NULL
      AND (elem->>'unit_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      unit_id = EXCLUDED.unit_id;

    GET DIAGNOSTICS v_count_product_units = ROW_COUNT;
  END IF;

  -- 16. DEMAND_RESPONSIBLES
  IF v_data ? 'demand_responsibles' AND jsonb_typeof(v_data->'demand_responsibles') = 'array' THEN
    INSERT INTO public.demand_responsibles (demand_id, user_id, created_at)
    SELECT 
      (elem->>'demand_id')::uuid,
      (elem->>'user_id')::uuid,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_responsibles') elem
    WHERE (elem->>'demand_id') IS NOT NULL
      AND (elem->>'user_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
    ON CONFLICT (demand_id, user_id) DO NOTHING;

    GET DIAGNOSTICS v_count_demand_responsibles = ROW_COUNT;
  END IF;

  -- 17. DEMAND_PRODUCTS
  IF v_data ? 'demand_products' AND jsonb_typeof(v_data->'demand_products') = 'array' THEN
    INSERT INTO public.demand_products (
      id, demand_id, product_id, quantity, created_by, unit_id,
      alias_id, alias_name_snapshot, alias_code_snapshot,
      product_name_snapshot, unit_name_snapshot, reference_price,
      bid_interval, bid_interval_type, expense_nature_name_snapshot,
      sort_order, execution_status, execution_error_details, execution_status_updated_at,
      commitment_number, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'product_id')::uuid,
      COALESCE((elem->>'quantity')::numeric, 0),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'unit_id')::uuid,
      CASE WHEN (elem->>'alias_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.measurement_unit_aliases WHERE id = (elem->>'alias_id')::uuid)
           THEN (elem->>'alias_id')::uuid
           ELSE NULL
      END,
      elem->>'alias_name_snapshot',
      (elem->>'alias_code_snapshot')::integer,
      elem->>'product_name_snapshot',
      elem->>'unit_name_snapshot',
      (elem->>'reference_price')::numeric,
      (elem->>'bid_interval')::numeric,
      elem->>'bid_interval_type',
      elem->>'expense_nature_name_snapshot',
      COALESCE((elem->>'sort_order')::integer, 0),
      (elem->>'execution_status')::public.demand_item_execution_status,
      elem->>'execution_error_details',
      (elem->>'execution_status_updated_at')::timestamptz,
      elem->>'commitment_number',
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_products') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'demand_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demands WHERE id = (elem->>'demand_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.products WHERE id = (elem->>'product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.measurement_units WHERE id = (elem->>'unit_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      unit_id = EXCLUDED.unit_id,
      alias_id = EXCLUDED.alias_id,
      alias_name_snapshot = EXCLUDED.alias_name_snapshot,
      alias_code_snapshot = EXCLUDED.alias_code_snapshot,
      product_name_snapshot = EXCLUDED.product_name_snapshot,
      unit_name_snapshot = EXCLUDED.unit_name_snapshot,
      reference_price = EXCLUDED.reference_price,
      bid_interval = EXCLUDED.bid_interval,
      bid_interval_type = EXCLUDED.bid_interval_type,
      expense_nature_name_snapshot = EXCLUDED.expense_nature_name_snapshot,
      sort_order = EXCLUDED.sort_order,
      execution_status = EXCLUDED.execution_status,
      execution_error_details = EXCLUDED.execution_error_details,
      execution_status_updated_at = EXCLUDED.execution_status_updated_at,
      commitment_number = EXCLUDED.commitment_number,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_demand_products = ROW_COUNT;
  END IF;

  -- 18. IIRGD_DEMANDS
  IF v_data ? 'iirgd_demands' AND jsonb_typeof(v_data->'iirgd_demands') = 'array' THEN
    INSERT INTO public.iirgd_demands (id, station_code, observation, status, created_by, citizen_id, document_type_id, created_at, updated_at)
    SELECT 
      (elem->>'id')::uuid,
      elem->>'station_code',
      elem->>'observation',
      (elem->>'status')::public.iirgd_demand_status,
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'citizen_id')::uuid,
      COALESCE(
        (SELECT id FROM public.iirgd_document_types WHERE id = (elem->>'document_type_id')::uuid),
        (SELECT dt.id FROM public.iirgd_document_types dt 
         WHERE dt.name = (
           SELECT bdt->>'name' 
           FROM jsonb_array_elements(v_data->'iirgd_document_types') bdt 
           WHERE (bdt->>'id')::uuid = (elem->>'document_type_id')::uuid
         )
         LIMIT 1
        ),
        NULL
      ),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_demands') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.iirgd_citizens WHERE id = (elem->>'citizen_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      station_code = EXCLUDED.station_code,
      observation = EXCLUDED.observation,
      status = EXCLUDED.status,
      document_type_id = EXCLUDED.document_type_id,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_iirgd_demands = ROW_COUNT;
  END IF;

  -- 19. CANDIDATES
  IF v_data ? 'candidates' AND jsonb_typeof(v_data->'candidates') = 'array' THEN
    INSERT INTO public.candidates (
      id, election_id, name, candidate_number, photo_url,
      deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'candidate_number',
      elem->>'photo_url',
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'candidates') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'election_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      candidate_number = EXCLUDED.candidate_number,
      photo_url = EXCLUDED.photo_url,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_candidates = ROW_COUNT;
  END IF;

  -- 20. BALLOT_BOXES
  IF v_data ? 'ballot_boxes' AND jsonb_typeof(v_data->'ballot_boxes') = 'array' THEN
    INSERT INTO public.ballot_boxes (
      id, election_id, name, device_info,
      is_active, created_by, deleted_at, created_at, updated_at
    )
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'election_id')::uuid,
      elem->>'name',
      elem->>'device_info',
      COALESCE((elem->>'is_active')::boolean, false),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      (elem->>'deleted_at')::timestamptz,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'ballot_boxes') elem
    WHERE (elem->>'id') IS NOT NULL
      AND (elem->>'election_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      device_info = EXCLUDED.device_info,
      is_active = EXCLUDED.is_active,
      created_by = EXCLUDED.created_by,
      deleted_at = EXCLUDED.deleted_at,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_ballot_boxes = ROW_COUNT;
  END IF;

  -- 21. ELECTION_COMMITTEE_MEMBERS
  IF v_data ? 'election_committee_members' AND jsonb_typeof(v_data->'election_committee_members') = 'array' THEN
    INSERT INTO public.election_committee_members (
      id, election_id, name, role_name, sort_order,
      created_by, created_at, updated_at
    )
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'election_id')::uuid,
      TRIM(elem->>'name'),
      TRIM(elem->>'role_name'),
      COALESCE((elem->>'sort_order')::integer, 0),
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_committee_members') elem
    WHERE (elem->>'election_id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'name'), '') IS NOT NULL
      AND NULLIF(TRIM(elem->>'role_name'), '') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      election_id = EXCLUDED.election_id,
      name = EXCLUDED.name,
      role_name = EXCLUDED.role_name,
      sort_order = EXCLUDED.sort_order,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_committee_members = ROW_COUNT;
  END IF;

  -- 22. ELECTION_VOTERS
  IF v_data ? 'election_voters' AND jsonb_typeof(v_data->'election_voters') = 'array' THEN
    INSERT INTO public.election_voters (
      id, voter_registration_number, name, is_active, created_at, updated_at
    )
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      TRIM(elem->>'voter_registration_number'),
      TRIM(elem->>'name'),
      COALESCE((elem->>'is_active')::boolean, true),
      COALESCE((elem->>'created_at')::timestamptz, now()),
      COALESCE((elem->>'updated_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voters') elem
    WHERE (elem->>'id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'voter_registration_number'), '') IS NOT NULL
      AND NULLIF(TRIM(elem->>'name'), '') IS NOT NULL
    ON CONFLICT (id) DO UPDATE SET
      voter_registration_number = EXCLUDED.voter_registration_number,
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;

    GET DIAGNOSTICS v_count_voters = ROW_COUNT;
  END IF;

  -- 23. ELECTION_VOTER_ATTENDANCE
  IF v_data ? 'election_voter_attendance' AND jsonb_typeof(v_data->'election_voter_attendance') = 'array' THEN
    INSERT INTO public.election_voter_attendance (
      id, election_id, ballot_box_id, voter_id, voter_registration_number,
      released_by, voted_at, created_at
    )
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'election_id')::uuid,
      CASE WHEN (elem->>'ballot_box_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.ballot_boxes WHERE id = (elem->>'ballot_box_id')::uuid)
           THEN (elem->>'ballot_box_id')::uuid
           ELSE NULL
      END,
      CASE WHEN (elem->>'voter_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.election_voters WHERE id = (elem->>'voter_id')::uuid)
           THEN (elem->>'voter_id')::uuid
           ELSE (SELECT id FROM public.election_voters WHERE voter_registration_number = TRIM(elem->>'voter_registration_number') LIMIT 1)
      END,
      TRIM(elem->>'voter_registration_number'),
      CASE WHEN (elem->>'released_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'released_by')::uuid)
           THEN (elem->>'released_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'voted_at')::timestamptz, now()),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_voter_attendance') elem
    WHERE (elem->>'election_id') IS NOT NULL
      AND NULLIF(TRIM(elem->>'voter_registration_number'), '') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (election_id, voter_registration_number) DO UPDATE SET
      ballot_box_id = EXCLUDED.ballot_box_id,
      voter_id = EXCLUDED.voter_id,
      released_by = EXCLUDED.released_by,
      voted_at = EXCLUDED.voted_at;

    GET DIAGNOSTICS v_count_voter_attendance = ROW_COUNT;
  END IF;

  -- 24. ELECTION_VOTES
  IF v_data ? 'election_votes' AND jsonb_typeof(v_data->'election_votes') = 'array' THEN
    INSERT INTO public.election_votes (
      id, election_id, ballot_box_id, candidate_id,
      candidate_number, is_blank, is_null, created_at
    )
    SELECT 
      COALESCE((elem->>'id')::uuid, gen_random_uuid()),
      (elem->>'election_id')::uuid,
      CASE WHEN (elem->>'ballot_box_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.ballot_boxes WHERE id = (elem->>'ballot_box_id')::uuid)
           THEN (elem->>'ballot_box_id')::uuid
           ELSE NULL
      END,
      CASE WHEN (elem->>'candidate_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.candidates WHERE id = (elem->>'candidate_id')::uuid)
           THEN (elem->>'candidate_id')::uuid
           ELSE NULL
      END,
      elem->>'candidate_number',
      COALESCE((elem->>'is_blank')::boolean, false),
      COALESCE((elem->>'is_null')::boolean, false),
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'election_votes') elem
    WHERE (elem->>'election_id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.elections WHERE id = (elem->>'election_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      ballot_box_id = EXCLUDED.ballot_box_id,
      candidate_id = EXCLUDED.candidate_id,
      candidate_number = EXCLUDED.candidate_number,
      is_blank = EXCLUDED.is_blank,
      is_null = EXCLUDED.is_null;

    GET DIAGNOSTICS v_count_election_votes = ROW_COUNT;
  END IF;

  -- 25. DEMAND_PRODUCT_BIDS
  IF v_data ? 'demand_product_bids' AND jsonb_typeof(v_data->'demand_product_bids') = 'array' THEN
    INSERT INTO public.demand_product_bids (id, demand_product_id, supplier_id, amount, status, disqualification_reason, created_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_product_id')::uuid,
      (elem->>'supplier_id')::uuid,
      COALESCE((elem->>'amount')::numeric, 0),
      COALESCE((elem->>'status')::public.bid_status, 'classified'::public.bid_status),
      elem->>'disqualification_reason',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_product_bids') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demand_products WHERE id = (elem->>'demand_product_id')::uuid)
      AND EXISTS (SELECT 1 FROM public.suppliers WHERE id = (elem->>'supplier_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      supplier_id = EXCLUDED.supplier_id,
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      disqualification_reason = EXCLUDED.disqualification_reason;

    GET DIAGNOSTICS v_count_demand_bids = ROW_COUNT;
  END IF;

  -- 26. DEMAND_ITEM_STATUS_HISTORY
  IF v_data ? 'demand_item_status_history' AND jsonb_typeof(v_data->'demand_item_status_history') = 'array' THEN
    INSERT INTO public.demand_item_status_history (id, demand_product_id, status, observation, error_details, commitment_number, created_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_product_id')::uuid,
      (elem->>'status')::public.demand_item_execution_status,
      elem->>'observation',
      elem->>'error_details',
      elem->>'commitment_number',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'demand_item_status_history') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.demand_products WHERE id = (elem->>'demand_product_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      observation = EXCLUDED.observation,
      error_details = EXCLUDED.error_details,
      commitment_number = EXCLUDED.commitment_number;

    GET DIAGNOSTICS v_count_demand_item_history = ROW_COUNT;
  END IF;

  -- 27. IIRGD_DEMAND_STATUS_HISTORY
  IF v_data ? 'iirgd_demand_status_history' AND jsonb_typeof(v_data->'iirgd_demand_status_history') = 'array' THEN
    INSERT INTO public.iirgd_demand_status_history (id, demand_id, status, observation, created_by, created_at)
    SELECT 
      (elem->>'id')::uuid,
      (elem->>'demand_id')::uuid,
      (elem->>'status')::public.iirgd_demand_status,
      elem->>'observation',
      CASE WHEN (elem->>'created_by') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'created_by')::uuid)
           THEN (elem->>'created_by')::uuid
           ELSE auth.uid()
      END,
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'iirgd_demand_status_history') elem
    WHERE (elem->>'id') IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.iirgd_demands WHERE id = (elem->>'demand_id')::uuid)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      observation = EXCLUDED.observation;

    GET DIAGNOSTICS v_count_iirgd_history = ROW_COUNT;
  END IF;

  -- 28. LOGS
  IF v_data ? 'logs' AND jsonb_typeof(v_data->'logs') = 'array' THEN
    INSERT INTO public.logs (id, user_id, action, description, created_at)
    SELECT 
      (elem->>'id')::uuid,
      CASE WHEN (elem->>'user_id') IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = (elem->>'user_id')::uuid)
           THEN (elem->>'user_id')::uuid
           ELSE auth.uid()
      END,
      elem->>'action',
      elem->>'description',
      COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(v_data->'logs') elem
    WHERE (elem->>'id') IS NOT NULL
    ON CONFLICT (id) DO NOTHING;

    GET DIAGNOSTICS v_count_logs = ROW_COUNT;
  END IF;

  ALTER TABLE public.iirgd_demands ENABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.elections ENABLE TRIGGER trg_check_election_digits_count_update;

  INSERT INTO public.logs (user_id, action, description)
  VALUES (auth.uid(), 'RESTORE_SYSTEM_BACKUP', 'Restauração de backup concluída com sucesso.');

  SELECT jsonb_build_object(
    'success', true,
    'restored_at', now(),
    'counts', jsonb_build_object(
      'profiles', v_count_profiles,
      'suppliers', v_count_suppliers,
      'expense_natures', v_count_expense_natures,
      'product_classes', v_count_product_classes,
      'measurement_units', v_count_measurement_units,
      'measurement_unit_aliases', v_count_unit_aliases,
      'measurement_unit_alias_links', v_count_unit_alias_links,
      'products', v_count_products,
      'product_units', v_count_product_units,
      'iirgd_document_types', v_count_doc_types,
      'iirgd_settings', v_count_iirgd_settings,
      'system_settings', v_count_system_settings,
      'iirgd_citizens', v_count_citizens,
      'demands', v_count_demands,
      'demand_products', v_count_demand_products,
      'demand_product_bids', v_count_demand_bids,
      'demand_responsibles', v_count_demand_responsibles,
      'demand_item_status_history', v_count_demand_item_history,
      'iirgd_demands', v_count_iirgd_demands,
      'iirgd_demand_status_history', v_count_iirgd_history,
      'elections', v_count_elections,
      'candidates', v_count_candidates,
      'ballot_boxes', v_count_ballot_boxes,
      'election_committee_members', v_count_committee_members,
      'election_voters', v_count_voters,
      'election_voter_attendance', v_count_voter_attendance,
      'election_votes', v_count_election_votes,
      'logs', v_count_logs
    )
  ) INTO v_restored_counts;

  RETURN v_restored_counts;

EXCEPTION WHEN OTHERS THEN
  ALTER TABLE public.iirgd_demands ENABLE TRIGGER trigger_iirgd_demand_status_change;
  ALTER TABLE public.elections ENABLE TRIGGER trg_check_election_digits_count_update;
  RAISE;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.restore_system_backup(jsonb) TO authenticated;
