import { TableExportConfig } from './exportXLSX'

export const MATERNIDADE_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_maternidade',
  sheetName: 'Maternidade',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'pasto', header: 'Pasto' },
    { source: 'lote', header: 'Lote' },
    { source: 'peso_cria_kg', header: 'Peso Cria (kg)', format: 'number' },
    { source: 'id_provisorio_cria', header: 'ID Provisório' },
    { source: 'tratamento', header: 'Tratamentos' },
    { source: 'tipo_parto', header: 'Tipo de Parto', transform: (value) => Array.isArray(value) ? value.join(', ') : value },
    { source: 'sexo', header: 'Sexo' },
    { source: 'raca', header: 'Raça' },
    { source: 'categoria_mae', header: 'Categoria da Mãe' },
    { source: 'escore_matriz', header: 'Escore Matriz', format: 'number' },
    { source: 'id_chip_mae', header: 'Chip Mãe' },
    { source: 'id_brinco_cria', header: 'Brinco Cria' },
    { source: 'id_chip_cria', header: 'Chip Cria' },
    { source: 'id_brinco_mae', header: 'Brinco Mãe' },
    { source: 'docilidade_matriz', header: 'Docilidade Matriz' },
    { source: 'observacao_parto', header: 'Observações' }
  ]
}

export const PASTAGENS_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_pastagens',
  sheetName: 'Pastagens',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'manejador', header: 'Manejador' },
    { source: 'lote', header: 'Lote' },
    { source: 'pasto_saida', header: 'Pasto Saída' },
    { source: 'avaliacao_saida', header: 'Avaliação Saída', format: 'number' },
    { source: 'pasto_entrada', header: 'Pasto Entrada' },
    { source: 'avaliacao_entrada', header: 'Avaliação Entrada', format: 'number' },
    { source: 'vaca', header: 'Vaca', format: 'number' },
    { source: 'touro', header: 'Touro', format: 'number' },
    { source: 'bezerro', header: 'Bezerro', format: 'number' },
    { source: 'boi_magro', header: 'Boi Magro', format: 'number' },
    { source: 'garrote', header: 'Garrote', format: 'number' },
    { source: 'novilha', header: 'Novilha', format: 'number' },
    { source: 'total_animais', header: 'Total Animais', format: 'number' },
    { source: 'escore_gado', header: 'Escore Gado', format: 'number' },
    { source: 'escore_fezes', header: 'Escore Fezes', format: 'number' },
    { source: 'numero_pessoas_manejo', header: 'Nº Pessoas Manejo', format: 'number' },
    { source: 'pasto_saida_area_util', header: 'Pasto Saída Área Útil' },
    { source: 'pasto_saida_especie', header: 'Pasto Saída Espécie' },
    { source: 'pasto_entrada_area_util', header: 'Pasto Entrada Área Útil' },
    { source: 'pasto_entrada_especie', header: 'Pasto Entrada Espécie' },
    { source: 'gado_contado', header: 'Gado Contado' },
    { source: 'avaliacao_geral', header: 'Animal Morto', transform: (value) => value?.animalMorto?.valor || '' },
    { source: 'avaliacao_geral', header: 'Animal Morto Obs', transform: (value) => value?.animalMorto?.observacao || '' },
    { source: 'avaliacao_geral', header: 'Bebedouros/Cochos', transform: (value) => value?.bebedourosCochos?.valor || '' },
    { source: 'avaliacao_geral', header: 'Bebedouros/Cochos Obs', transform: (value) => value?.bebedourosCochos?.observacao || '' },
    { source: 'avaliacao_geral', header: 'Carrapatos/Moscas', transform: (value) => value?.carrapatosMoscas?.valor || '' },
    { source: 'avaliacao_geral', header: 'Carrapatos/Moscas Obs', transform: (value) => value?.carrapatosMoscas?.observacao || '' },
    { source: 'avaliacao_geral', header: 'Animais Entreverados', transform: (value) => value?.animaisEntreverados?.valor || '' },
    { source: 'avaliacao_geral', header: 'Animais Entreverados Obs', transform: (value) => value?.animaisEntreverados?.observacao || '' },
    { source: 'avaliacao_geral', header: 'Pastagens Taxa Lotação Adequada', transform: (value) => value?.pastagensTaxaLotacao?.valor || '' },
    { source: 'avaliacao_geral', header: 'Pastagens Taxa Lotação Adequada Obs', transform: (value) => value?.pastagensTaxaLotacao?.observacao || '' },
    { source: 'avaliacao_geral', header: 'Cercas/Cochos/Porteiras', transform: (value) => value?.cercasCochosPorteiras?.valor || '' },
    { source: 'avaliacao_geral', header: 'Cercas/Cochos/Porteiras Obs', transform: (value) => value?.cercasCochosPorteiras?.observacao || '' },
    { source: 'avaliacao_geral', header: 'Animais Machucados/Doentes', transform: (value) => value?.animaisMachucadosDoentesBichados?.valor || '' },
    { source: 'avaliacao_geral', header: 'Animais Machucados/Doentes Obs', transform: (value) => value?.animaisMachucadosDoentesBichados?.observacao || '' },
    { source: 'equipe_nomes', header: 'Equipe Nomes', transform: (value) => Array.isArray(value) ? value.join(', ') : value }
  ]
}

