-- Seed da Fazenda Guanabara (f8be22c5-12e9-4bda-a813-fae8cb3d47ec)
-- Dados copiados da produção para validação das migrations A-I na branch

-- 0. Desabilitar triggers da fazenda temporariamente
ALTER TABLE public.fazendas DISABLE TRIGGER USER;

-- 1. Fazenda
INSERT INTO public.fazendas (id, acesso_id, nome, ativo, controle_acesso_habilitado, acesso_confinamento, rbac_versao, timezone, tolerancia_rotina_minutos)
VALUES ('f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'guanabara', 'Fazenda Guanabara', true, false, false, 4, 'America/Cuiaba', 30)
ON CONFLICT (id) DO NOTHING;

-- 2. Pastos (31)
INSERT INTO public.pastos (id, fazenda_id, nome, area_util_ha, especie, altura_entrada_cm, altura_saida_cm, ativo, metragem_cocho_m, tipo, possui_deposito, area_total_ha, area_util_porcentagem) VALUES
('0007ddc9-ab21-409c-8f3d-7c07b61d9569', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP 1', 21.80, 'Piata', 30, 20, true, 60, 'TIP', false, NULL, NULL),
('19934517-9773-4a10-948c-5aa1ba19ed98', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R1 A', 71.82, 'Zuri', 70, 30, true, 60, 'Recria', false, NULL, NULL),
('1f0d5c23-c50a-43a0-b892-32dc494851b4', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Safrinha 1 A', 60.29, 'Piata', 30, 20, true, NULL, 'RIP', false, NULL, NULL),
('29c29e6f-aba9-4664-b70e-5ad1de7ac4d6', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Suporte 2', 13.75, 'Zuri', 70, 30, true, NULL, 'Volumosos', false, NULL, NULL),
('3c558485-d03c-4213-b1ad-9ee8a45f1ac1', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R5 A', 35.07, 'Piata', 30, 20, true, NULL, 'RIP', false, NULL, NULL),
('41aa1027-1e82-4ca4-85cc-8fdcf2dcc4fb', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Safrinha 3 A', 42.27, 'Piata', 30, 20, true, NULL, 'RIP', false, NULL, NULL),
('49ad0fbd-0159-43d7-8ef7-5028d7fc8017', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Enfermaria', 0.20, 'Piata', 30, 20, true, 60, 'Enfermaria', false, NULL, NULL),
('4a14dfdf-050e-476d-8c9e-f17267bdde45', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R6 B', 15.00, 'ZÚRI', 70, 35, true, NULL, NULL, false, 15, 100),
('4a954b2d-7228-4b2b-adfb-2fbd7f540124', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP 2', 22.60, 'Piata', 30, 20, true, 60, 'TIP', false, NULL, NULL),
('4b86b472-dfa1-4f48-b086-2a5702f4266c', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'SAFRINHA 3 B', 20.10, 'PIATÃ', 40, 20, true, NULL, NULL, false, 20.1, 100),
('4e871409-4b70-4c9b-942e-15989bc73abf', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R6 C', 15.80, 'ZÚRI', 70, 35, true, NULL, NULL, false, 15.8, 100),
('674131e1-7097-453f-851b-49e5713f4053', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R1 D', 22.60, 'ZÚRI', 70, 35, true, NULL, NULL, false, 22.6, 100),
('6b497263-c79f-453b-a8ec-3b46673f7f79', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R2 A', 56.80, 'Piata', 30, 20, true, 60, 'RIP', false, NULL, NULL),
('6c4724f6-f8bf-42e6-bf59-a16c0abe05d9', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Teste', NULL, 'Teste', 12, 12, false, NULL, NULL, false, NULL, NULL),
('7339e8c0-a240-4d68-84ae-dd63d8b0aef3', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP 4', 23.00, 'Piata', 30, 20, true, 60, 'TIP', false, NULL, NULL),
('7a3de6e3-813c-4b29-b15b-5aebb58a2e53', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R3', 17.80, 'Piata', 30, 20, true, NULL, 'RIP', false, NULL, NULL),
('7b67ee55-d45e-40d8-9fb0-c23bf6dea863', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP 3', 21.40, 'Piata', 30, 20, true, 60, 'TIP', false, NULL, NULL),
('8353d967-3b2d-4a4a-84fc-a367c92387f4', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP 5', 19.60, 'Piata', 30, 20, true, 60, 'TIP', false, NULL, NULL),
('8423ec31-80c3-4272-976a-fc729311ffee', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'SAFRINHA 1 B', 23.20, 'PIATÃ', 40, 20, true, NULL, NULL, false, 23.2, 100),
('92e5c920-dbf2-4fa5-8d12-f73f1d573de8', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'SAFRINHA 1 C', 19.50, 'PIATÃ', 40, 20, true, NULL, NULL, false, 19.5, 100),
('93ab4efd-edf7-41de-8e47-736c7d7194d9', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Safrinha 2', 23.00, 'Piata', 30, 20, true, NULL, 'RIP', false, NULL, NULL),
('94b9bcc4-5c62-40eb-99af-6659d93b7b95', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R6 A', 49.25, 'Zuri', 70, 30, true, NULL, 'RIP', false, NULL, NULL),
('af85e0c4-f01f-4f15-aae8-72d902c40554', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R5 B', 18.00, 'PIATÃ', 40, 20, true, NULL, NULL, false, 18, 100),
('bc637e35-e3a5-423b-b42a-42217ba2dbd8', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R7 A', 24.73, 'Piata', 30, 20, true, NULL, 'RIP', false, NULL, NULL),
('be36ed50-4fc4-4fcb-805d-a36a03312871', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R4 A', 29.71, 'Piata', 30, 20, true, NULL, 'RIP', false, NULL, NULL),
('dbf9352c-164d-4465-9873-8e39ad94472e', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R1 B', 16.40, 'Zúri', 70, 35, true, NULL, NULL, false, 16.4, 100),
('ea448936-bdfd-4705-9f70-821423f60097', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R7 B', 10.30, 'PIATÃ', 40, 20, true, NULL, NULL, false, 10.3, 100),
('f1dbc05d-2017-43bd-a92f-cf62cb165826', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R2 B', 28.40, 'PIATÃ', 40, 20, true, NULL, NULL, false, 28.4, 100),
('f9b279e0-e8ae-4175-b6fd-191c1b7a5193', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R1 C', 16.80, 'Zúri', 70, 35, true, NULL, NULL, false, 16.8, 100),
('fa0da2f6-d53d-4915-a501-be1377420b4f', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'R4 B', 11.00, 'PIATÃ', 40, 20, true, NULL, NULL, false, 11, 100),
('fb911cb4-581e-44c1-9ccf-a10afaf6a35b', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Suporte 1', 13.75, 'Zuri', 70, 30, true, NULL, 'Volumosos', false, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Formulações (4) - dados completos da produção (insumos, custos, consumo)
INSERT INTO public.formulacoes (id, fazenda_id, nome, gmd, ativo, categoria, peso_vivo_medio, sistema_producao, tipo, e_premix, categoria_inferida_automaticamente, insumos, custo_total, teor_ms_dieta, consumo_ms_percent_pv, custo_dieta_reais_cab_dia, consumo_mn_kg_cab_dia, consumo_ms_kg_cab_dia, custo_mn_tonelada, custo_ms_tonelada) VALUES
('e9980142-af30-46c3-b588-bcd0b30adfc7', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Ração Bezerros 1,0% PV', 0.6, true, 'bezerro', 180, 'Recria', 'Ração', false, false,
  '[{"nome":"Silagem Capim Mombaça","teor_ms":30,"insumo_id":"83e35b8b-ff80-4373-8f06-51c76043f621","preco_ton_mn":150,"custo_tonelada":74.75146474184403,"formula_teor_ms":25,"formula_mn_bruta":83.33333333333334,"formula_mn_percent":49.83430982789602,"consumo_mn_kg_cab_dia":1.5,"consumo_ms_kg_cab_dia":0.45,"custo_dieta_reais_cab_dia":0.22499999999999998},{"nome":"Milho Gão Moído","teor_ms":88,"insumo_id":"7ce71143-2ee5-476e-9bba-add324b19404","preco_ton_mn":750,"custo_tonelada":192.65491140284342,"formula_teor_ms":37.8,"formula_mn_bruta":42.95454545454545,"formula_mn_percent":25.687321520379125,"consumo_mn_kg_cab_dia":0.7731818181818181,"consumo_ms_kg_cab_dia":0.6803999999999999,"custo_dieta_reais_cab_dia":0.5798863636363636},{"nome":"Farelo de Algodão","teor_ms":90,"insumo_id":"73057a0f-f9dc-4f9c-9a9e-e98f70eb2106","preco_ton_mn":900,"custo_tonelada":131.56257794564547,"formula_teor_ms":22,"formula_mn_bruta":24.444444444444443,"formula_mn_percent":14.61806421618283,"consumo_mn_kg_cab_dia":0.44,"consumo_ms_kg_cab_dia":0.396,"custo_dieta_reais_cab_dia":0.396},{"nome":"Sal Branco","teor_ms":99,"insumo_id":"1b138832-4a01-4ce6-b236-e335f05ebf17","preco_ton_mn":1050,"custo_tonelada":1.2685097047100806,"formula_teor_ms":0.2,"formula_mn_bruta":0.20202020202020204,"formula_mn_percent":0.12081044806762672,"consumo_mn_kg_cab_dia":0.003636363636363637,"consumo_ms_kg_cab_dia":0.0036000000000000003,"custo_dieta_reais_cab_dia":0.0038181818181818187},{"nome":"Uréia Pecuária","teor_ms":99,"insumo_id":"d888ee4f-2a83-449e-a176-6d25069788b1","preco_ton_mn":3100,"custo_tonelada":18.725619450482142,"formula_teor_ms":1,"formula_mn_bruta":1.0101010101010102,"formula_mn_percent":0.6040522403381335,"consumo_mn_kg_cab_dia":0.018181818181818184,"consumo_ms_kg_cab_dia":0.018000000000000002,"custo_dieta_reais_cab_dia":0.05636363636363637},{"nome":"Farelo de Soja","teor_ms":89,"insumo_id":"2e12c562-a0b6-4059-a1a5-8144c09967f0","preco_ton_mn":1710,"custo_tonelada":114.89888063690181,"formula_teor_ms":10,"formula_mn_bruta":11.235955056179774,"formula_mn_percent":6.719232785783731,"consumo_mn_kg_cab_dia":0.20224719101123598,"consumo_ms_kg_cab_dia":0.18000000000000002,"custo_dieta_reais_cab_dia":0.3458426966292135},{"nome":"Sal AgPastto Recritech","teor_ms":99,"insumo_id":"e223e6a4-d650-46c4-89fc-22a37d779163","preco_ton_mn":5110,"custo_tonelada":123.46827792511449,"formula_teor_ms":4,"formula_mn_bruta":4.040404040404041,"formula_mn_percent":2.416208961352534,"consumo_mn_kg_cab_dia":0.07272727272727274,"consumo_ms_kg_cab_dia":0.07200000000000001,"custo_dieta_reais_cab_dia":0.3716363636363637}]'::jsonb,
  657.33, 59.80, 1, 1.98, 3.010, 1.800, 657.33, 1099.19),
('2caa4b55-b7d1-4977-acba-65df14fd3d29', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Recria - Seca Prot 0.3%', 0.5, true, 'bezerro', 270, 'Recria', 'Ração', false, false,
  '[{"nome":"Milho Gão Moído","teor_ms":88,"insumo_id":"7ce71143-2ee5-476e-9bba-add324b19404","preco_ton_mn":750,"custo_tonelada":338.74991412197653,"formula_teor_ms":43.5,"formula_mn_bruta":49.43181818181818,"formula_mn_percent":45.16665521626354,"consumo_mn_kg_cab_dia":0.40039772727272727,"consumo_ms_kg_cab_dia":0.35235,"custo_dieta_reais_cab_dia":0.30029829545454545},{"nome":"Farelo de Algodão","teor_ms":90,"insumo_id":"73057a0f-f9dc-4f9c-9a9e-e98f70eb2106","preco_ton_mn":900,"custo_tonelada":173.60608625653484,"formula_teor_ms":19,"formula_mn_bruta":21.11111111111111,"formula_mn_percent":19.289565139614982,"consumo_mn_kg_cab_dia":0.171,"consumo_ms_kg_cab_dia":0.1539,"custo_dieta_reais_cab_dia":0.1539},{"nome":"Sal Branco","teor_ms":99,"insumo_id":"1b138832-4a01-4ce6-b236-e335f05ebf17","preco_ton_mn":1050,"custo_tonelada":125.98208811279643,"formula_teor_ms":13,"formula_mn_bruta":13.131313131313131,"formula_mn_percent":11.998294105980612,"consumo_mn_kg_cab_dia":0.10636363636363637,"consumo_ms_kg_cab_dia":0.1053,"custo_dieta_reais_cab_dia":0.11168181818181819},{"nome":"Uréia Pecuária","teor_ms":99,"insumo_id":"d888ee4f-2a83-449e-a176-6d25069788b1","preco_ton_mn":3100,"custo_tonelada":157.362241928438,"formula_teor_ms":5.5,"formula_mn_bruta":5.555555555555555,"formula_mn_percent":5.0762013525302585,"consumo_mn_kg_cab_dia":0.045000000000000005,"consumo_ms_kg_cab_dia":0.044550000000000006,"custo_dieta_reais_cab_dia":0.1395},{"nome":"Farelo de Soja","teor_ms":89,"insumo_id":"2e12c562-a0b6-4059-a1a5-8144c09967f0","preco_ton_mn":1710,"custo_tonelada":158.0010447952733,"formula_teor_ms":9,"formula_mn_bruta":10.112359550561798,"formula_mn_percent":9.239827181010133,"consumo_mn_kg_cab_dia":0.08191011235955056,"consumo_ms_kg_cab_dia":0.0729,"custo_dieta_reais_cab_dia":0.14006629213483146},{"nome":"Sal AgPastto Recritech","teor_ms":99,"insumo_id":"e223e6a4-d650-46c4-89fc-22a37d779163","preco_ton_mn":5110,"custo_tonelada":471.625252935084,"formula_teor_ms":10,"formula_mn_bruta":10.1010101010101,"formula_mn_percent":9.22945700460047,"consumo_mn_kg_cab_dia":0.08181818181818183,"consumo_ms_kg_cab_dia":0.08100000000000002,"custo_dieta_reais_cab_dia":0.4180909090909092}]'::jsonb,
  1425.33, 91.37, 0.3, 1.26, 0.886, 0.810, 1425.33, 1559.92),
('16a0afe8-a080-4ac9-843d-22f44d59cafb', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'RIP - Seca', 0.8, true, 'garrote', 350, 'Recria', 'Ração', false, false,
  '[{"nome":"Milho Gão Moído","teor_ms":88,"insumo_id":"7ce71143-2ee5-476e-9bba-add324b19404","preco_ton_mn":750,"custo_tonelada":411.075263316088,"formula_teor_ms":53.5,"formula_mn_bruta":60.79545454545455,"formula_mn_percent":54.81003510881174,"consumo_mn_kg_cab_dia":1.4894886363636362,"consumo_ms_kg_cab_dia":1.3107499999999999,"custo_dieta_reais_cab_dia":1.1171164772727271},{"nome":"Farelo de Algodão","teor_ms":90,"insumo_id":"73057a0f-f9dc-4f9c-9a9e-e98f70eb2106","preco_ton_mn":900,"custo_tonelada":180.30964820842743,"formula_teor_ms":20,"formula_mn_bruta":22.22222222222222,"formula_mn_percent":20.034405356491934,"consumo_mn_kg_cab_dia":0.5444444444444444,"consumo_ms_kg_cab_dia":0.49,"custo_dieta_reais_cab_dia":0.49},{"nome":"Sal Branco","teor_ms":99,"insumo_id":"1b138832-4a01-4ce6-b236-e335f05ebf17","preco_ton_mn":1050,"custo_tonelada":114.7425034053629,"formula_teor_ms":12,"formula_mn_bruta":12.121212121212121,"formula_mn_percent":10.927857467177418,"consumo_mn_kg_cab_dia":0.29696969696969694,"consumo_ms_kg_cab_dia":0.294,"custo_dieta_reais_cab_dia":0.31181818181818177},{"nome":"Uréia Pecuária","teor_ms":99,"insumo_id":"d888ee4f-2a83-449e-a176-6d25069788b1","preco_ton_mn":3100,"custo_tonelada":56.460596913749995,"formula_teor_ms":2,"formula_mn_bruta":2.0202020202020203,"formula_mn_percent":1.8213095778629032,"consumo_mn_kg_cab_dia":0.04949494949494949,"consumo_ms_kg_cab_dia":0.048999999999999995,"custo_dieta_reais_cab_dia":0.15343434343434342},{"nome":"Farelo de Soja","teor_ms":89,"insumo_id":"2e12c562-a0b6-4059-a1a5-8144c09967f0","preco_ton_mn":1710,"custo_tonelada":173.21881934629818,"formula_teor_ms":10,"formula_mn_bruta":11.235955056179774,"formula_mn_percent":10.12975551732738,"consumo_mn_kg_cab_dia":0.2752808988764045,"consumo_ms_kg_cab_dia":0.245,"custo_dieta_reais_cab_dia":0.4707303370786517},{"nome":"Sal AgPastto Recritech","teor_ms":99,"insumo_id":"e223e6a4-d650-46c4-89fc-22a37d779163","preco_ton_mn":5110,"custo_tonelada":116.33614928599292,"formula_teor_ms":2.5,"formula_mn_bruta":2.525252525252525,"formula_mn_percent":2.2766369723286286,"consumo_mn_kg_cab_dia":0.06186868686868687,"consumo_ms_kg_cab_dia":0.06125,"custo_dieta_reais_cab_dia":0.31614898989898993}]'::jsonb,
  1052.14, 90.15, 0.7, 2.86, 2.718, 2.450, 1052.14, 1167.04),
('ad3fcce5-aa7e-4369-b691-96d8c1b88528', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP - Seca', 1.4, true, 'boi magro', 480, 'Engorda', 'Ração', false, false,
  '[{"nome":"Núcleo Confinatto Corte","teor_ms":99,"insumo_id":"a90c552e-f783-4444-99d9-c4c39d30b583","preco_ton_mn":2490,"custo_tonelada":55.81757343042198,"formula_teor_ms":2.5,"formula_mn_bruta":2.525252525252525,"formula_mn_percent":2.2416696156795974,"consumo_mn_kg_cab_dia":0.2181818181818182,"consumo_ms_kg_cab_dia":0.21600000000000003,"custo_dieta_reais_cab_dia":0.5432727272727274},{"nome":"Milho Gão Moído","teor_ms":88,"insumo_id":"7ce71143-2ee5-476e-9bba-add324b19404","preco_ton_mn":750,"custo_tonelada":540.9428991336829,"formula_teor_ms":71.5,"formula_mn_bruta":81.25,"formula_mn_percent":72.12571988449105,"consumo_mn_kg_cab_dia":7.02,"consumo_ms_kg_cab_dia":6.1776,"custo_dieta_reais_cab_dia":5.265},{"nome":"Farelo de Algodão","teor_ms":90,"insumo_id":"73057a0f-f9dc-4f9c-9a9e-e98f70eb2106","preco_ton_mn":900,"custo_tonelada":159.78621020564174,"formula_teor_ms":18,"formula_mn_bruta":20,"formula_mn_percent":17.754023356182415,"consumo_mn_kg_cab_dia":1.7280000000000002,"consumo_ms_kg_cab_dia":1.5552000000000001,"custo_dieta_reais_cab_dia":1.5552000000000001},{"nome":"Uréia Pecuária","teor_ms":99,"insumo_id":"d888ee4f-2a83-449e-a176-6d25069788b1","preco_ton_mn":3100,"custo_tonelada":27.79670323442701,"formula_teor_ms":1,"formula_mn_bruta":1.0101010101010102,"formula_mn_percent":0.896667846271839,"consumo_mn_kg_cab_dia":0.08727272727272728,"consumo_ms_kg_cab_dia":0.0864,"custo_dieta_reais_cab_dia":0.2705454545454546},{"nome":"Farelo de Soja","teor_ms":89,"insumo_id":"2e12c562-a0b6-4059-a1a5-8144c09967f0","preco_ton_mn":1710,"custo_tonelada":119.3908199851143,"formula_teor_ms":7,"formula_mn_bruta":7.865168539325842,"formula_mn_percent":6.981919297375105,"consumo_mn_kg_cab_dia":0.679550561797753,"consumo_ms_kg_cab_dia":0.6048000000000001,"custo_dieta_reais_cab_dia":1.1620314606741575}]'::jsonb,
  903.73, 88.77, 1.8, 8.80, 9.733, 8.640, 903.73, 1018.06)
ON CONFLICT (id) DO NOTHING;

-- 4. Lotes (16)
INSERT INTO public.lotes (id, fazenda_id, nome, pasto_id, ativo, sistema_producao, destino, sexo, gmd, data_pesagem, peso_vivo_meta_kg, peso_entrada_kg_cab, quant_inicial, periodo) VALUES
('9a1679dc-8c08-49c7-8fa4-afe3ffe4fda4', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Farmacia', '49ad0fbd-0159-43d7-8ef7-5028d7fc8017', true, 'Confinamento', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('0b7605c4-65f9-45c9-8d45-699c25fca0a7', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'inativo Lote 02 Recria', NULL, false, 'RIP', NULL, 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('984a6e3f-146b-432c-96a4-f94a3d3caa53', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'inativo Lote 03', NULL, false, 'TIP', NULL, 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('d56dfa8e-1726-494c-b4fb-6bfb6b8d4a05', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'inativo Lote 04', NULL, false, 'TIP', NULL, 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('6357ceac-b903-4615-a9f5-3f1238d26d90', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'inativo Lote 05', NULL, false, 'TIP', NULL, 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('15c12a62-1a5c-4c06-81b2-b9eef54b202f', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'inativo Lote 12', NULL, false, 'Recria', NULL, 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('2ac554a5-ab2a-45e8-8af9-c5fc90904f53', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'inativo vacas cria', NULL, false, 'Recria', NULL, 'fêmea', NULL, NULL, NULL, NULL, NULL, NULL),
('1333dbed-12f9-40b7-8945-1d9cdb287df7', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Lote 02 Recria', '674131e1-7097-453f-851b-49e5713f4053', true, 'RIP', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('b3b103a8-0ea3-41ce-82f1-8fe920b804ff', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Lote 05', '7339e8c0-a240-4d68-84ae-dd63d8b0aef3', true, 'TIP', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('64646730-ea03-4425-9775-b17e71b62b45', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Lote 05 Recria', '1f0d5c23-c50a-43a0-b892-32dc494851b4', true, 'RIP', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('a10435f9-872d-443c-a9ae-c617e5a6f1c7', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Lote 06', '4a954b2d-7228-4b2b-adfb-2fbd7f540124', true, 'TIP', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('507e2fc9-4318-4601-965c-740ad9762d5f', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Lote 10 Recria', '4a14dfdf-050e-476d-8c9e-f17267bdde45', true, 'RIP', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('32321aca-8bea-46b6-90a9-9118a84e2e17', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Lote 11', '41aa1027-1e82-4ca4-85cc-8fdcf2dcc4fb', true, 'RIP', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('32e88d5a-2162-4472-8586-b3500d5913f7', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Lote 12', 'be36ed50-4fc4-4fcb-805d-a36a03312871', true, 'RIP', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('9e04b43a-479d-4231-a3ad-eec09ae77c71', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Lote 2b Recria', '8353d967-3b2d-4a4a-84fc-a367c92387f4', true, 'RIP', 'corte', 'macho', NULL, NULL, NULL, NULL, NULL, NULL),
('44282b13-1383-4889-bf75-1d858d343584', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Vacas Cria', 'bc637e35-e3a5-423b-b42a-42217ba2dbd8', true, 'Cria', 'reprodução', 'fêmea', NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 5. Lote Categorias (21)
INSERT INTO public.lote_categorias (id, lote_id, categoria, ativo, formulacao_id, gmd, peso_entrada_kg_cab, peso_vivo_atual_kg_cab, peso_vivo_meta_kg_cab, quant_atual, quant_inicial, data_ajuste_peso, data_fim, categoria_origem_id, data_pesagem) VALUES
('10375778-5ff8-42e1-bde4-640e1da7ba39', '0b7605c4-65f9-45c9-8d45-699c25fca0a7', 'bezerro', false, NULL, '0.5', 281, 285.00, 420.00, 0, NULL, NULL, '2026-07-31 16:27:17.223526-04', NULL, NULL),
('8b2b6480-bef9-42be-9586-47c0ae7f16c3', '0b7605c4-65f9-45c9-8d45-699c25fca0a7', 'bezerro ao pé', false, NULL, NULL, 210, 210.00, NULL, NULL, NULL, NULL, '2026-07-31 14:43:11.129603-04', NULL, NULL),
('c2b150d5-8828-493f-8dfa-e9ea7ed4b25c', '0b7605c4-65f9-45c9-8d45-699c25fca0a7', 'Garrote', false, NULL, NULL, 210, 210.00, NULL, NULL, NULL, NULL, '2026-07-31 16:26:56.022423-04', '8b2b6480-bef9-42be-9586-47c0ae7f16c3', '2026-07-31'),
('89b97944-1951-4390-b347-3a723d0dc34c', '1333dbed-12f9-40b7-8945-1d9cdb287df7', 'bezerro', true, '2caa4b55-b7d1-4977-acba-65df14fd3d29', '0.5', 270, 284.00, 315.00, 240, 240, NULL, NULL, NULL, '2026-07-23'),
('a019f833-5eff-4e67-8ed4-e5d3dd9b9169', '15c12a62-1a5c-4c06-81b2-b9eef54b202f', 'bezerro', false, NULL, '0.5', 180, 184.00, 0.00, 82, 82, NULL, '2026-07-31 16:27:17.223526-04', NULL, NULL),
('d03285bd-f938-433a-9a18-138e713ccdff', '2ac554a5-ab2a-45e8-8af9-c5fc90904f53', 'vaca', false, NULL, '0.5', 450, 454.00, NULL, 22, 22, NULL, '2026-07-31 16:27:17.223526-04', NULL, '2026-06-26'),
('af83b406-fb4a-49e1-8a31-78c2750d239e', '32321aca-8bea-46b6-90a9-9118a84e2e17', 'garrote', true, '16a0afe8-a080-4ac9-843d-22f44d59cafb', '0.8', 390, 412.40, 460.00, 161, 161, NULL, NULL, NULL, '2026-07-23'),
('e48fcea2-1aba-480f-ac1e-baaf5fd7a66e', '32e88d5a-2162-4472-8586-b3500d5913f7', 'bezerro', true, 'e9980142-af30-46c3-b588-bcd0b30adfc7', '0.6', 170, 184.30, 217.50, 183, 185, NULL, NULL, NULL, '2026-07-23'),
('5c2c1bd9-b978-42e3-b14b-a1df6323cf5f', '44282b13-1383-4889-bf75-1d858d343584', 'vaca', true, '2caa4b55-b7d1-4977-acba-65df14fd3d29', '0.5', 400, 414.00, 445.00, 22, 22, NULL, NULL, NULL, '2026-07-23'),
('19f4cc3e-3b02-4845-8f01-79d285f15a62', '507e2fc9-4318-4601-965c-740ad9762d5f', 'bezerro', true, '2caa4b55-b7d1-4977-acba-65df14fd3d29', '0.5', 280, 294.00, 325.00, 217, 217, NULL, NULL, NULL, '2026-07-23'),
('76b521b7-d2a3-4e63-a167-f1d6957efb8e', '6357ceac-b903-4615-a9f5-3f1238d26d90', 'boi gordo', false, NULL, '1.4', 530, 541.20, 600.00, 78, 79, NULL, '2026-07-31 16:27:17.223526-04', NULL, '2026-07-23'),
('1f4550aa-2ed9-415b-ade9-f59922f2c0ae', '6357ceac-b903-4615-a9f5-3f1238d26d90', 'garrote', false, NULL, NULL, 530, 530.00, NULL, 79, 79, '2026-07-28', '2026-07-31 16:26:56.022423-04', NULL, '2026-07-23'),
('be16a844-b6fc-4ac1-a63c-520361380f1c', '64646730-ea03-4425-9775-b17e71b62b45', 'garrote', true, '16a0afe8-a080-4ac9-843d-22f44d59cafb', '0.8', 390, 412.40, 460.00, 177, 177, NULL, NULL, NULL, '2026-07-23'),
('3ed543f7-822d-4e22-8c75-b79806458d51', '984a6e3f-146b-432c-96a4-f94a3d3caa53', 'boi magro', false, NULL, '1.4', 540, 551.20, 600.00, 93, 93, NULL, '2026-07-31 16:27:17.223526-04', NULL, '2026-07-23'),
('af766ad1-b2f1-44fe-8496-d865ec6a3740', '9a1679dc-8c08-49c7-8fa4-afe3ffe4fda4', 'Boi Magro', true, 'e9980142-af30-46c3-b588-bcd0b30adfc7', '0.6', 450, 471.80, 505.00, 14, 15, NULL, NULL, 'a1f729f5-b4d3-4191-92b1-ea9c164bb43d', '2026-07-23'),
('a1f729f5-b4d3-4191-92b1-ea9c164bb43d', '9a1679dc-8c08-49c7-8fa4-afe3ffe4fda4', 'garrote', false, NULL, NULL, 450, 461.20, NULL, 15, 15, NULL, '2026-07-31 15:33:14.20028-04', NULL, '2026-07-23'),
('f39394ea-96d1-4ae9-b096-4484881690f6', '9e04b43a-479d-4231-a3ad-eec09ae77c71', 'bezerro', false, NULL, NULL, 350, 356.40, NULL, 248, 248, NULL, '2026-07-31 15:35:52.81039-04', NULL, '2026-07-23'),
('7545d8c2-1f67-4a88-a5f3-92c912ed49ba', '9e04b43a-479d-4231-a3ad-eec09ae77c71', 'Garrote', true, '16a0afe8-a080-4ac9-843d-22f44d59cafb', '0.8', 350, 372.40, 420.00, 248, 248, NULL, NULL, 'f39394ea-96d1-4ae9-b096-4484881690f6', '2026-07-23'),
('21048ee7-7464-4a23-a465-1b90bff56f94', 'a10435f9-872d-443c-a9ae-c617e5a6f1c7', 'boi gordo', true, 'ad3fcce5-aa7e-4369-b691-96d8c1b88528', '1.4', 540, 579.20, 560.00, 93, 93, NULL, NULL, NULL, '2026-07-23'),
('9df37472-4f40-419d-9181-c167bb2bd027', 'b3b103a8-0ea3-41ce-82f1-8fe920b804ff', 'boi gordo', true, 'ad3fcce5-aa7e-4369-b691-96d8c1b88528', '1.4', 530, 569.20, 560.00, 79, 79, NULL, NULL, NULL, '2026-07-23'),
('92bedef7-e640-49ff-96aa-90e060bf8332', 'd56dfa8e-1726-494c-b4fb-6bfb6b8d4a05', 'boi gordo', false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-07-31 16:27:17.223526-04', NULL, '2026-05-21')
ON CONFLICT (id) DO NOTHING;

-- 6. Planos Nutricionais (12)
INSERT INTO public.planos_nutricionais (id, lote_categoria_id, fazenda_id, nome, formulacao_id, periodo_dias, peso_meta_kg, ordem, ativo, data_inicio, data_fim, gmd_planejado, migracao_automatica, peso_inicio_kg_cab, rc_inicio, condicao_migracao) VALUES
('02c2b9e0-1470-4b71-9e8d-e0a4a5cfc96c', 'af83b406-fb4a-49e1-8a31-78c2750d239e', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'RIP - Seca', '16a0afe8-a080-4ac9-843d-22f44d59cafb', 90, 460.00, 0, true, '2026-07-23', NULL, 0.8, false, 390.00, 50.00, 'periodo'),
('235fa6f8-36c7-4bf0-8634-b52acd72deb7', 'af766ad1-b2f1-44fe-8496-d865ec6a3740', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Ração Bezerros 1,0% PV', 'e9980142-af30-46c3-b588-bcd0b30adfc7', 59, 505.00, 1, true, '2026-08-17', NULL, 0.6, true, 470.00, 50.00, 'periodo'),
('32752d12-91ab-4d83-b22b-5b93dc052e26', '5c2c1bd9-b978-42e3-b14b-a1df6323cf5f', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Recria - Seca Prot 0.3%', '2caa4b55-b7d1-4977-acba-65df14fd3d29', 90, 445.00, 0, true, '2026-07-23', NULL, 0.5, false, 400.00, 50.00, 'periodo'),
('3f9de95f-d5e6-47d1-9508-b63c10c7078c', 'e48fcea2-1aba-480f-ac1e-baaf5fd7a66e', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Ração Bezerros 1,0% PV', 'e9980142-af30-46c3-b588-bcd0b30adfc7', 59, 217.50, 1, true, '2026-08-17', NULL, 0.6, true, 182.50, 50.00, 'periodo'),
('55154738-aecd-4b02-8f2e-7790b6d7f74a', 'be16a844-b6fc-4ac1-a63c-520361380f1c', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'RIP - Seca', '16a0afe8-a080-4ac9-843d-22f44d59cafb', 90, 460.00, 0, true, '2026-07-23', NULL, 0.8, false, 390.00, 50.00, 'periodo'),
('59492b73-49b7-49a0-972a-d252dfbcad2f', '19f4cc3e-3b02-4845-8f01-79d285f15a62', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Recria - Seca Prot 0.3%', '2caa4b55-b7d1-4977-acba-65df14fd3d29', 90, 325.00, 0, true, '2026-07-23', NULL, 0.5, false, 280.00, 50.00, 'periodo'),
('606fc71e-3ddd-404c-b44e-3933767a91e4', '7545d8c2-1f67-4a88-a5f3-92c912ed49ba', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'RIP - Seca', '16a0afe8-a080-4ac9-843d-22f44d59cafb', 90, 420.00, 0, true, '2026-07-23', NULL, 0.8, false, 350.00, 50.00, 'periodo'),
('70bd58de-791b-4cdd-bbd1-9c8d7ea0b751', '89b97944-1951-4390-b347-3a723d0dc34c', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Recria - Seca Prot 0.3%', '2caa4b55-b7d1-4977-acba-65df14fd3d29', 90, 315.00, 0, true, '2026-07-23', NULL, 0.5, false, 270.00, 50.00, 'periodo'),
('76a6b14b-32be-48ef-99a3-a9b1d4621394', 'e48fcea2-1aba-480f-ac1e-baaf5fd7a66e', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Recria - Seca Prot 0.3%', '2caa4b55-b7d1-4977-acba-65df14fd3d29', 90, 215.00, 0, false, '2026-07-23', '2026-08-17', 0.5, false, 170.00, 50.00, 'periodo'),
('ca845575-50f4-45ef-b9d5-cd30a633f483', '9df37472-4f40-419d-9181-c167bb2bd027', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP - Seca', 'ad3fcce5-aa7e-4369-b691-96d8c1b88528', 21, 560.00, 0, true, '2026-07-23', NULL, 1.4, false, 530.00, 50.00, 'periodo'),
('dbeaaf13-7322-4980-9ad9-4d05d68e2c4a', '21048ee7-7464-4a23-a465-1b90bff56f94', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP - Seca', 'ad3fcce5-aa7e-4369-b691-96d8c1b88528', 20, 560.00, 0, true, '2026-07-23', NULL, 1.4, false, 540.00, 50.00, 'periodo'),
('f4910c90-dd25-4466-8f68-e1b0f094c16f', 'af766ad1-b2f1-44fe-8496-d865ec6a3740', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'TIP - Seca', 'ad3fcce5-aa7e-4369-b691-96d8c1b88528', 138, 560.00, 0, false, '2026-07-23', '2026-08-17', 0.8, false, 450.00, 50.00, 'periodo')
ON CONFLICT (id) DO NOTHING;

-- 7. Faixas Categorias (11)
INSERT INTO public.faixas_categorias (id, fazenda_id, nome, sexo, peso_min, peso_max, ordem, ativo, cor) VALUES
('2aef8875-682b-4f43-aead-89d5aea87a9a', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Bezerra ao Pé', 'F', 30, 170, 1, true, '#fbcfe8'),
('21464178-57e2-4dfc-8fba-c3c74dfaf248', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Bezerro ao Pé', 'M', 30, 170, 1, true, '#fde68a'),
('fcf5972a-7c73-45fb-aa35-94a29e693ee2', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Bezerra', 'F', 171, 280, 2, true, '#f9a8d4'),
('f8fb1916-e7e1-46f2-b922-6d59eea9fb45', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Bezerro', 'M', 171, 300, 2, true, '#fcd34d'),
('ada0591b-6b68-44a9-be9c-79238c207acd', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Novilha', 'F', 281, 400, 3, true, '#ec4899'),
('38176087-0ffe-43ee-b12c-48854ed98965', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Garrote', 'M', 301, 420, 3, true, '#f59e0b'),
('f6320fd7-1ff9-4882-a822-a712368c7922', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Vaca', 'F', 401, 9999, 4, true, '#be185d'),
('b24723ce-c7b7-4ac2-90c0-a923f6975d50', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Boi Magro', 'M', 421, 500, 4, true, '#3b82f6'),
('274a332b-8b94-4456-8dd7-7017b68674e5', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Tourinho', 'M', 421, 500, 4, true, '#a78bfa'),
('aac88606-aeb4-4f8c-94ea-38d23889639a', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Touro', 'M', 501, 9999, 5, true, '#7c3aed'),
('18bbcf92-fcf8-4427-8758-57c01f3dd0c2', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', 'Boi Gordo', 'M', 501, 9999, 5, true, '#1d4ed8')
ON CONFLICT (id) DO NOTHING;

-- 8. Transições (2)
INSERT INTO public.lote_categorias_transicoes (id, fazenda_id, lote_id, lote_categoria_origem_id, lote_categoria_destino_id, categoria_origem, categoria_destino, peso_na_transicao_kg, data_transicao, motivo, usuario_id) VALUES
('7704b6ff-f376-4a2f-9cb8-a34d7e7a274d', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', '9a1679dc-8c08-49c7-8fa4-afe3ffe4fda4', 'a1f729f5-b4d3-4191-92b1-ea9c164bb43d', 'af766ad1-b2f1-44fe-8496-d865ec6a3740', 'garrote', 'Boi Magro', 461.20, '2026-07-31 15:33:14.20028-04', 'manual', 'fa93ce30-14ef-4966-bbde-910450ad4119'),
('a5be3413-9130-4e05-a8bd-d6c12af44cf0', 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec', '9e04b43a-479d-4231-a3ad-eec09ae77c71', 'f39394ea-96d1-4ae9-b096-4484881690f6', '7545d8c2-1f67-4a88-a5f3-92c912ed49ba', 'bezerro', 'Garrote', 356.40, '2026-07-31 15:35:52.81039-04', 'manual', 'fa93ce30-14ef-4966-bbde-910450ad4119')
ON CONFLICT (id) DO NOTHING;

-- 9. Reabilitar triggers da fazenda
ALTER TABLE public.fazendas ENABLE TRIGGER USER;

-- 10. Backfill Migration A: lotes.formulacao_id a partir de lote_categorias ativas
UPDATE public.lotes l
SET formulacao_id = sub.formulacao_id
FROM (
  SELECT lc.lote_id, lc.formulacao_id
  FROM public.lote_categorias lc
  WHERE lc.ativo = true
    AND lc.data_fim IS NULL
    AND lc.formulacao_id IS NOT NULL
  GROUP BY lc.lote_id, lc.formulacao_id
) sub
WHERE l.id = sub.lote_id
  AND l.formulacao_id IS NULL
  AND l.fazenda_id = 'f8be22c5-12e9-4bda-a813-fae8cb3d47ec';

-- 11. Backfill Migration B: formulacao_categorias_gmd a partir de lote_categorias/planos
INSERT INTO public.formulacao_categorias_gmd (formulacao_id, categoria, gmd, ordem)
SELECT DISTINCT ON (COALESCE(lc.formulacao_id, pn.formulacao_id), lc.categoria)
  COALESCE(lc.formulacao_id, pn.formulacao_id) AS formulacao_id,
  lc.categoria,
  COALESCE(pn.gmd_planejado, NULLIF(lc.gmd, '')::numeric, f.gmd) AS gmd,
  0 AS ordem
FROM public.lote_categorias lc
LEFT JOIN public.planos_nutricionais pn
  ON pn.lote_categoria_id = lc.id AND pn.ativo = true
LEFT JOIN public.formulacoes f
  ON f.id = COALESCE(lc.formulacao_id, pn.formulacao_id)
WHERE lc.ativo = true
  AND lc.data_fim IS NULL
  AND COALESCE(lc.formulacao_id, pn.formulacao_id) IS NOT NULL
  AND lc.categoria IS NOT NULL
  AND LOWER(TRIM(lc.categoria)) NOT IN (
    'tropa',
    'bezerro ao pé', 'bezerro ao pe',
    'bezerra ao pé', 'bezerra ao pe'
  )
  AND COALESCE(pn.gmd_planejado, NULLIF(lc.gmd, '')::numeric, f.gmd) IS NOT NULL
ORDER BY
  COALESCE(lc.formulacao_id, pn.formulacao_id),
  lc.categoria,
  (pn.gmd_planejado IS NOT NULL) DESC
ON CONFLICT (formulacao_id, categoria) DO NOTHING;
