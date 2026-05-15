import { ReactNode } from 'react'
import { Card } from './Card'

interface CardItemProps {
  title: string
  subtitle?: string | ReactNode
  status?: boolean
  statusLabel?: 'Ativo' | 'Inativo'
  headerActions?: ReactNode
  onClick?: () => void
  children?: ReactNode
  className?: string
}

export function CardItem({
  title,
  subtitle,
  status,
  statusLabel = 'Ativo',
  headerActions,
  onClick,
  children,
  className = '',
}: CardItemProps) {
  return (
    <Card
      className={`bg-white p-6 border-0 shadow-sm cursor-pointer transition-all ${onClick ? '' : 'cursor-default'} ${className}`}
      onClick={onClick}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {headerActions}
          {status !== undefined && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium self-start md:self-auto ${
                status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {status ? statusLabel : 'Inativo'}
            </span>
          )}
        </div>
      </div>
      {children}
    </Card>
  )
}
