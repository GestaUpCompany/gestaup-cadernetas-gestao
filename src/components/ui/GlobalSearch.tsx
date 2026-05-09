import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../services/supabaseClient'

interface SearchResult {
  id: string
  type: string
  label: string
  subtitle?: string
  url: string
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
        inputRef.current?.focus()
      }
      if (event.key === '/' && !isOpen) {
        event.preventDefault()
        setIsOpen(true)
        inputRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleShortcut)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleShortcut)
    }
  }, [isOpen])

  useEffect(() => {
    const searchDelay = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setResults([])
        setLoading(false)
        return
      }

      setLoading(true)

      if (!user) {
        setLoading(false)
        return
      }

      const { data: vinculos } = await supabase
        .from('usuario_fazenda')
        .select('fazenda_id')
        .eq('usuario_id', user.id)
        .eq('ativo', true)

      if (!vinculos || vinculos.length === 0) {
        setLoading(false)
        return
      }

      const fazendaId = vinculos[0].fazenda_id
      const searchResults: SearchResult[] = []

      // Buscar em pastos
      const { data: pastos } = await supabase
        .from('pastos')
        .select('id, nome')
        .eq('fazenda_id', fazendaId)
        .ilike('nome', `%${searchTerm}%`)
        .limit(5)

      pastos?.forEach(pasto => {
        searchResults.push({
          id: pasto.id,
          type: 'Pasto',
          label: pasto.nome,
          url: '/controller/pastos'
        })
      })

      // Buscar em lotes
      const { data: lotes } = await supabase
        .from('lotes')
        .select('id, nome')
        .eq('fazenda_id', fazendaId)
        .ilike('nome', `%${searchTerm}%`)
        .limit(5)

      lotes?.forEach(lote => {
        searchResults.push({
          id: lote.id,
          type: 'Lote',
          label: lote.nome,
          url: '/controller/lotes'
        })
      })

      // Buscar em bebedouros
      const { data: bebedouros } = await supabase
        .from('bebedouros')
        .select('id, nome')
        .eq('fazenda_id', fazendaId)
        .ilike('nome', `%${searchTerm}%`)
        .limit(5)

      bebedouros?.forEach(bebedouro => {
        searchResults.push({
          id: bebedouro.id,
          type: 'Bebedouro',
          label: bebedouro.nome,
          url: '/controller/bebedouros'
        })
      })

      // Buscar em pluviometros
      const { data: pluviometros } = await supabase
        .from('pluviometros')
        .select('id, nome')
        .eq('fazenda_id', fazendaId)
        .ilike('nome', `%${searchTerm}%`)
        .limit(5)

      pluviometros?.forEach(pluviometro => {
        searchResults.push({
          id: pluviometro.id,
          type: 'Pluviômetro',
          label: pluviometro.nome,
          url: '/controller/pluviometros'
        })
      })

      // Buscar em funcionarios
      const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('id, nome')
        .eq('fazenda_id', fazendaId)
        .ilike('nome', `%${searchTerm}%`)
        .limit(5)

      funcionarios?.forEach(funcionario => {
        searchResults.push({
          id: funcionario.id,
          type: 'Funcionário',
          label: funcionario.nome,
          url: '/controller/funcionarios'
        })
      })

      setResults(searchResults)
      setLoading(false)
    }, 300)

    return () => clearTimeout(searchDelay)
  }, [searchTerm, user])

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="relative" ref={searchRef}>
      <button
        onClick={() => {
          setIsOpen(true)
          inputRef.current?.focus()
        }}
        className="flex items-center gap-2 px-4 py-2 bg-white/10  rounded-lg transition-all text-white"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden md:inline">Buscar...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-white/20 rounded">
          <span>⌘ + </span>
          <span>K</span>
          <span className="mx-1">/</span>
          <span>Ctrl + </span>
          <span>K</span>
        </kbd>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-scale-in z-50">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite para buscar..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Pesquise em: Pastos, Lotes, Bebedouros, Pluviômetros, Funcionários
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="p-4 text-center text-gray-500">
                <svg className="animate-spin h-6 w-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Buscando...
              </div>
            )}

            {!loading && searchTerm.length < 2 && (
              <div className="p-4 text-center text-gray-500">
                <p>Digite pelo menos 2 caracteres para buscar</p>
                <p className="text-sm mt-2 text-gray-400">Pressione ESC para fechar</p>
              </div>
            )}

            {!loading && searchTerm.length >= 2 && results.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                <p>Nenhum resultado encontrado para "{searchTerm}"</p>
              </div>
            )}

            {!loading && searchTerm.length >= 2 && results.length > 0 && (
              <div>
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 text-left transition-all flex items-center gap-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{result.label}</p>
                      <p className="text-sm text-gray-500">{result.type}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
