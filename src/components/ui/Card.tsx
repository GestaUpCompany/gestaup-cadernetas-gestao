interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disableHover?: boolean
}

export function Card({ children, className = '', onClick, disableHover = false }: CardProps) {
  const hoverClasses = disableHover 
    ? '' 
    : 'transition-all duration-200'
  const onClickHover = onClick ? 'cursor-pointer' : ''
  
  return (
    <div 
      className={`bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 ${hoverClasses} ${onClick ? onClickHover : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
