import { Modal } from './Modal'

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  description: string
}

interface KeyboardHelpModalProps {
  isOpen: boolean
  onClose: () => void
  shortcuts: Shortcut[]
}

export function KeyboardHelpModal({ isOpen, onClose, shortcuts }: KeyboardHelpModalProps) {
  const formatShortcut = (shortcut: Shortcut) => {
    const parts = []
    if (shortcut.ctrl) parts.push('Ctrl')
    if (shortcut.shift) parts.push('Shift')
    if (shortcut.alt) parts.push('Alt')
    parts.push(shortcut.key.toUpperCase())
    return parts.join(' + ')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Atalhos de Teclado">
      <div className="space-y-4">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
            <span className="text-gray-700">{shortcut.description}</span>
            <kbd className="px-3 py-1 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono">
              {formatShortcut(shortcut)}
            </kbd>
          </div>
        ))}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Dica:</strong> No Mac, use Cmd em vez de Ctrl.
          </p>
        </div>
      </div>
    </Modal>
  )
}