export const ALMOXARIFADO_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_almoxarifado',
  sheetName: 'Almoxarifado',
  columns: [
    { source: 'data', header: 'Data', format: 'datetime' },
    { source: 'quem_entregou', header: 'Quem Entregou' },
    { source: 'quem_pegou', header: 'Quem Pegou' },
    { source: 'setor', header: 'Setor' },
    { source: 'itens', header: 'Itens', transform: (value) => {
      if (!value) return ''
      if (Array.isArray(value)) {
        return value.map((item: any) => {
          if (typeof item === 'string') return item
          if (item && typeof item === 'object') {
            const partes = Object.entries(item)
              .filter(([k]) => !(k === 'necessitaDevolucao' && item.prazoDevolucao))
              .map(([k, v]) => {
                const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
                return `${label}: ${v}`
              })
            return partes.join('; ')
          }
          return String(item)
        }).join(' | ')
      }
      if (typeof value === 'object') {
        return Object.entries(value)
          .filter(([k]) => !(k === 'necessitaDevolucao' && (value as any).prazoDevolucao))
          .map(([k, v]) => {
            const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
            return `${label}: ${v}`
          }).join('; ')
      }
      return String(value)
    }},
    { source: 'observacao', header: 'Observação' }
  ]
}

export const BEBEDOUROS_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_bebedouros',
  sheetName: 'Bebedouros',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'responsavel', header: 'Responsável' },
    { source: 'pasto', header: 'Pasto' },
    { source: 'lote', header: 'Lote' },
    { source: 'gado', header: 'Gado' },
    { source: 'categoria', header: 'Categoria' },
    { source: 'leitura_bebedouro', header: 'Leitura Bebedouro', format: 'number' },
    { source: 'numero_bebedouro', header: 'Nº Bebedouro' },
    { source: 'observacao', header: 'Observação' }
  ]
}

export const ENFERMARIA_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_enfermaria',
  sheetName: 'Enfermaria',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'pasto', header: 'Pasto' },
    { source: 'lote', header: 'Lote' },
    { source: 'brinco', header: 'Brinco' },
    { source: 'chip', header: 'Chip' },
    { source: 'categoria', header: 'Categoria' },
    { source: 'tratamento', header: 'Tratamento' },
    { source: 'tratamento_outros', header: 'Tratamento Outros' },
    { source: 'problema_casco', header: 'Problema de Casco', format: 'boolean' },
    { source: 'problema_casco_obs', header: 'Problema de Casco Obs' },
    { source: 'sintomas_pneumonia', header: 'Sintomas Pneumonia', format: 'boolean' },
    { source: 'sintomas_pneumonia_obs', header: 'Sintomas Pneumonia Obs' },
    { source: 'picado_cobra', header: 'Picado por Cobra', format: 'boolean' },
    { source: 'picado_cobra_obs', header: 'Picado por Cobra Obs' },
    { source: 'incoordenacao_tremores', header: 'Incoordenação/Tremores', format: 'boolean' },
    { source: 'incoordenacao_tremores_obs', header: 'Incoordenação/Tremores Obs' },
    { source: 'febre_alta', header: 'Febre Alta', format: 'boolean' },
    { source: 'febre_alta_obs', header: 'Febre Alta Obs' },
    { source: 'presenca_sangue', header: 'Presença de Sangue', format: 'boolean' },
    { source: 'presenca_sangue_obs', header: 'Presença de Sangue Obs' },
    { source: 'fraturas', header: 'Fraturas', format: 'boolean' },
    { source: 'fraturas_obs', header: 'Fraturas Obs' },
    { source: 'desordens_digestivas', header: 'Desordens Digestivas', format: 'boolean' },
    { source: 'desordens_digestivas_obs', header: 'Desordens Digestivas Obs' }
  ]
}

