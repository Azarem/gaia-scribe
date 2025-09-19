import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  current?: boolean
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={clsx('flex', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
            )}
            
            {item.current ? (
              <span className="flex items-center text-sm font-medium text-gray-900">
                {item.icon && (
                  <span className="mr-2 h-4 w-4 text-gray-500">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </span>
            ) : item.href ? (
              <Link
                to={item.href}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                {item.icon && (
                  <span className="mr-2 h-4 w-4">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </Link>
            ) : (
              <span className="flex items-center text-sm font-medium text-gray-500">
                {item.icon && (
                  <span className="mr-2 h-4 w-4">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
