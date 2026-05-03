import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui'

export function Cadernetas() {
  const navigate = useNavigate()

  const cadernetas = [
    {
      title: 'Maternidade',
      description: 'Registros de nascimentos e partos',
      icon: '🐄',
      path: '/controller/maternidade',
      color: 'bg-green-500',
    },
    {
      title: 'Enfermaria',
      description: 'Registros de tratamentos e enfermidades',
      icon: '🏥',
      path: '/controller/enfermaria',
      color: 'bg-red-500',
    },
    {
      title: 'Pastagens',
      description: 'Registros de manejo de pastagens',
      icon: '🌾',
      path: '/controller/pastagens-caderneta',
      color: 'bg-yellow-500',
    },
    {
      title: 'Rodeio',
      description: 'Registros de manejos e rodeios',
      icon: '🤠',
      path: '/controller/rodeio',
      color: 'bg-blue-500',
    },
    {
      title: 'Suplementação',
      description: 'Registros de suplementação alimentar',
      icon: '🥄',
      path: '/controller/suplementacao',
      color: 'bg-orange-500',
    },
    {
      title: 'Bebedouros',
      description: 'Registros de leitura de bebedouros',
      icon: '💧',
      path: '/controller/bebedouros',
      color: 'bg-cyan-500',
    },
    {
      title: 'Movimentação',
      description: 'Registros de movimentação de animais',
      icon: '🔄',
      path: '/controller/movimentacao',
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Cadernetas</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cadernetas.map((caderneta) => (
          <Card
            key={caderneta.path}
            className="bg-white p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(caderneta.path)}
          >
            <div className={`${caderneta.color} w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4`}>
              {caderneta.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{caderneta.title}</h3>
            <p className="text-sm text-gray-600">{caderneta.description}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
