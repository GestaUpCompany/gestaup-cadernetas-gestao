interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disableHover?: boolean
}

export function Card({ children, className = '', onClick, disableHover = false }: CardProps) {
  const hoverClasses = disableHover 
    ? '' 
    : 'transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/30'
  const onClickHover = onClick ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2' : ''
  
  return (
    <div 
      className={`bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 ${hoverClasses} ${onClick ? onClickHover : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
