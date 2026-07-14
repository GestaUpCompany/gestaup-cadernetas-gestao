interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm ${
          error ? 'border-red-500' : 'border-gray-200 focus:border-accent'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs sm:text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
