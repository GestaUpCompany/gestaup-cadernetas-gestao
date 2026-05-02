interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
