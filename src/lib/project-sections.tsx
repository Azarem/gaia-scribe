import { 
  FileText, 
  Package, 
  Cpu, 
  Type, 
  Database, 
  Tag, 
  Edit, 
  MapPin, 
  Settings 
} from 'lucide-react'

export interface ProjectSection {
  key: string
  name: string
  icon: React.ReactNode
  description: string
  route: string
}

export const PROJECT_SECTIONS: ProjectSection[] = [
  {
    key: 'files',
    name: 'Files',
    icon: <FileText className="h-6 w-6" />,
    description: 'Manage project files including their locations, sizes, types, and metadata.',
    route: 'files'
  },
  {
    key: 'blocks',
    name: 'Blocks',
    icon: <Package className="h-6 w-6" />,
    description: 'Define data blocks with transformations and parts for structured data processing.',
    route: 'blocks'
  },
  {
    key: 'cops',
    name: 'COPs',
    icon: <Cpu className="h-6 w-6" />,
    description: 'Configure CPU operations with codes, mnemonics, and execution parameters.',
    route: 'cops'
  },
  {
    key: 'strings',
    name: 'String Types',
    icon: <Type className="h-6 w-6" />,
    description: 'Define string types with delimiters, character maps, and command structures.',
    route: 'strings'
  },
  {
    key: 'structs',
    name: 'Structs',
    icon: <Database className="h-6 w-6" />,
    description: 'Create data structures with type definitions, delimiters, and hierarchical relationships.',
    route: 'structs'
  },
  {
    key: 'labels',
    name: 'Labels',
    icon: <Tag className="h-6 w-6" />,
    description: 'Assign meaningful labels to memory locations for easier code navigation.',
    route: 'labels'
  },
  {
    key: 'rewrites',
    name: 'Rewrites',
    icon: <Edit className="h-6 w-6" />,
    description: 'Define memory location rewrites to modify values at specific addresses.',
    route: 'rewrites'
  },
  {
    key: 'mnemonics',
    name: 'Mnemonics',
    icon: <MapPin className="h-6 w-6" />,
    description: 'Map assembly mnemonics to memory addresses with optional metadata.',
    route: 'mnemonics'
  },
  {
    key: 'overrides',
    name: 'Overrides',
    icon: <Settings className="h-6 w-6" />,
    description: 'Override register values at specific memory locations during execution.',
    route: 'overrides'
  }
]

export function getSectionByKey(key: string): ProjectSection | undefined {
  return PROJECT_SECTIONS.find(section => section.key === key)
}

export function getSectionByRoute(route: string): ProjectSection | undefined {
  return PROJECT_SECTIONS.find(section => section.route === route)
}
