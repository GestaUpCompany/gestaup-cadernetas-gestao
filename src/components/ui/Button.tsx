interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  children: React.ReactNode
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 hover-scale-sm button-press'
  
  const variantStyles = {
    primary: 'bg-primary text-white focus:ring-primary hover:shadow-md',
    secondary: 'bg-gray-200 text-gray-800 focus:ring-gray-500 hover:shadow-md hover:bg-gray-300',
    danger: 'bg-red-600 text-white focus:ring-red-500 hover:shadow-md hover:bg-red-700',
  }

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