export const MANUTENCAO_MAQUINAS_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_manutencao_maquinas',
  sheetName: 'Manutenção de Máquinas',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'maquina', header: 'Máquina' },
    { source: 'tipo_manutencao', header: 'Tipo de Manutenção' },
    { source: 'descricao', header: 'Descrição' },
    { source: 'responsavel', header: 'Responsável' },
    { source: 'custo', header: 'Custo (R$)', format: 'number' },
    { source: 'status', header: 'Status' },
    { source: 'observacao', header: 'Observação' }
  ]
}

export const MOVIMENTACAO_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_movimentacao',
  sheetName: 'Movimentação',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'lote_origem', header: 'Lote Origem' },
    { source: 'lote_destino', header: 'Lote Destino' },
    { source: 'numero_cabecas', header: 'Nº Cabeças', format: 'number' },
    { source: 'peso_vivo_atual_kg', header: 'Peso Vivo Atual (kg)', format: 'number' },
    { source: 'vaca', header: 'Vaca', format: 'boolean' },
    { source: 'touro', header: 'Touro', format: 'boolean' },
    { source: 'boi_gordo', header: 'Boi Gordo', format: 'boolean' },
    { source: 'boi_magro', header: 'Boi Magro', format: 'boolean' },
    { source: 'garrote', header: 'Garrote', format: 'boolean' },
    { source: 'bezerro', header: 'Bezerro', format: 'boolean' },
    { source: 'novilha', header: 'Novilha', format: 'boolean' },
    { source: 'tropa', header: 'Tropa', format: 'boolean' },
    { source: 'outros', header: 'Outros', format: 'boolean' },
    { source: 'motivo_movimentacao', header: 'Motivo da Movimentação' },
    { source: 'brinco_chip', header: 'Brinco/Chip' },
    { source: 'causa_observacao', header: 'Causa/Observação' },
    { source: 'causa_morte', header: 'Causa Morte' }
  ]
}

export const PROBLEMAS_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_problemas',
  sheetName: 'Problemas',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'tipo_problema', header: 'Tipo de Problema' },
    { source: 'descricao', header: 'Descrição' },
    { source: 'local', header: 'Local' },
    { source: 'responsavel', header: 'Responsável' },
    { source: 'status', header: 'Status' },
    { source: 'prioridade', header: 'Prioridade' },
    { source: 'observacao', header: 'Observação' }
  ]
}

export const ABASTECIMENTO_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_abastecimento',
  sheetName: 'Abastecimento',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'quem_abasteceu', header: 'Quem Abasteceu' },
    { source: 'operador_motorista', header: 'Operador/Motorista' },
    { source: 'veiculo_trator', header: 'Veículo/Trator' },
    { source: 'placa', header: 'Placa' },
    { source: 'hidrometro_inicial', header: 'Hidrômetro Inicial', format: 'number' },
    { source: 'hidrometro_final', header: 'Hidrômetro Final', format: 'number' },
    { source: 'total_abastecido', header: 'Total Abastecido', format: 'number' },
    { source: 'combustivel', header: 'Combustível' },
    { source: 'odometro', header: 'Odômetro' },
    { source: 'tipo_operacao', header: 'Tipo de Operação' },
    { source: 'observacao', header: 'Observação' }
  ]
}

