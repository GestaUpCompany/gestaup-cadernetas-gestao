import { useState, useRef, useEffect } from 'react'

interface GroupedOption {
  id: string
  name: string
  category: string
}

interface GroupedSelectProps {
  options: GroupedOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  label?: string
}

// Function to remove accents from a string
const removeAccents = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function GroupedSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  className = '',
  label,
}: GroupedSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Group options by category
  const groupedOptions = options.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = []
    }
    acc[option.category].push(option)
    return acc
  }, {} as Record<string, GroupedOption[]>)

  // Filter options based on search term (accent-insensitive)
  const filteredGroups = Object.entries(groupedOptions).reduce(
    (acc, [category, items]) => {
      const normalizedSearchTerm = removeAccents(searchTerm)
      const filteredItems = items.filter(
        (item) =>
          removeAccents(item.name).includes(normalizedSearchTerm) ||
          removeAccents(category).includes(normalizedSearchTerm)
      )
      if (filteredItems.length > 0) {
        acc[category] = filteredItems
      }
      return acc
    },
    {} as Record<string, GroupedOption[]>
  )

  // Get selected option
  const selectedOption = options.find((opt) => opt.name === value)

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

  const handleSelect = (option: GroupedOption) => {
    onChange?.(option.name)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="relative" ref={dropdownRef}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary input-focus min-h-[44px] text-sm text-left border-gray-200 focus:border-accent bg-white ${className}`}
        >
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-gray-700 px-2.5 py-1 rounded-md shadow-sm">
                {selectedOption.category}
              </span>
              <span>{selectedOption.name}</span>
            </span>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {/* Search input */}
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-accent text-sm"
                autoFocus
              />
            </div>

            {/* Options */}
            {Object.keys(filteredGroups).length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Nenhum resultado encontrado
              </div>
            ) : (
              Object.entries(filteredGroups).map(([category, items]) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="px-3 py-2.5 bg-gray-100 text-xs font-bold text-gray-700 uppercase tracking-wider sticky top-0 border-b border-gray-200">
                    {category}
                  </div>
                  {/* Category items */}
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                        value === item.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
