-- Adicionar colunas boiaProtecaoBoasCondicoes à tabela registros_bebedouros
ALTER TABLE public.registros_bebedouros 
ADD COLUMN IF NOT EXISTS boia_protecao_boas_condicoes BOOLEAN,
ADD COLUMN IF NOT EXISTS boia_protecao_boas_condicoes_obs TEXT;;
