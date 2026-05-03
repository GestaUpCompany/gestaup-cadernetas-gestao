export type CadernetaImage = 
  | 'maternidade'
  | 'movimentacao'
  | 'pastagens'
  | 'bebedouros'
  | 'rodeio'
  | 'suplementacao'
  | 'enfermaria'

export const CADERNETA_IMAGES: Record<CadernetaImage, string> = {
  maternidade: '/images/cadernetas/maternidade.png',
  movimentacao: '/images/cadernetas/movimentacao.png',
  pastagens: '/images/cadernetas/pastagens.png',
  bebedouros: '/images/cadernetas/bebedouros.png',
  rodeio: '/images/cadernetas/rodeio.png',
  suplementacao: '/images/cadernetas/suplementacao.png',
  enfermaria: '/images/cadernetas/enfermaria.png',
}

export const CADERNETA_TITLES: Record<CadernetaImage, string> = {
  maternidade: 'Maternidade',
  movimentacao: 'Movimentação',
  pastagens: 'Pastagens',
  bebedouros: 'Bebedouros',
  rodeio: 'Rodeio',
  suplementacao: 'Suplementação',
  enfermaria: 'Enfermaria',
}

export const CADERNETA_DESCRIPTIONS: Record<CadernetaImage, string> = {
  maternidade: 'Registros de nascimentos e partos',
  movimentacao: 'Registros de movimentação de animais',
  pastagens: 'Registros de manejo de pastagens',
  bebedouros: 'Registros de leitura de bebedouros',
  rodeio: 'Registros de manejos e rodeios',
  suplementacao: 'Registros de suplementação alimentar',
  enfermaria: 'Registros de tratamentos e enfermidades',
}

export const LOGO_GESTAUP = '/images/logo/logo-gestaup.png'
