export type CadernetaImage =
  | 'maternidade'
  | 'movimentacao'
  | 'pastagens'
  | 'bebedouros'
  | 'rodeio'
  | 'suplementacao'
  | 'enfermaria'
  | 'morte'
  | 'clima'
  | 'abastecimento'
  | 'cantina'

export const CADERNETA_IMAGES: Record<CadernetaImage, string> = {
  maternidade: '/images/cadernetas/maternidade.png',
  movimentacao: '/images/cadernetas/movimentacao.png',
  pastagens: '/images/cadernetas/pastagens.png',
  bebedouros: '/images/cadernetas/bebedouros.png',
  rodeio: '/images/cadernetas/rodeio.png',
  suplementacao: '/images/cadernetas/suplementacao.png',
  enfermaria: '/images/cadernetas/enfermaria.png',
  morte: '/images/cadernetas/morte.png',
  clima: '/images/cadernetas/clima.png',
  abastecimento: '/images/cadernetas/abastecimento.png',
  cantina: '/images/cadernetas/cantina.png',
}

export const CADERNETA_TITLES: Record<CadernetaImage, string> = {
  maternidade: 'Maternidade',
  movimentacao: 'Movimentação',
  pastagens: 'Pastagens',
  bebedouros: 'Bebedouros',
  rodeio: 'Rodeio',
  suplementacao: 'Suplementação',
  enfermaria: 'Enfermaria',
  morte: 'Morte',
  clima: 'Clima',
  abastecimento: 'Abastecimento',
  cantina: 'Cantina',
}

export const CADERNETA_DESCRIPTIONS: Record<CadernetaImage, string> = {
  maternidade: 'Registros de nascimentos e partos',
  movimentacao: 'Registros de movimentação de animais',
  pastagens: 'Registros de manejo de pastagens',
  bebedouros: 'Registros de leitura de bebedouros',
  rodeio: 'Registros de manejos e rodeios',
  suplementacao: 'Registros de suplementação alimentar',
  enfermaria: 'Registros de tratamentos e enfermidades',
  morte: 'Registros de óbitos e mortes',
  clima: 'Registros de clima e temperatura',
  abastecimento: 'Registros de abastecimento de veículos',
  cantina: 'Registros de cantina e alimentação',
}

export const LOGO_GESTAUP = '/images/logo/logo-gestaup.png'
