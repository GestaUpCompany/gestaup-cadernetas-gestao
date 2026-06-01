import { useState, useRef, useEffect } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  label?: string
  required?: boolean
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  label,
  required = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option: SelectOption) => {
    onChange?.(option.value)
    setIsOpen(false)
  }

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm sm:text-base text-left border-gray-300 border-gray-200 focus:border-accent bg-white ${className}`}
        >
          {selectedOption ? (
            <span>{selectedOption.label}</span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
          <svg
            className={`w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {options.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nenhuma opção disponível
              </div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    value === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
