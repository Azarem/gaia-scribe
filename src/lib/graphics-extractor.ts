/**
 * Graphics Extraction and Conversion Utilities
 * 
 * Handles extraction of graphics files from ROM data and conversion
 * of SNES 4bpp tile graphics to canvas ImageData for display.
 */

import { CompressionRegistry } from '@gaialabs/shared'
import type { File as PrismaFile } from '@prisma/client'

/**
 * Extract file data from ROM
 * 
 * @param romData - Complete ROM data as Uint8Array
 * @param file - File record with location and size information
 * @returns Extracted file data (decompressed if necessary)
 */
export async function extractFileData(
  romData: Uint8Array,
  file: PrismaFile,
  compressionProvider: string
): Promise<Uint8Array> {
  // Validate inputs
  // if (!romData || romData.length === 0) {
  //   throw new Error('ROM data is empty or invalid')
  // }

  // if (file.location === null || file.location === undefined) {
  //   throw new Error('File location is not defined')
  // }

  // if (file.size === null || file.size === undefined || file.size <= 0) {
  //   throw new Error('File size is not defined or invalid')
  // }

  // // Check if location is within ROM bounds
  // if (file.location < 0 || file.location >= romData.length) {
  //   throw new Error(`File location 0x${file.location.toString(16)} is outside ROM bounds`)
  // }

  // // Check if file extends beyond ROM
  // if (file.location + file.size > romData.length) {
  //   throw new Error(
  //     `File extends beyond ROM bounds (location: 0x${file.location.toString(16)}, ` +
  //     `size: 0x${file.size.toString(16)}, ROM size: 0x${romData.length.toString(16)})`
  //   )
  // }

  // Decompress if necessary
  if (file.compressed !== null && file.compressed !== undefined) {
    try {
      const compression = CompressionRegistry.get(compressionProvider)
      if (!compression) {
        throw new Error(`${compressionProvider} compression not available`)
      }

      // Decompress the data
      const decompressed = compression.expand(romData, file.location, file.size)
      return decompressed
    } catch (error) {
      throw new Error(
        `Failed to decompress file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Extract raw file data
  const rawData = romData.slice(file.location, file.location + file.size)

  return rawData
}

/**
 * Convert SNES 4bpp tile graphics to canvas ImageData
 * 
 * Based on the SNES graphics format:
 * - 4 bits per pixel (16 colors)
 * - Tiles are 8x8 pixels
 * - Data is organized in bitplanes
 * - Output is 128x256 pixels (16 tiles wide × 32 tiles tall)
 * 
 * @param vramData - Extracted VRAM/graphics data
 * @param useOffset - Whether to use offset 0x6000 instead of 0x4000
 * @param paletteData - Optional palette data (256 colors × 4 bytes RGBA)
 * @returns ImageData object ready for canvas rendering
 */
export function convertSnes4bppToImageData(
  vramData: Uint8Array,
  //useOffset: boolean = false,
  paletteData?: Uint8Array
): ImageData {
  // Output dimensions depend on data length
  // Each gfx page is 128*128 pixels, 4bpp == 8192 (0x2000) bytes
  const width = 128
  const height = (vramData.length >> 6)
  const imageData = new ImageData(width, height)
  const pixels = imageData.data
  const tilesX = 16
  const tilesY = height >> 3

  // VRAM offset
  let vOffset = 0 // 0x4000 + (useOffset ? 0x2000 : 0)

  // Temporary buffers
  const indexBuffer = new Uint8Array(8)
  const offsetBuffer = new Uint32Array(2)

  // Process 32 rows of tiles
  for (let ty = 0; ty < tilesY; ty++) {
    // Process 16 columns of tiles
    for (let tx = 0; tx < tilesX; tx++) {
      // Set up bitplane offsets
      offsetBuffer[0] = vOffset
      offsetBuffer[1] = vOffset + 16
      vOffset += 32

      // Process 8 rows within the tile
      for (let row = 0; row < 8; row++) {
        // Clear index buffer
        indexBuffer.fill(0)

        // Rotate bits from samples (4 bitplanes)
        for (let plane = 0, planeBit = 1; plane < 4; plane++, planeBit <<= 1) {
          const offset = offsetBuffer[plane >> 1]
          if (offset >= vramData.length) continue

          const sample = vramData[offset]
          offsetBuffer[plane >> 1]++

          for (let i = 0, testBit = 0x80; i < 8; i++, testBit >>= 1) {
            if ((sample & testBit) !== 0) {
              indexBuffer[i] |= planeBit
            }
          }
        }

        // Calculate output offset for this row
        const rowY = (ty << 3) + row
        const rowX = tx << 3
        let cOffset = ((rowY * width) + rowX) << 2

        // Write pixels for this row
        for (let col = 0; col < 8; col++) {
          const cIndex = indexBuffer[col]

          if (cIndex === 0) {
            // Transparent pixel
            pixels[cOffset++] = 0
            pixels[cOffset++] = 0
            pixels[cOffset++] = 0
            pixels[cOffset++] = 0
          } else if (paletteData && paletteData.length >= 256 * 4) {
            // Use palette data
            const zOffset = cIndex << 2
            pixels[cOffset++] = paletteData[zOffset]
            pixels[cOffset++] = paletteData[zOffset + 1]
            pixels[cOffset++] = paletteData[zOffset + 2]
            pixels[cOffset++] = 0xFF
          } else {
            // Grayscale fallback
            const gray = cIndex << 4
            pixels[cOffset++] = gray
            pixels[cOffset++] = gray
            pixels[cOffset++] = gray
            pixels[cOffset++] = 0xFF
          }
        }
      }
    }
  }

  return imageData
}

/**
 * Extract and convert graphics file to ImageData
 * 
 * Convenience function that combines extraction and conversion
 * 
 * @param romData - Complete ROM data
 * @param file - Graphics file record
 * @param useOffset - Whether to use offset 0x6000 instead of 0x4000
 * @returns ImageData ready for canvas rendering
 */
export async function extractAndConvertGraphics(
  romData: Uint8Array,
  file: PrismaFile,
  //useOffset: boolean = false
): Promise<ImageData> {
  // Extract file data
  const fileData = await extractFileData(romData, file, 'QuintetLZ')

  // Convert to ImageData
  const imageData = convertSnes4bppToImageData(fileData) //useOffset)

  return imageData
}

