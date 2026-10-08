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
  ),
  (
    '69a68ca0-c516-44ba-8c78-b20bc1ad94e9',
    'Caixa 100 Unidade',
    true,
    '2026-09-28 18:22:01.244737+00',
    '2026-09-28 18:22:35.708549+00',
    false
  ),
  (
    '6e8ea923-1a15-44d5-91d1-1f7c054426ed',
    'Pacote 100 unidades',
    true,
    '2026-09-28 19:46:59.610895+00',
    '2026-09-28 19:46:59.610895+00',
    false
  );

insert into
  "public"."products" (
    "id",
    "name",
    "is_active",
    "created_at",
    "updated_at",
    "created_by",
    "expense_nature_id"
  )
values
  (
    '02cab3f7-f829-4e17-8d08-f7278dceab21',
    'Saco Plástico 60 x 90',
    true,
    '2026-09-28 18:18:26.032352+00',
    '2026-09-28 18:18:26.032352+00',
    '11111111-1111-1111-1111-111111111111',
    '33903016'
  ),
  (
    '6e8a57ec-e46e-47b6-804c-38eecc3b617a',
    'Lacre de Segurança',
    true,
    '2026-09-28 18:01:52.573514+00',
    '2026-09-28 18:01:52.573514+00',
    '11111111-1111-1111-1111-111111111111',
    '33903016'
  ),
  (
    'cd8bed85-03d5-4ae0-8d8f-f9dd307be6ea',
    'Copo Descartável Plástico',
    true,
    '2026-09-28 19:35:14.362506+00',
    '2026-09-28 19:35:14.362506+00',
    '11111111-1111-1111-1111-111111111111',
    '33903013'
  ),
  (
    'e294d67c-e3f6-4864-b2a0-bd6e0c66400e',
    'Saco Plastico 20 x 30',
    true,
    '2026-09-28 18:10:10.357259+00',
    '2026-09-28 18:13:59.180965+00',
    '11111111-1111-1111-1111-111111111111',
    '33903016'
  );

insert into
  "public"."demands" (
    "id",
    "created_at",
    "updated_at",
    "name",
    "type",
    "dispute_date",
    "user_id",
    "offer_opening_date",
    "status",
    "bidding_notice_number",
    "dispute_number",
    "contract_number",
    "is_return_requested",
    "internal_process_number",
    "process_number",
    "id_pca"
  )
values
  (
    '00b9d76d-1f61-4071-835b-63f4931c7272',
    '2026-09-28 19:36:59.33077+00',
    '2026-09-28 19:37:04.588507+00',
    'Materiais Diversos',
    'consumption',
    null,
    '11111111-1111-1111-1111-111111111111',
    null,
    'quotation',
    null,
    null,
    '1',
    false,
    '2026-0001',
    '058.65498798/2026-98',
    '464654654654654654654654654'
  );

insert into
  "public"."demand_products" (
    "id",
    "demand_id",
    "product_id",
    "quantity",
    "created_at",
    "updated_at",
    "created_by",
    "unit_id",
    "product_name_snapshot",
    "unit_name_snapshot",
    "reference_price",
    "bid_interval",
    "bid_interval_type",
    "expense_nature_name_snapshot",
    "sort_order"
  )
values
  (
    '5003758e-b108-4b69-be8c-83d2d6a175ec',
    '00b9d76d-1f61-4071-835b-63f4931c7272',
    '6e8a57ec-e46e-47b6-804c-38eecc3b617a',
    '100',
    '2026-09-28 19:45:34.89537+00',
    '2026-09-29 10:34:39.184133+00',
    '11111111-1111-1111-1111-111111111111',
    '69a68ca0-c516-44ba-8c78-b20bc1ad94e9',
    'Lacre de Segurança',
    'Caixa 100 Unidade',
    '15.6900',
    '3',
    'percentage',
    'MATERIAL DE ACONDICIONAMENTO E EMBALAGEM',
    1
  ),
  (
    'a869b464-1c50-4cae-bc33-5020008dbd0e',
    '00b9d76d-1f61-4071-835b-63f4931c7272',
    '02cab3f7-f829-4e17-8d08-f7278dceab21',
    '25',
    '2026-09-28 19:49:13.923645+00',
    '2026-09-29 10:34:39.187235+00',
    '11111111-1111-1111-1111-111111111111',
    '6e8ea923-1a15-44d5-91d1-1f7c054426ed',
    'Saco Plástico 60 x 90',
    'Pacote 100 unidades',
    '198.5300',
    '3',
    'percentage',
    'MATERIAL DE ACONDICIONAMENTO E EMBALAGEM',
    2
  ),
  (
    'af25e5d0-e3d2-46eb-a060-743a0061b518',
    '00b9d76d-1f61-4071-835b-63f4931c7272',
    'cd8bed85-03d5-4ae0-8d8f-f9dd307be6ea',
    '100',
    '2026-09-28 19:49:47.795476+00',
    '2026-09-29 10:34:39.196609+00',
    '11111111-1111-1111-1111-111111111111',
    '6e8ea923-1a15-44d5-91d1-1f7c054426ed',
    'Copo Descartável Plástico',
    'Pacote 100 unidades',
    '4.9950',
    '3',
    'percentage',
    'MATERIAL E UTENS.P/REFEITORIO,COPA E COZINHA',
    4
  ),
  (
    'b2f205e9-40dc-48ad-bfe5-8794a9bf5ab8',
    '00b9d76d-1f61-4071-835b-63f4931c7272',
    'e294d67c-e3f6-4864-b2a0-bd6e0c66400e',
    '100',
    '2026-09-28 19:48:17.204246+00',
    '2026-09-29 10:34:39.192342+00',
    '11111111-1111-1111-1111-111111111111',
    '6e8ea923-1a15-44d5-91d1-1f7c054426ed',
    'Saco Plástico 20 x 30',
    'Pacote 100 unidades',
    '7.9900',
    '3',
    'percentage',
    'MATERIAL DE ACONDICIONAMENTO E EMBALAGEM',
    3
  );

