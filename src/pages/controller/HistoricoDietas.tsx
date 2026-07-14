import { Card } from '../../components/ui'

export function HistoricoDietas() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Histórico de Dietas</h2>
        <p className="text-sm text-gray-500">Acompanhamento das trocas de dieta nos currais.</p>
      </div>

      <Card className="bg-amber-50 border-amber-200 p-8 text-center">
        <p className="text-lg font-semibold text-amber-700">Em desenvolvimento</p>
        <p className="text-sm text-amber-600 mt-2">
          Esta tela estará disponível em breve.
        </p>
      </Card>
    </div>
  )
}
