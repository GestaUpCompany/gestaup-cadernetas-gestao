ALTER TABLE public.registros_bebedouros 
ADD COLUMN agua_suficiente BOOLEAN,
ADD COLUMN agua_suficiente_obs TEXT,
ADD COLUMN vazao_bebedouro_ideal BOOLEAN,
ADD COLUMN vazao_bebedouro_ideal_obs TEXT,
ADD COLUMN aterro_acesso_bebedouro_ideal BOOLEAN,
ADD COLUMN aterro_acesso_bebedouro_ideal_obs TEXT,
ADD COLUMN espacamento_bebedouro_ideal BOOLEAN,
ADD COLUMN espacamento_bebedouro_ideal_obs TEXT;;