export const ALIMENTACAO_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_alimentacao',
  sheetName: 'Alimentação',
  columns: [
    { source: 'data', header: 'Data', format: 'datetime' },
    { source: 'modo', header: 'Modo' },
    { source: 'numero_cozinheiras', header: 'Nº Cozinheiras', format: 'number' },
    { source: 'quem_cozinhou', header: 'Quem Cozinhou' },
    { source: 'quem_ajudou', header: 'Quem Ajudou' },
    { source: 'numero_cafe_manha', header: 'Nº Café da Manhã', format: 'number' },
    { source: 'numero_lanches', header: 'Nº Lanches', format: 'number' },
    { source: 'numero_refeicoes_almoco', header: 'Nº Refeições Almoço', format: 'number' },
    { source: 'numero_refeicoes_jantar', header: 'Nº Refeições Jantar', format: 'number' },
    { source: 'fornecedor', header: 'Fornecedor' },
    { source: 'quantidade_marmitas', header: 'Quantidade Marmitas', format: 'number' },
    { source: 'preco_unitario', header: 'Preço Unitário (R$)', format: 'number' },
    { source: 'destinatario', header: 'Destinatário' },
    { source: 'itens', header: 'Itens', transform: (value) => {
      if (!Array.isArray(value)) return value ? String(value) : ''
      return value.map((item: any) => {
        const nome = item.nome || item.item || 'Item'
        const qtd = item.quantidade ?? '-'
        const unidade = item.unidade || ''
        return `${nome}: ${qtd} ${unidade}`.trim()
      }).join(' | ')
    }},
    { source: 'observacao', header: 'Observação' }
  ]
}

export const CANTINA_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_cantina',
  sheetName: 'Cantina',
  columns: [
    { source: 'data', header: 'Data', format: 'datetime' },
    { source: 'numero_cozinheiras', header: 'Nº Cozinheiras', format: 'number' },
    { source: 'quem_cozinhou', header: 'Quem Cozinhou' },
    { source: 'quem_ajudou', header: 'Quem Ajudou' },
    { source: 'numero_cafe_manha', header: 'Nº Café da Manhã', format: 'number' },
    { source: 'numero_lanches', header: 'Nº Lanches', format: 'number' },
    { source: 'numero_refeicoes_almoco', header: 'Nº Refeições Almoço', format: 'number' },
    { source: 'numero_refeicoes_jantar', header: 'Nº Refeições Jantar', format: 'number' },
    { source: 'itens', header: 'Itens', transform: (value) => {
      if (!Array.isArray(value)) return value ? String(value) : ''
      return value.map((item: any) => {
        const nome = item.nome || item.item || 'Item'
        const qtd = item.quantidade ?? '-'
        const unidade = item.unidade || ''
        return `${nome}: ${qtd} ${unidade}`.trim()
      }).join(' | ')
    }},
    { source: 'observacao', header: 'Observação' }
  ]
}

export const CLIMA_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_clima',
  sheetName: 'Clima',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'responsavel', header: 'Responsável' },
    { source: 'temperatura_media', header: 'Temperatura Média (°C)', format: 'number' },
    { source: 'medicoes', header: 'Medições', transform: (value) => {
      if (!Array.isArray(value)) return value ? String(value) : ''
      return value.map((m: any) => {
        const pluviometro = m.pluviometro_nome || 'Pluviômetro'
        const local = m.pluviometro_localizacao ? ` (${m.pluviometro_localizacao})` : ''
        const medicao = m.medicao !== undefined && m.medicao !== null ? `${m.medicao} mm` : 's/m'
        return `${pluviometro}${local}: ${medicao}`
      }).join(' | ')
    }},
    { source: 'observacao', header: 'Observação' }
  ]
}

export const LIMPEZA_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_limpeza',
  sheetName: 'Limpeza',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'numero_equipe', header: 'Nº Equipe', format: 'number' },
    { source: 'setor', header: 'Setor' },
    { source: 'local', header: 'Local' },
    { source: 'hora_inicio', header: 'Hora Início' },
    { source: 'hora_final', header: 'Hora Final' },
    { source: 'limpeza_realizada', header: 'Limpeza Realizada', transform: (value) => {
      if (!Array.isArray(value)) return value ? String(value) : ''
      return value.map((item: string) => item.charAt(0).toUpperCase() + item.slice(1)).join(', ')
    }},
    { source: 'observacao', header: 'Observação' }
  ]
}

