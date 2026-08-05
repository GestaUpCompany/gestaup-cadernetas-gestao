import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../../contexts/AuthContext'
import { useFazenda } from '../../hooks/useDashboardQueries'
import { Card, Button } from '../../components/ui'
import { enviarPerguntaIA, ChatResposta } from '../../services/chatIAService'

interface Mensagem {
  id: string
  tipo: 'usuario' | 'ia' | 'erro'
  texto: string
  funcoes?: string[]
  tokens?: { input: number; output: number; cached: number }
  timestamp: Date
}

const FAZENDA_TESTE_ID = 'd649c65e-16ab-4b77-a84b-df937aa41cc3'

const SUGESTOES_PERGUNTAS = [
  'Qual foi a média de trato em kg do lote Boi Magro nos últimos 30 dias?',
  'Qual o peso médio atual de todos os lotes ativos?',
  'Quantas mortes tivemos nos últimos 90 dias e quais as principais causas?',
  'Quais foram as movimentações dos últimos 30 dias?',
]

export function AssistenteIA() {
  const { user } = useAuth()
  const { data: fazenda } = useFazenda(user?.id)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isFazendaTeste = fazenda?.id === FAZENDA_TESTE_ID

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const handleEnviar = async (pergunta?: string) => {
    const texto = (pergunta || input).trim()
    if (!texto || loading) return

    const msgUsuario: Mensagem = {
      id: crypto.randomUUID(),
      tipo: 'usuario',
      texto,
      timestamp: new Date(),
    }
    setMensagens((prev) => [...prev, msgUsuario])
    setInput('')
    setLoading(true)

    try {
      const resultado: ChatResposta = await enviarPerguntaIA(texto)
      const msgIA: Mensagem = {
        id: crypto.randomUUID(),
        tipo: 'ia',
        texto: resultado.resposta,
        funcoes: resultado.funcoes_chamadas,
        tokens: resultado.tokens,
        timestamp: new Date(),
      }
      setMensagens((prev) => [...prev, msgIA])
    } catch (err) {
      const msgErro: Mensagem = {
        id: crypto.randomUUID(),
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao processar pergunta.',
        timestamp: new Date(),
      }
      setMensagens((prev) => [...prev, msgErro])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  if (!isFazendaTeste) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Assistente de IA indisponível</h2>
          <p className="text-sm text-gray-500">
            O assistente de IA está em fase de protótipo e ainda não está disponível para esta fazenda.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Assistente de IA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pergunte qualquer coisa sobre a fazenda. A IA consulta os dados reais do sistema e responde.
        </p>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-amber-700 font-medium">Protótipo em teste</span>
        </div>
      </div>

      <Card className="flex flex-col h-[65vh] min-h-[400px]">
        {/* Área de mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {mensagens.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 3v-3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Faça sua pergunta</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md">
                Posso analisar dados de suplementação, peso dos lotes, mortalidade e movimentações.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl">
                {SUGESTOES_PERGUNTAS.map((sugestao) => (
                  <button
                    key={sugestao}
                    onClick={() => handleEnviar(sugestao)}
                    disabled={loading}
                    className="text-left p-3 rounded-lg border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors text-sm text-gray-600 disabled:opacity-50"
                  >
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          )}

          {mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.tipo === 'usuario'
                    ? 'bg-primary text-white'
                    : msg.tipo === 'erro'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-sm">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="my-1 whitespace-pre-wrap">{children}</p>,
                      ul: ({ children }) => <ul className="my-1 list-disc pl-4">{children}</ul>,
                      ol: ({ children }) => <ol className="my-1 list-decimal pl-4">{children}</ol>,
                      li: ({ children }) => <li className="my-0.5">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-sm font-bold my-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                    }}
                  >
                    {msg.texto}
                  </ReactMarkdown>
                </div>
                {msg.funcoes && msg.funcoes.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200/50">
                    <p className="text-xs opacity-70 mb-1">Funções consultadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.funcoes.map((f, idx) => (
                        <span
                          key={`${f}-${idx}`}
                          className={`text-xs px-2 py-0.5 rounded ${
                            msg.tipo === 'usuario' ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {msg.tokens && (
                  <p className={`text-xs mt-1 ${msg.tipo === 'usuario' ? 'text-white/60' : 'text-gray-400'}`}>
                    {msg.tokens.input + msg.tokens.output} tokens{msg.tokens.cached > 0 ? ` · ${msg.tokens.cached} cached` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Área de input */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta sobre a fazenda..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50"
              style={{ maxHeight: '120px' }}
            />
            <Button
              onClick={() => handleEnviar()}
              disabled={loading || !input.trim()}
              className="flex-shrink-0"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={3} className="opacity-25" />
                  <path strokeLinecap="round" strokeWidth={3} d="M4 12a8 8 0 018-8" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Enter envia, Shift+Enter quebra linha. A IA consulta apenas dados desta fazenda.
          </p>
        </div>
      </Card>
    </div>
  )
}
