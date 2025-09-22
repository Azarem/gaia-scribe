/**
 * SNES ROM Header Parser
 * 
 * Parses SNES ROM files to extract metadata from the internal ROM header.
 * Supports LoROM, HiROM, and ExHiROM formats.
 * 
 * Based on SNES ROM header specification:
 * https://snes.nesdev.org/wiki/ROM_header
 */

export interface RomHeaderInfo {
  title: string
  mapMode: 'LoROM' | 'HiROM' | 'ExHiROM' | 'Unknown'
  romSpeed: 'Slow' | 'Fast'
  chipset: string
  romSize: number // in KB
  ramSize: number // in KB
  region: 'NTSC' | 'PAL' | 'Unknown'
  developerId: number
  version: number
  checksum: number
  checksumComplement: number
  isValid: boolean
  headerLocation: number
  rawHeader?: Uint8Array
}

// Country codes that imply NTSC/PAL
const COUNTRY_CODES = {
  0x00: 'Japan (NTSC)',
  0x01: 'USA (NTSC)', 
  0x02: 'Europe (PAL)',
  0x03: 'Sweden (PAL)',
  0x04: 'Finland (PAL)',
  0x05: 'Denmark (PAL)',
  0x06: 'France (PAL)',
  0x07: 'Holland (PAL)',
  0x08: 'Spain (PAL)',
  0x09: 'Germany (PAL)',
  0x0A: 'Italy (PAL)',
  0x0B: 'China (PAL)',
  0x0C: 'Indonesia (PAL)',
  0x0D: 'Korea (NTSC)',
} as const

// Chipset descriptions
const CHIPSET_TYPES = {
  0x00: 'ROM only',
  0x01: 'ROM + RAM',
  0x02: 'ROM + RAM + battery',
  0x03: 'ROM + DSP',
  0x04: 'ROM + DSP + RAM',
  0x05: 'ROM + DSP + RAM + battery',
  0x06: 'ROM + DSP + battery',
  0x13: 'ROM + SuperFX',
  0x14: 'ROM + SuperFX + RAM',
  0x15: 'ROM + SuperFX + RAM + battery',
  0x1A: 'ROM + SuperFX + RAM + battery (alt)',
  0x23: 'ROM + OBC1',
  0x33: 'ROM + SA-1',
  0x34: 'ROM + SA-1 + RAM',
  0x35: 'ROM + SA-1 + RAM + battery',
  0x43: 'ROM + S-DD1',
  0x45: 'ROM + S-DD1 + RAM + battery',
  0x53: 'ROM + S-RTC',
  0x55: 'ROM + S-RTC + RAM + battery',
  0xE3: 'ROM + Other',
  0xF3: 'ROM + Custom',
} as const

/**
 * Parse a SNES ROM file and extract header information
 */
export function parseRomHeader(romData: ArrayBuffer): RomHeaderInfo {
  const data = new Uint8Array(romData)
  
  // Try different header locations
  const headerLocations = [
    { offset: 0x7FC0, type: 'LoROM' as const },    // LoROM: $007FC0
    { offset: 0xFFC0, type: 'HiROM' as const },    // HiROM: $00FFC0
    { offset: 0x40FFC0, type: 'ExHiROM' as const } // ExHiROM: $40FFC0
  ]
  
  let bestHeader: RomHeaderInfo | null = null
  let bestScore = 0
  
  for (const location of headerLocations) {
    if (location.offset + 32 > data.length) continue
    
    const header = parseHeaderAtLocation(data, location.offset, location.type)
    const score = scoreHeader(header, data)
    
    if (score > bestScore) {
      bestScore = score
      bestHeader = header
    }
  }
  
  return bestHeader || createInvalidHeader()
}

/**
 * Parse header at a specific location
 */
