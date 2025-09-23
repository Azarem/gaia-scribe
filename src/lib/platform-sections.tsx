import { 
  MapPin, 
  Cpu, 
  Zap, 
  FolderOpen 
} from 'lucide-react'

export interface PlatformSection {
  key: string
  name: string
  icon: React.ReactNode
  description: string
  route: string
}

export const PLATFORM_SECTIONS: PlatformSection[] = [
  {
    key: 'addressingModes',
    name: 'Addressing Modes',
    icon: <MapPin className="h-6 w-6" />,
    description: 'Define memory addressing modes supported by this platform.',
    route: 'addressing-modes'
  },
  {
    key: 'instructionSet',
    name: 'Instruction Set',
    icon: <Cpu className="h-6 w-6" />,
    description: 'Configure the instruction set and operation groups for this platform.',
    route: 'instruction-set'
  },
  {
    key: 'vectors',
    name: 'Vectors',
    icon: <Zap className="h-6 w-6" />,
    description: 'Manage interrupt and reset vectors for this platform.',
    route: 'vectors'
  },
  {
    key: 'projects',
    name: 'Projects',
    icon: <FolderOpen className="h-6 w-6" />,
    description: 'View projects that use this platform.',
    route: 'projects'
  }
]

export function getPlatformSectionByKey(key: string): PlatformSection | undefined {
  return PLATFORM_SECTIONS.find(section => section.key === key)
}

export function getPlatformSectionByRoute(route: string): PlatformSection | undefined {
  return PLATFORM_SECTIONS.find(section => section.route === route)
}
