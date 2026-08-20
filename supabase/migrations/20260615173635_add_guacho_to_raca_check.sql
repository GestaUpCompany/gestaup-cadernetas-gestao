
ALTER TABLE public.individuos
DROP CONSTRAINT IF EXISTS individuos_raca_check;

ALTER TABLE public.individuos
ADD CONSTRAINT individuos_raca_check
CHECK (raca = ANY (ARRAY[
  'Aberdeen Angus'::text,
  'Anelorado'::text,
  'Angus'::text,
  'Blonde'::text,
  'Brangus'::text,
  'Caracu'::text,
  'Charolês'::text,
  'Gir'::text,
  'Girolando'::text,
  'Guacho'::text,
  'Guzerá'::text,
  'Leiteiro'::text,
  'Limousin'::text,
  'Nelore'::text,
  'Red Angus'::text,
  'Senepol'::text,
  'Simental'::text,
  'SRD'::text,
  'Tabapuã'::text,
  'Wagyu'::text
]));
;
