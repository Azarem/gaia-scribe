import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import clsx from 'clsx'

interface SectionCardProps {
  projectId: string
  sectionName: string
  sectionKey: string
  icon: ReactNode
  count: number
  description: string
  loading?: boolean
  className?: string
}

export default function SectionCard({
  projectId,
  sectionName,
  sectionKey,
  icon,
  count,
  description,
  loading = false,
  className
}: SectionCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/project/${projectId}/${sectionKey}`)
  }

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-gray-300 hover:bg-gray-50',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
            <div className="h-6 w-6 text-blue-600">
              {icon}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{sectionName}</h3>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>

      {/* Count */}
      <div className="mb-3">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ) : (
          <div className="text-3xl font-bold text-gray-900">
            {count.toLocaleString()}
          </div>
        )}
        <div className="text-sm text-gray-500">
          {count === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  )
}
