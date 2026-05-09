import { useLocation, useNavigate } from 'react-router-dom'

interface BreadcrumbItem {
  label: string
  path: string
}

interface BreadcrumbsProps {
  maxItems?: number
}

export function Breadcrumbs({ maxItems = 3 }: BreadcrumbsProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter((x) => x)
    const breadcrumbs: BreadcrumbItem[] = []

    // Não mostrar breadcrumbs se estiver na home
    if (location.pathname === '/controller/dashboard' || location.pathname === '/controller') {
      return []
    }

    // Adicionar Home
    breadcrumbs.push({ label: 'Home', path: '/controller/dashboard' })

    pathnames.forEach((path, index) => {
      const routePath = `/${pathnames.slice(0, index + 1).join('/')}`
      
      // Pular breadcrumbs intermediários que não são rotas válidas
      if (index < pathnames.length - 1) {
        return
      }
      
      // Converter rota para label amigável
      let label = path
        .replace(/-/g, ' ')
        .replace(/caderneta/g, 'Caderneta')
        .replace(/detalhes/g, 'Detalhes')
        .replace(/cadastro/g, 'Cadastro')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      breadcrumbs.push({ label, path: routePath })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()
  const displayBreadcrumbs = maxItems > 0 && breadcrumbs.length > maxItems
    ? [
        breadcrumbs[0],
        { label: '...', path: '' },
        ...breadcrumbs.slice(-maxItems + 1)
      ]
    : breadcrumbs

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 py-2 px-4 md:px-6 bg-gray-50 border-b border-gray-200">
      {displayBreadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.path} className="flex items-center">
          {index > 0 && (
            <svg className="w-4 h-4 mx-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {breadcrumb.label === '...' ? (
            <span className="text-gray-400">{breadcrumb.label}</span>
          ) : (
            <button
              onClick={() => navigate(breadcrumb.path)}
              className={`transition-all ${
                index === displayBreadcrumbs.length - 1 ? 'text-gray-900 font-medium cursor-default' : ''
              }`}
              disabled={index === displayBreadcrumbs.length - 1}
            >
              {breadcrumb.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  )
}