export const MORTE_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_morte',
  sheetName: 'Morte',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'pasto', header: 'Pasto' },
    { source: 'lote', header: 'Lote' },
    { source: 'sexo', header: 'Sexo' },
    { source: 'raca', header: 'Raça' },
    { source: 'idade', header: 'Idade' },
    { source: 'peso_vivo', header: 'Peso Vivo (kg)', format: 'number' },
    { source: 'causa_morte', header: 'Causa da Morte' },
    { source: 'secrecao_orificios', header: 'Secreção Orifícios', format: 'boolean' },
    { source: 'secrecao_orificios_obs', header: 'Secreção Orifícios Obs' },
    { source: 'sintomas_pneumonia', header: 'Sintomas Pneumonia', format: 'boolean' },
    { source: 'sintomas_pneumonia_obs', header: 'Sintomas Pneumonia Obs' },
    { source: 'inchaco', header: 'Inchaço', format: 'boolean' },
    { source: 'inchaco_obs', header: 'Inchaço Obs' },
    { source: 'incoordenacao_tremores', header: 'Incoordenação/Tremores', format: 'boolean' },
    { source: 'incoordenacao_tremores_obs', header: 'Incoordenação/Tremores Obs' },
    { source: 'apatia_fraqueza', header: 'Apatia/Fraqueza', format: 'boolean' },
    { source: 'apatia_fraqueza_obs', header: 'Apatia/Fraqueza Obs' },
    { source: 'presenca_sangue', header: 'Presença de Sangue', format: 'boolean' },
    { source: 'presenca_sangue_obs', header: 'Presença de Sangue Obs' },
    { source: 'desordens_digestivas', header: 'Desordens Digestivas', format: 'boolean' },
    { source: 'desordens_digestivas_obs', header: 'Desordens Digestivas Obs' },
    { source: 'brinco', header: 'Brinco' },
    { source: 'chip', header: 'Chip' },
    { source: 'categoria', header: 'Categoria' },
    { source: 'categoria_outros', header: 'Categoria Outros' }
  ]
}

export const OPERACOES_MAQUINAS_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_operacoes_maquinas',
  sheetName: 'Operações de Máquinas',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'veiculo_trator', header: 'Veículo/Trator' },
    { source: 'implemento_utilizado', header: 'Implemento Utilizado' },
    { source: 'hora_inicial', header: 'Hora Inicial' },
    { source: 'hora_final', header: 'Hora Final' },
    { source: 'odometro_inicial', header: 'Odômetro Inicial' },
    { source: 'odometro_final', header: 'Odômetro Final' },
    { source: 'total_odometro', header: 'Total Odômetro' },
    { source: 'tipo_operacao', header: 'Tipo de Operação' },
    { source: 'produto_aplicado', header: 'Produto Aplicado' },
    { source: 'quantidade_total_aplicada', header: 'Quantidade Total Aplicada' },
    { source: 'area_trabalhada', header: 'Área Trabalhada' },
    { source: 'dose_aplicada', header: 'Dose Aplicada' },
    { source: 'meta_diaria_batida', header: 'Meta Diária Batida' },
    { source: 'meta_diaria_batida_obs', header: 'Meta Diária Batida Obs' },
    { source: 'algum_imprevisto', header: 'Algum Imprevisto' },
    { source: 'algum_imprevisto_obs', header: 'Algum Imprevisto Obs' },
    { source: 'observacao', header: 'Observação' }
  ]
}