insert into
  "public"."iirgd_citizens" (
    "id",
    "name",
    "rg",
    "cpf",
    "created_at",
    "updated_at"
  )
values
  (
    '06763763-e6c4-4374-9c9d-64d5be136fee',
    'Pedro Antonio da Luz',
    '43891781-9',
    '939.950.582-05',
    '2026-10-08 20:03:12.803015+00',
    '2026-10-08 20:03:12.803015+00'
  ),
  (
    '0f7c60e5-fb79-41fc-a276-70db2dfe013b',
    'Noah Luan Rocha',
    '25163818-2',
    '730.877.421-04',
    '2026-10-08 20:04:46.524657+00',
    '2026-10-08 20:04:46.524657+00'
  ),
  (
    '33cca667-29bb-4a38-bf37-0b7e5e2dd981',
    'Renato Raul Diego Figueiredo',
    '32465638-5',
    '283.762.036-06',
    '2026-10-08 20:08:20.094529+00',
    '2026-10-08 20:08:20.094529+00'
  ),
  (
    '442c6af2-630f-4d4a-bff1-b5d3bfa37db0',
    'Bento Luiz Nogueira',
    '33945768-5',
    '080.922.868-84',
    '2026-10-08 20:04:25.599231+00',
    '2026-10-08 20:04:25.599231+00'
  ),
  (
    '62ad2a54-9f1a-4fcd-9789-da800d021d95',
    'Henry Manuel Silva',
    '44810838-0',
    '223.103.388-77',
    '2026-10-08 20:01:03.470728+00',
    '2026-10-08 20:01:03.470728+00'
  ),
  (
    '81a65ab4-c993-426a-a2de-cf5f171bf36a',
    'Clara Elisa Sônia Ribeiro',
    '37216566-7',
    '938.074.040-90',
    '2026-10-08 20:06:03.806618+00',
    '2026-10-08 20:06:03.806618+00'
  ),
  (
    '8e6f2060-369b-455f-b17d-a839ce1cba13',
    'José Mário Drumond',
    '25564771-2',
    '103.608.810-33',
    '2026-10-08 20:05:38.504334+00',
    '2026-10-08 20:05:38.504334+00'
  ),
  (
    'bf26eb30-5a3d-430b-a200-f659efd5e565',
    'Manuel Carlos Eduardo Victor Baptista',
    '36162869-9',
    '399.164.575-06',
    '2026-10-08 20:03:54.098481+00',
    '2026-10-08 20:03:54.098481+00'
  ),
  (
    'c637b7c1-c9ba-40f4-9955-4090936b2879',
    'Oliver Diego Daniel da Cunha',
    '30188425-0',
    '488.227.505-86',
    '2026-10-08 20:01:57.104082+00',
    '2026-10-08 20:01:57.104082+00'
  ),
  (
    'ef3eb912-5735-441e-89b8-8fdfcff0182b',
    'Nicolas Thales da Mota',
    '24779175-1',
    '254.611.703-31',
    '2026-10-08 20:03:31.734098+00',
    '2026-10-08 20:03:31.734098+00'
  );

insert into
  "public"."iirgd_demands" (
    "id",
    "station_code",
    "observation",
    "status",
    "created_by",
    "created_at",
    "updated_at",
    "citizen_id"
  )
