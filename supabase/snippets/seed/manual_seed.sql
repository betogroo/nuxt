INSERT INTO
    "public"."measurement_units" (
        "id",
        "name",
        "is_active",
        "created_at",
        "updated_at",
        "is_pending"
    )
VALUES
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

INSERT INTO
    "public"."products" (
        "id",
        "name",
        "is_active",
        "created_at",
        "updated_at",
        "created_by",
        "expense_nature_id"
    )
VALUES
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



INSERT INTO
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
VALUES
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



INSERT INTO
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
VALUES
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