export const SUPLEMENTACAO_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_suplementacao',
  sheetName: 'Suplementação',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'tratador', header: 'Tratador' },
    { source: 'pasto', header: 'Pasto' },
    { source: 'lote', header: 'Lote' },
    { source: 'formulacao', header: 'Formulação' },
    { source: 'gado', header: 'Gado' },
    { source: 'vaca', header: 'Vaca', format: 'boolean' },
    { source: 'touro', header: 'Touro', format: 'boolean' },
    { source: 'bezerro', header: 'Bezerro', format: 'boolean' },
    { source: 'boi', header: 'Boi', format: 'boolean' },
    { source: 'garrote', header: 'Garrote', format: 'boolean' },
    { source: 'novilha', header: 'Novilha', format: 'boolean' },
    { source: 'leitura', header: 'Leitura', format: 'number' },
    { source: 'sacos', header: 'Sacos', format: 'number' },
    { source: 'kg_cocho', header: 'Kg Cocho', format: 'number' },
    { source: 'kg_deposito', header: 'Kg Depósito', format: 'number' },
    { source: 'creep', header: 'Creep', format: 'number' }
  ]
}

export const RODEIO_EXPORT_CONFIG: TableExportConfig = {
  tableName: 'registros_rodeio',
  sheetName: 'Rodeio',
  columns: [
    { source: 'data', header: 'Data', format: 'date' },
    { source: 'pasto', header: 'Pasto' },
    { source: 'lote', header: 'Lote' },
    { source: 'vaca', header: 'Vaca', format: 'number' },
    { source: 'touro', header: 'Touro', format: 'number' },
    { source: 'bezerro', header: 'Bezerro', format: 'number' },
    { source: 'boi', header: 'Boi', format: 'number' },
    { source: 'garrote', header: 'Garrote', format: 'number' },
    { source: 'novilha', header: 'Novilha', format: 'number' },
    { source: 'total_cabecas', header: 'Total Cabeças', format: 'number' },
    { source: 'escore_gado', header: 'Escore Gado', format: 'number' },
    { source: 'escore_fezes', header: 'Escore Fezes', format: 'number' },
    { source: 'equipe', header: 'Equipe (nº pessoas)', format: 'number' },
    { source: 'gado_contado', header: 'Gado Contado' },
    { source: 'diagnosticos', header: 'Animal Morto', transform: (value) => value?.animalMorto?.valor || '' },
    { source: 'diagnosticos', header: 'Animal Morto Obs', transform: (value) => value?.animalMorto?.observacao || '' },
    { source: 'diagnosticos', header: 'Bebedouros/Cochos', transform: (value) => value?.bebedourosCochos?.valor || '' },
    { source: 'diagnosticos', header: 'Bebedouros/Cochos Obs', transform: (value) => value?.bebedourosCochos?.observacao || '' },
    { source: 'diagnosticos', header: 'Carrapatos/Moscas', transform: (value) => value?.carrapatosMoscas?.valor || '' },
    { source: 'diagnosticos', header: 'Carrapatos/Moscas Obs', transform: (value) => value?.carrapatosMoscas?.observacao || '' },
    { source: 'diagnosticos', header: 'Animais Entreverados', transform: (value) => value?.animaisEntreverados?.valor || '' },
    { source: 'diagnosticos', header: 'Animais Entreverados Obs', transform: (value) => value?.animaisEntreverados?.observacao || '' },
    { source: 'diagnosticos', header: 'Pastagens Taxa Lotação Adequada', transform: (value) => value?.pastagensTaxaLotacao?.valor || '' },
    { source: 'diagnosticos', header: 'Pastagens Taxa Lotação Adequada Obs', transform: (value) => value?.pastagensTaxaLotacao?.observacao || '' },
    { source: 'diagnosticos', header: 'Cercas/Cochos/Porteiras', transform: (value) => value?.cercasCochosPorteiras?.valor || '' },
    { source: 'diagnosticos', header: 'Cercas/Cochos/Porteiras Obs', transform: (value) => value?.cercasCochosPorteiras?.observacao || '' },
    { source: 'diagnosticos', header: 'Animais Machucados/Doentes', transform: (value) => value?.animaisMachucadosDoentesBichados?.valor || '' },
    { source: 'diagnosticos', header: 'Animais Machucados/Doentes Obs', transform: (value) => value?.animaisMachucadosDoentesBichados?.observacao || '' },
    { source: 'equipe_nomes', header: 'Equipe Nomes', transform: (value) => Array.isArray(value) ? value.join(', ') : value },
    { source: 'procedimentos', header: 'Procedimentos', transform: (value) => Array.isArray(value) ? value.join(', ') : value || '' }
  ]
}
