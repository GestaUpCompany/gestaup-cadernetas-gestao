ALTER TABLE public.registros_almoxarifado
  ALTER COLUMN fazenda_id TYPE uuid USING fazenda_id::uuid;

ALTER TABLE public.registros_cantina
  ALTER COLUMN fazenda_id TYPE uuid USING fazenda_id::uuid;

ALTER TABLE public.registros_manutencao_maquinas
  ALTER COLUMN fazenda_id TYPE uuid USING fazenda_id::uuid;

ALTER TABLE public.registros_almoxarifado
  ADD CONSTRAINT registros_almoxarifado_fazenda_id_fkey
  FOREIGN KEY (fazenda_id) REFERENCES public.fazendas(id);

ALTER TABLE public.registros_cantina
  ADD CONSTRAINT registros_cantina_fazenda_id_fkey
  FOREIGN KEY (fazenda_id) REFERENCES public.fazendas(id);

ALTER TABLE public.registros_manutencao_maquinas
  ADD CONSTRAINT registros_manutencao_maquinas_fazenda_id_fkey
  FOREIGN KEY (fazenda_id) REFERENCES public.fazendas(id);

CREATE INDEX IF NOT EXISTS idx_registros_almoxarifado_fazenda_id
  ON public.registros_almoxarifado(fazenda_id);

CREATE INDEX IF NOT EXISTS idx_registros_cantina_fazenda_id
  ON public.registros_cantina(fazenda_id);

CREATE INDEX IF NOT EXISTS idx_registros_manutencao_maquinas_fazenda_id
  ON public.registros_manutencao_maquinas(fazenda_id);;
