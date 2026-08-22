import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface MultiSelectOption {
  id: string
  name: string
  category?: string
  subtitle?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  label?: string
  required?: boolean
  compact?: boolean
}

// Function to remove accents from a string
const removeAccents = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  label,
  required = false,
  compact = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dropUp, setDropUp] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const dropdownRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search term (accent-insensitive)
  const filteredOptions = options.filter(
    (item) =>
      removeAccents(item.name).includes(removeAccents(searchTerm)) ||
      (item.subtitle && removeAccents(item.subtitle).includes(removeAccents(searchTerm)))
  )

  // Get selected options
  const selectedOptions = options.filter((opt) => value.includes(opt.id))

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = Math.min(options.length * 40 + 62, 300)

    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      setDropUp(false)
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    } else {
      setDropUp(true)
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
    if (isOpen) {
      updatePosition()
      // Foca o input sem rolar a página (autoFocus causa scroll indesejado em portais fixed)
      setTimeout(() => searchInputRef.current?.focus({ preventScroll: true }), 0)
    }
  }, [isOpen, updatePosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        portalRef.current && !portalRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    const handleScroll = () => {
      if (isOpen) updatePosition()
    }

    const handleResize = () => {
      if (isOpen) updatePosition()
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, updatePosition])

  const handleToggle = (optionId: string) => {
    if (value.includes(optionId)) {
      onChange(value.filter((id) => id !== optionId))
    } else {
      onChange([...value, optionId])
    }
  }

  const handleRemove = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((id) => id !== optionId))
  }

  return (
    <div className={compact ? '' : 'mb-4'}>
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm sm:text-base text-left border-gray-200 focus:border-accent bg-white ${className}`}
        >
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedOptions.slice(0, 6).map((opt) => (
                <span
                  key={opt.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                >
                  {opt.name}
                  <span
                    role="button"
                    aria-label={`Remover ${opt.name}`}
                    tabIndex={0}
                    onMouseDown={(e) => { e.stopPropagation(); handleRemove(opt.id, e as any) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange(value.filter((id) => id !== opt.id)) } }}
                    className="text-blue-500 hover:text-blue-700 focus:outline-none cursor-pointer"
                  >
                    ×
                  </span>
                </span>
              ))}
              {selectedOptions.length > 3 && (
                <span className="text-xs text-gray-500">+{selectedOptions.length - 3} mais</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>

        {/* Dropdown via portal */}
        {isOpen && createPortal(
          <div
            ref={portalRef}
            className={`bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-auto ${dropUp ? 'mb-1' : 'mt-1'}`}
            style={dropdownStyle}
          >
            {/* Search input */}
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    e.preventDefault()
                    const first = filteredOptions[0]
                    handleToggle(first.id)
                    setSearchTerm('')
                  }
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-accent text-sm"
              />
            </div>

            {/* Options */}
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nenhum resultado encontrado
              </div>
            ) : (
              <div>
                {filteredOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggle(item.id)}
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                      value.includes(item.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        value.includes(item.id)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {value.includes(item.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        {item.subtitle && (
                          <div className="text-xs text-gray-500">{item.subtitle}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      {/* Selected tags (full list) */}
      {selectedOptions.length > 0 && isOpen && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedOptions.map((opt) => (
            <span
              key={opt.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
            >
              {opt.name}
              <button
                type="button"
                onClick={(e) => handleRemove(opt.id, e)}
                className="text-blue-500 hover:text-blue-700 focus:outline-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Validation message */}
      {required && value.length === 0 && (
        <p className="text-red-500 text-xs mt-1">Selecione pelo menos uma opção</p>
      )}
    </div>
  )
}
