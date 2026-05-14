import * as fs from "node:fs/promises";
import type { ImageInfo } from "./types";

export async function getImageInfo(filePath: string): Promise<ImageInfo | null> {
  const buffer = await fs.readFile(filePath);
  const png = readPngInfo(buffer);
  if (png) return { ...png, buffer };
  const webp = readWebpInfo(buffer);
  if (webp) return { ...webp, buffer };
  return null;
}

export function readPngInfo(buffer: Buffer): Omit<ImageInfo, "buffer"> | null {
  if (
    buffer.length < 24 ||
    buffer[0] !== 137 ||
    buffer.subarray(1, 4).toString("ascii") !== "PNG" ||
    buffer.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    mimeType: "image/png",
  };
}

export function readWebpInfo(buffer: Buffer): Omit<ImageInfo, "buffer"> | null {
  if (
    buffer.length < 20 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return null;
  }
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.subarray(offset, offset + 4).toString("ascii");
    const size = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + size > buffer.length) return null;
    const info = readWebpChunkInfo(buffer, chunk, dataOffset, size);
    if (info) return { ...info, mimeType: "image/webp" };
    offset = dataOffset + size + (size % 2);
  }
  return null;
}

function readWebpChunkInfo(buffer: Buffer, chunk: string, offset: number, size: number): { width: number; height: number } | null {
  if (chunk === "VP8X") {
    if (size < 10) return null;
    return {
      width: buffer.readUIntLE(offset + 4, 3) + 1,
      height: buffer.readUIntLE(offset + 7, 3) + 1,
    };
  }
  if (chunk === "VP8L") {
    if (size < 5 || buffer[offset] !== 47) return null;
    const bits = buffer.readUInt32LE(offset + 1);
    const mask = 2 ** 14;
    return { width: (bits % mask) + 1, height: (Math.floor(bits / mask) % mask) + 1 };
  }
  if (chunk === "VP8") {
    if (size < 10 || buffer[offset + 3] !== 157 || buffer[offset + 4] !== 1 || buffer[offset + 5] !== 42) {
      return null;
    }
    return {
      width: buffer.readUInt16LE(offset + 6) % 2 ** 14,
      height: buffer.readUInt16LE(offset + 8) % 2 ** 14,
    };
  }
  return null;
}
