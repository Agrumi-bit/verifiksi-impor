/**
 * Minimal JPEG EXIF reader: the three facts the app keeps from a photo — when it was taken
 * (DateTimeOriginal), where (GPS), and how it is rotated (Orientation). Runs in the browser (read
 * before the photo is compressed, which drops EXIF) and on the server (to turn old photos upright
 * when making thumbnails). Pure: no DOM, no Node APIs. Anything unreadable yields an empty result.
 */

export type PhotoExif = {
  /** "YYYY-MM-DDTHH:mm:ss", local time of the camera. */
  takenAt?: string;
  lat?: number;
  lng?: number;
  /** EXIF orientation 1–8 (1 = upright). */
  orientation?: number;
};

const TAG_ORIENTATION = 0x0112;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DATE_TIME_ORIGINAL = 0x9003;
const GPS_LAT_REF = 0x0001;
const GPS_LAT = 0x0002;
const GPS_LNG_REF = 0x0003;
const GPS_LNG = 0x0004;

type Entry = { type: number; count: number; valueOffset: number };

function readIfd(view: DataView, tiff: number, offset: number, little: boolean): Map<number, Entry> {
  const entries = new Map<number, Entry>();
  const start = tiff + offset;
  if (start + 2 > view.byteLength) return entries;
  const count = view.getUint16(start, little);
  for (let i = 0; i < count; i++) {
    const at = start + 2 + i * 12;
    if (at + 12 > view.byteLength) break;
    entries.set(view.getUint16(at, little), { type: view.getUint16(at + 2, little), count: view.getUint32(at + 4, little), valueOffset: at + 8 });
  }
  return entries;
}

/** Where an entry's data lives: inline when it fits in 4 bytes, else at the stored offset. */
function dataAt(view: DataView, tiff: number, entry: Entry, little: boolean, byteSize: number): number {
  return entry.count * byteSize <= 4 ? entry.valueOffset : tiff + view.getUint32(entry.valueOffset, little);
}

function readAscii(view: DataView, tiff: number, entry: Entry | undefined, little: boolean): string | undefined {
  if (!entry || entry.type !== 2) return undefined;
  const at = dataAt(view, tiff, entry, little, 1);
  if (at + entry.count > view.byteLength) return undefined;
  let out = "";
  for (let i = 0; i < entry.count; i++) {
    const c = view.getUint8(at + i);
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out;
}

function readDegrees(view: DataView, tiff: number, entry: Entry | undefined, little: boolean): number | undefined {
  if (!entry || entry.type !== 5 || entry.count < 3) return undefined;
  const at = dataAt(view, tiff, entry, little, 8);
  if (at + 24 > view.byteLength) return undefined;
  const part = (i: number) => {
    const den = view.getUint32(at + i * 8 + 4, little);
    return den ? view.getUint32(at + i * 8, little) / den : 0;
  };
  return part(0) + part(1) / 60 + part(2) / 3600;
}

/** "2026:10:14 09:30:12" → "2026-10-14T09:30:12"; anything else → undefined. */
export function exifDateToIso(value: string | undefined): string | undefined {
  const m = value?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m || m[1] === "0000") return undefined;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
}

/** Reads EXIF from the start of a JPEG (the first ~128 KB is plenty). */
export function readJpegExif(bytes: ArrayBuffer | Uint8Array): PhotoExif {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return {};
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    if ((marker & 0xff00) !== 0xff00 || length < 2) return {};
    // APP1 "Exif\0\0"
    if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
      return parseTiff(view, offset + 10);
    }
    if (marker === 0xffda) return {}; // start of scan: no EXIF before the image data
    offset += 2 + length;
  }
  return {};
}

function parseTiff(view: DataView, tiff: number): PhotoExif {
  try {
    const order = view.getUint16(tiff);
    if (order !== 0x4949 && order !== 0x4d4d) return {};
    const little = order === 0x4949;
    const ifd0 = readIfd(view, tiff, view.getUint32(tiff + 4, little), little);
    const result: PhotoExif = {};

    const orientation = ifd0.get(TAG_ORIENTATION);
    if (orientation?.type === 3) {
      const value = view.getUint16(orientation.valueOffset, little);
      if (value >= 1 && value <= 8) result.orientation = value;
    }

    const exifPointer = ifd0.get(TAG_EXIF_IFD);
    if (exifPointer) {
      const exif = readIfd(view, tiff, view.getUint32(exifPointer.valueOffset, little), little);
      result.takenAt = exifDateToIso(readAscii(view, tiff, exif.get(TAG_DATE_TIME_ORIGINAL), little));
    }

    const gpsPointer = ifd0.get(TAG_GPS_IFD);
    if (gpsPointer) {
      const gps = readIfd(view, tiff, view.getUint32(gpsPointer.valueOffset, little), little);
      const lat = readDegrees(view, tiff, gps.get(GPS_LAT), little);
      const lng = readDegrees(view, tiff, gps.get(GPS_LNG), little);
      if (lat !== undefined && lng !== undefined && (lat !== 0 || lng !== 0)) {
        result.lat = (readAscii(view, tiff, gps.get(GPS_LAT_REF), little) === "S" ? -1 : 1) * lat;
        result.lng = (readAscii(view, tiff, gps.get(GPS_LNG_REF), little) === "W" ? -1 : 1) * lng;
      }
    }
    return result;
  } catch {
    return {};
  }
}
