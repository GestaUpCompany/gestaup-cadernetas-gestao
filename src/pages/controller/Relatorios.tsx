import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { getFazendaIdForUser } from '../../utils/fazendaContext'

interface RelatorioPublico {
  id: string
  tipo: string
  titulo: string
  criado_em: string
  expira_em: string | null
  ativo: boolean
}

interface RelatorioDisponivel {
  tipo: string
  titulo: string
  descricao: string
  icone: string
  rotaPdf?: string
}

const RELATORIOS_DISPONIVEIS: RelatorioDisponivel[] = [
  {
    tipo: 'abastecimento',
    titulo: 'Abastecimento',
    descricao: 'Consumo de combustível por máquina/veículo, tipo de combustível e operação.',
    icone: '⛽',
  },
  {
    tipo: 'gado',
    titulo: 'Gado',
    descricao: 'Relatório geral do rebanho com gráficos de distribuição.',
    icone: '🐄',
    rotaPdf: '/controller/relatorios/gado',
  },
  {
    tipo: 'saude',
    titulo: 'Saúde',
    descricao: 'Relatório sanitário com tratamentos e ocorrências.',
    icone: '💊',
    rotaPdf: '/controller/relatorios/saude',
  },
]

export function Relatorios() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [fazendaId, setFazendaId] = useState<string | null>(null)
  const [linksAtivos, setLinksAtivos] = useState<RelatorioPublico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [relatorioSelecionado, setRelatorioSelecionado] = useState<RelatorioDisponivel | null>(null)
  const [tituloLink, setTituloLink] = useState('')
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (user) {
      carregarFazenda()
    }
  }, [user])

  const carregarFazenda = async () => {
    if (!user) return
    const fid = await getFazendaIdForUser(user.id)
    setFazendaId(fid)
    if (fid) {
      await carregarLinks(fid)
    }
    setLoading(false)
  }

  const carregarLinks = async (fid: string) => {
    const { data, error } = await supabase
      .from('relatorios_publicos')
      .select('id, tipo, titulo, criado_em, expira_em, ativo')
      .eq('fazenda_id', fid)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao carregar links:', error)
    } else {
      setLinksAtivos(data as RelatorioPublico[])
    }
  }

  const abrirModalGerarLink = (rel: RelatorioDisponivel) => {
    setRelatorioSelecionado(rel)
    setTituloLink(rel.titulo)
    setLinkGerado(null)
    setCopiado(false)
    setModalAberto(true)
  }

  const gerarLink = async () => {
    if (!fazendaId || !relatorioSelecionado || !user) return

    const { data, error } = await supabase
      .from('relatorios_publicos')
      .insert({
        fazenda_id: fazendaId,
        tipo: relatorioSelecionado.tipo,
        titulo: tituloLink.trim() || relatorioSelecionado.titulo,
        criado_por: user.id,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Erro ao gerar link:', error)
      alert('Erro ao gerar link. Tente novamente.')
      return
    }

    const url = `${window.location.origin}/r/${data.id}`
    setLinkGerado(url)
    await carregarLinks(fazendaId)
  }

  const copiarLink = async () => {
    if (!linkGerado) return
    try {
      await navigator.clipboard.writeText(linkGerado)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  const desativarLink = async (id: string) => {
    if (!fazendaId) return
    if (!confirm('Desativar este link público? O relatório não será mais acessível.')) return

    const { error } = await supabase
      .from('relatorios_publicos')
      .update({ ativo: false })
      .eq('id', id)

    if (error) {
      console.error('Erro ao desativar link:', error)
      alert('Erro ao desativar link.')
    } else {
      await carregarLinks(fazendaId)
    }
  }

  const reativarLink = async (id: string) => {
    if (!fazendaId) return

    const { error } = await supabase
      .from('relatorios_publicos')
      .update({ ativo: true })
      .eq('id', id)

    if (error) {
      console.error('Erro ao reativar link:', error)
      alert('Erro ao reativar link.')
    } else {
      await carregarLinks(fazendaId)
    }
  }

  const excluirLink = async (id: string) => {
    if (!fazendaId) return
    if (!confirm('Excluir este link público definitivamente? Esta ação não pode ser desfeita.')) return

    const { error } = await supabase
      .from('relatorios_publicos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir link:', error)
      alert('Erro ao excluir link.')
    } else {
      await carregarLinks(fazendaId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-3"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600 mt-1">
          Gere relatórios em PDF ou crie links públicos interativos para compartilhar.
        </p>
      </div>

      {/* Relatórios disponíveis */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Relatórios disponíveis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {RELATORIOS_DISPONIVEIS.map((rel) => (
            <div
              key={rel.tipo}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-3xl">{rel.icone}</div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{rel.titulo}</h3>
              <p className="text-sm text-gray-600 mb-4">{rel.descricao}</p>
              <div className="flex flex-col gap-2">
                {rel.rotaPdf && (
                  <button
                    onClick={() => navigate(rel.rotaPdf!)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Abrir relatório PDF
                  </button>
                )}
                <button
                  onClick={() => abrirModalGerarLink(rel)}
                  className="w-full rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors"
                >
                  Gerar link público
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Links ativos */}
      {linksAtivos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Links públicos ({linksAtivos.filter((l) => l.ativo).length} ativos de {linksAtivos.length})
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Título</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Criado em</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {linksAtivos.map((link) => (
                  <tr key={link.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-900 font-medium">{link.titulo}</td>
                    <td className="py-3 px-4 text-gray-600 capitalize">{link.tipo}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(link.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      {link.ativo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {link.ativo ? (
                          <>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/r/${link.id}`
                                navigator.clipboard.writeText(url)
                                alert('Link copiado: ' + url)
                              }}
                              className="text-xs text-green-700 hover:text-green-800 font-medium"
                            >
                              Copiar link
                            </button>
                            <button
                              onClick={() => desativarLink(link.id)}
                              className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                            >
                              Desativar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => reativarLink(link.id)}
                              className="text-xs text-green-700 hover:text-green-800 font-medium"
                            >
                              Reativar
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => excluirLink(link.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de geração de link */}
      {modalAberto && relatorioSelecionado && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Gerar link público
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {relatorioSelecionado.icone} {relatorioSelecionado.titulo}
                </p>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!linkGerado ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título do relatório
                  </label>
                  <input
                    type="text"
                    value={tituloLink}
                    onChange={(e) => setTituloLink(e.target.value)}
                    placeholder="Ex: Relatório de abastecimento - Janeiro"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:ring-1 focus:ring-green-600"
                  />
                </div>

                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-800">
                    O link será público e acessível por qualquer pessoa que o tenha.
                    Não é necessário login. Você pode desativar o link a qualquer momento.
                  </p>
                </div>

                <button
                  onClick={gerarLink}
                  className="w-full rounded-lg bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800 transition-colors"
                >
                  Gerar link
                </button>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link gerado
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={linkGerado}
                      readOnly
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50"
                    />
                    <button
                      onClick={copiarLink}
                      className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 transition-colors whitespace-nowrap"
                    >
                      {copiado ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <a
                  href={linkGerado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-2"
                >
                  Abrir relatório
                </a>

                <button
                  onClick={() => setModalAberto(false)}
                  className="block w-full text-center text-sm text-gray-500 hover:text-gray-700"
                >
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
