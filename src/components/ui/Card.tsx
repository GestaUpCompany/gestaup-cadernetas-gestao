interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 ${className}`}>
      {children}
    </div>
  )
}
