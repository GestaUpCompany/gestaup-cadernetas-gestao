import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

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
  error?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  label,
  required = false,
  error,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = Math.min(options.length * 38 + 8, 240)

    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    } else {
      setDropdownStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
  }, [options.length])

  useEffect(() => {
    if (isOpen) updatePosition()
  }, [isOpen, updatePosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    const handleScroll = () => {
      if (isOpen) updatePosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [isOpen, updatePosition])

  const handleSelect = (option: SelectOption) => {
    onChange?.(option.value)
    setIsOpen(false)
  }

  return (
    <div className="mb-4">
      {label && (
        <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {/* Trigger button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm sm:text-base text-left bg-white ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${className}`}
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

        {/* Dropdown rendered via portal to escape overflow:hidden parents */}
        {isOpen && createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto"
          >
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
          </div>,
          document.body
        )}
      </div>
      {error && (
        <p className="text-xs sm:text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
