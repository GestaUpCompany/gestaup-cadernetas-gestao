import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { useFazenda } from '../../hooks/useDashboardQueries'
import { setSelectedFazendaId, getSelectedFazendaId } from '../../utils/fazendaContext'
import { Modal } from '../ui'

interface FazendaSimplificada {
  id: string
  nome: string
  acesso_id: string
  grupo_id: string | null
}

interface GrupoInfo {
  id: string
  nome: string
}

export function FarmSwitcher() {
  const { user } = useAuth()
  const { data: fazenda } = useFazenda(user?.id)
  const [grupo, setGrupo] = useState<GrupoInfo | null>(null)
  const [fazendasDoGrupo, setFazendasDoGrupo] = useState<FazendaSimplificada[]>([])
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [selectedFazenda, setSelectedFazenda] = useState<FazendaSimplificada | null>(null)
  const [password, setPassword] = useState('')
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!fazenda?.grupo_id) {
      setGrupo(null)
      setFazendasDoGrupo([])
      return
    }

    const loadData = async () => {
      const { data: grupoData } = await supabase
        .from('grupos_fazenda')
        .select('id, nome')
        .eq('id', fazenda.grupo_id!)
        .single()

      if (grupoData) setGrupo(grupoData)

      const { data: fazendasData } = await supabase
        .from('fazendas')
        .select('id, nome, acesso_id, grupo_id')
        .eq('grupo_id', fazenda.grupo_id!)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (fazendasData) setFazendasDoGrupo(fazendasData)
    }

    loadData()
  }, [fazenda?.grupo_id])

  const currentFazendaId = getSelectedFazendaId() || fazenda?.id

  const outrasFazendas = fazendasDoGrupo.filter(f => f.id !== currentFazendaId)

  const handleSwitchClick = (target: FazendaSimplificada) => {
    setSelectedFazenda(target)
    setPassword('')
    setError('')
    setShowSwitchModal(true)
  }

  const handleSwitch = async () => {
    if (!selectedFazenda || !user) return
    setSwitching(true)
    setError('')

    try {
      // Buscar o controller da fazenda de destino
      const { data: vinculos } = await supabase
        .from('usuario_fazenda')
        .select('usuario_id')
        .eq('fazenda_id', selectedFazenda.id)
        .eq('ativo', true)

      if (!vinculos || vinculos.length === 0) {
        setError('Nenhum controller encontrado para esta fazenda')
        setSwitching(false)
        return
      }

      // Buscar email do controller da fazenda de destino
      const { data: userData } = await supabase
        .from('usuarios')
        .select('email')
        .eq('id', vinculos[0].usuario_id)
        .single()

      if (!userData?.email) {
        setError('Email do controller não encontrado')
        setSwitching(false)
        return
      }

      // Fazer signOut do usuário atual
      await supabase.auth.signOut()

      // Fazer signIn com o controller da fazenda de destino
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password,
      })

      if (authError) {
        setError('Senha incorreta')
        setSwitching(false)
        return
      }

      // Atualizar o selectedFazendaId no localStorage
      setSelectedFazendaId(selectedFazenda.id)

      // Recarregar a página para re-inicializar o contexto
      window.location.href = '/controller/dashboard'
    } catch (err) {
      setError('Erro ao trocar de fazenda')
      setSwitching(false)
    }
  }

  if (!grupo) return null

  return (
    <>
      <div className="border-t-2 border-gray-200 p-4">
        <div className="bg-blue-50 p-3 rounded-lg space-y-2">
          <div>
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Grupo</p>
            <p className="text-sm font-medium text-gray-800 truncate">{grupo.nome}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Fazenda atual</p>
            <p className="text-sm font-medium text-gray-800 truncate">{fazenda?.nome || '...'}</p>
          </div>
          {outrasFazendas.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Trocar para:</p>
              <div className="space-y-1">
                {outrasFazendas.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleSwitchClick(f)}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-blue-100 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="truncate">{f.nome}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showSwitchModal}
        onClose={() => setShowSwitchModal(false)}
        title="Trocar de Fazenda"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Você está prestes a trocar para a fazenda:
            </p>
            <p className="font-bold text-gray-800">{selectedFazenda?.nome}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha do Controller *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha"
              autoFocus
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password && !switching) {
                  handleSwitch()
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              O email do controller desta fazenda já é conhecido. Você só precisa digitar a senha.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowSwitchModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSwitch}
              disabled={switching || !password}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
            >
              {switching ? 'Trocando...' : 'Trocar Fazenda'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