values
  (
    '065b0983-14d0-4431-a18c-4ef7cb60c96a',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:06:03.822265+00',
    '2026-10-08 20:06:03.822265+00',
    '81a65ab4-c993-426a-a2de-cf5f171bf36a'
  ),
  (
    '41b61249-55ea-41ef-8807-bde8a5fb37b2',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:03:31.755034+00',
    '2026-10-08 20:03:31.755034+00',
    'ef3eb912-5735-441e-89b8-8fdfcff0182b'
  ),
  (
    '52d44a16-a06c-41ef-9e68-45d21bd74d2b',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:04:25.6127+00',
    '2026-10-08 20:04:25.6127+00',
    '442c6af2-630f-4d4a-bff1-b5d3bfa37db0'
  ),
  (
    'ad7e2b01-70ef-4e8a-aeef-bd707aaeaf5d',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:08:20.113743+00',
    '2026-10-08 20:08:20.113743+00',
    '33cca667-29bb-4a38-bf37-0b7e5e2dd981'
  ),
  (
    'bf01aedc-48fe-49f0-96ba-dfc09848fc86',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:01:57.125559+00',
    '2026-10-08 20:01:57.125559+00',
    'c637b7c1-c9ba-40f4-9955-4090936b2879'
  ),
  (
    'cb26ae63-2938-41c9-8406-289fa34cf932',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:01:03.49707+00',
    '2026-10-08 20:01:03.49707+00',
    '62ad2a54-9f1a-4fcd-9789-da800d021d95'
  ),
  (
    'd0cec809-64ac-49bf-b79a-b3155c16eff1',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:04:46.538548+00',
    '2026-10-08 20:04:46.538548+00',
    '0f7c60e5-fb79-41fc-a276-70db2dfe013b'
  ),
  (
    'd7c5907e-022a-4292-bfb7-68f95aaba0bd',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:03:12.826101+00',
    '2026-10-08 20:03:12.826101+00',
    '06763763-e6c4-4374-9c9d-64d5be136fee'
  ),
  (
    'd7fb9094-fce1-4614-adef-fb5f3d1dd1e0',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:03:54.117981+00',
    '2026-10-08 20:03:54.117981+00',
    'bf26eb30-5a3d-430b-a200-f659efd5e565'
  ),
  (
    'e9da1d45-50f3-4b1a-b6aa-d02286780200',
    '1342-5',
    '',
    'new',
    null,
    '2026-10-08 20:05:38.521031+00',
    '2026-10-08 20:05:38.521031+00',
    '8e6f2060-369b-455f-b17d-a839ce1cba13'
  );

insert into
  "public"."iirgd_demand_status_history" (
    "id",
    "demand_id",
    "status",
    "observation",
    "created_at",
    "created_by"
  )
values
  (
    '15e1c970-948c-40de-b395-e66e2cc952fc',
    'cb26ae63-2938-41c9-8406-289fa34cf932',
    'new',
    '',
    '2026-10-08 20:01:03.517799+00',
    null
  ),
  (
    '1ece1ecd-22c1-4244-b90d-2812ef08d53d',
    'd7c5907e-022a-4292-bfb7-68f95aaba0bd',
    'new',
    '',
    '2026-10-08 20:03:12.848864+00',
    null
  ),
  (
    '22d545d6-5f2d-4199-ba27-83739db4ea6f',
    '065b0983-14d0-4431-a18c-4ef7cb60c96a',
    'new',
    '',
    '2026-10-08 20:06:03.844336+00',
    null
  ),
  (
    '2a824d80-ba16-4df0-bd18-56ffd49d92f3',
    'bf01aedc-48fe-49f0-96ba-dfc09848fc86',
    'new',
    '',
    '2026-10-08 20:01:57.142283+00',
    null
  ),
  (
    '31e95dbe-a245-4d5d-8522-073adbddfaa4',
    '41b61249-55ea-41ef-8807-bde8a5fb37b2',
    'new',
    '',
    '2026-10-08 20:03:31.778473+00',
    null
  ),
  (
    '6914b5ca-33e6-4947-99c2-3ebedbbd80a2',
    '52d44a16-a06c-41ef-9e68-45d21bd74d2b',
    'new',
    '',
    '2026-10-08 20:04:25.627197+00',
    null
  ),
  (
    '7402835c-71a7-494e-a7fd-0eb2e237e7d3',
    'ad7e2b01-70ef-4e8a-aeef-bd707aaeaf5d',
    'new',
    '',
    '2026-10-08 20:08:20.132953+00',
    null
  ),
  (
    'bb21f6dc-2a26-4160-8e40-ab4e60cb4578',
    'd0cec809-64ac-49bf-b79a-b3155c16eff1',
    'new',
    '',
    '2026-10-08 20:04:46.555054+00',
    null
  ),
  (
    'e7fec087-b86f-4afa-be12-43b79d07be8c',
    'e9da1d45-50f3-4b1a-b6aa-d02286780200',
    'new',
    '',
    '2026-10-08 20:05:38.543536+00',
    null
  ),
  (
    'f7cbf125-259a-4416-a3c2-039860a8f5a3',
    'd7fb9094-fce1-4614-adef-fb5f3d1dd1e0',
    'new',
    '',
    '2026-10-08 20:03:54.150591+00',
    null
  );