function parseHeaderAtLocation(data: Uint8Array, offset: number, mapMode: 'LoROM' | 'HiROM' | 'ExHiROM'): RomHeaderInfo {
  // Extract title (21 bytes at offset + 0x00)
  const titleBytes = data.slice(offset, offset + 21)
  const title = Array.from(titleBytes)
    .map(b => b === 0 ? 0x20 : b) // Convert null bytes to spaces
    .map(b => String.fromCharCode(b))
    .join('')
    .trim()
  
  // ROM speed and map mode (offset + 0x15)
  const speedAndMap = data[offset + 0x15]
  const romSpeed = (speedAndMap & 0x10) ? 'Fast' : 'Slow'
  
  // Chipset (offset + 0x16)
  const chipsetByte = data[offset + 0x16]
  const chipset = CHIPSET_TYPES[chipsetByte as keyof typeof CHIPSET_TYPES] || `Unknown (0x${chipsetByte.toString(16).toUpperCase()})`
  
  // ROM size (offset + 0x17)
  const romSizeByte = data[offset + 0x17]
  const romSize = Math.pow(2, romSizeByte) // 1<<N kilobytes
  
  // RAM size (offset + 0x18)
  const ramSizeByte = data[offset + 0x18]
  const ramSize = ramSizeByte > 0 ? Math.pow(2, ramSizeByte) : 0 // 1<<N kilobytes
  
  // Country/Region (offset + 0x19)
  const countryByte = data[offset + 0x19]
  const countryInfo = COUNTRY_CODES[countryByte as keyof typeof COUNTRY_CODES] || `Unknown (0x${countryByte.toString(16).toUpperCase()})`
  const region = countryInfo.includes('NTSC') ? 'NTSC' : countryInfo.includes('PAL') ? 'PAL' : 'Unknown'
  
  // Developer ID (offset + 0x1A)
  const developerId = data[offset + 0x1A]
  
  // Version (offset + 0x1B)
  const version = data[offset + 0x1B]
  
  // Checksum complement (offset + 0x1C, 2 bytes little-endian)
  const checksumComplement = data[offset + 0x1C] | (data[offset + 0x1D] << 8)
  
  // Checksum (offset + 0x1E, 2 bytes little-endian)
  const checksum = data[offset + 0x1E] | (data[offset + 0x1F] << 8)
  
  return {
    title,
    mapMode,
    romSpeed,
    chipset,
    romSize,
    ramSize,
    region,
    developerId,
    version,
    checksum,
    checksumComplement,
    isValid: false, // Will be determined by scoring
    headerLocation: offset,
    rawHeader: data.slice(offset, offset + 32)
  }
}

/**
 * Score a header to determine validity
 */
function scoreHeader(header: RomHeaderInfo, romData: Uint8Array): number {
  let score = 0
  
  // Check checksum validity
  if ((header.checksum + header.checksumComplement) === 0xFFFF) {
    score += 50
  }
  
  // Check if title contains only printable ASCII
  const titleValid = /^[\x20-\x7E]*$/.test(header.title)
  if (titleValid) {
    score += 30
  }
  
  // Check if ROM size is reasonable
  if (header.romSize >= 128 && header.romSize <= 8192) { // 128KB to 8MB
    score += 20
  }
  
  // Check if map mode matches header location
  const expectedOffset = header.mapMode === 'LoROM' ? 0x7FC0 : 
                        header.mapMode === 'HiROM' ? 0xFFC0 : 0x40FFC0
  if (header.headerLocation === expectedOffset) {
    score += 30
  }
  
  // Check if header location is within ROM bounds
  if (header.headerLocation + 32 <= romData.length) {
    score += 10
  }
  
  return score
}

/**
 * Create an invalid header for when no valid header is found
 */
function createInvalidHeader(): RomHeaderInfo {
  return {
    title: 'Unknown ROM',
    mapMode: 'Unknown',
    romSpeed: 'Slow',
    chipset: 'Unknown',
    romSize: 0,
    ramSize: 0,
    region: 'Unknown',
    developerId: 0,
    version: 0,
    checksum: 0,
    checksumComplement: 0,
    isValid: false,
    headerLocation: -1
  }
}

/**
 * Generate a project name from ROM header information
 */
export function generateProjectName(header: RomHeaderInfo): string {
  if (!header.isValid || !header.title.trim()) {
    return 'New SNES Project'
  }
  
  const title = header.title.trim()
  const version = header.version > 0 ? ` - v${header.version}` : ''
  const region = header.region !== 'Unknown' ? ` (${header.region})` : ''
  
  return `${title}${version}${region}`
}

/**
 * Validate if a file appears to be a SNES ROM
 */
export function validateRomFile(file: File): Promise<{ isValid: boolean; error?: string }> {
  return new Promise((resolve) => {
    // Check file extension
    const validExtensions = ['.smc', '.sfc', '.fig', '.swc', '.rom', '.bin']
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    if (!hasValidExtension) {
      resolve({
        isValid: false,
        error: 'Invalid file type. Please select a SNES ROM file (.smc, .sfc, .fig, .swc, .rom, .bin)'
      })
      return
    }
    
    // Check file size (SNES ROMs are typically 128KB to 8MB)
    if (file.size < 128 * 1024) {
      resolve({
        isValid: false,
        error: 'File too small to be a valid SNES ROM (minimum 128KB)'
      })
      return
    }
    
    if (file.size > 8 * 1024 * 1024) {
      resolve({
        isValid: false,
        error: 'File too large to be a valid SNES ROM (maximum 8MB)'
      })
      return
    }
    
    resolve({ isValid: true })
  })
}
