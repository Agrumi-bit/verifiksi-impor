import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { exifDateToIso, readJpegExif } from "./exif";

/** Builds a JPEG header carrying an EXIF block like a phone camera writes (little-endian TIFF). */
function jpegWithExif(opts: { orientation: number; date: string; lat: [number, number, number]; latRef: string; lng: [number, number, number]; lngRef: string }): Uint8Array {
  const tiff: number[] = [];
  const u16 = (v: number) => tiff.push(v & 0xff, (v >> 8) & 0xff);
  const u32 = (v: number) => tiff.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >>> 24) & 0xff);
  const entry = (tag: number, type: number, count: number, value: number) => { u16(tag); u16(type); u32(count); u32(value); };

  // Layout: header(8) | IFD0 @8 (3 entries) | ExifIFD @50 (1 entry) | GPS IFD @68 (4 entries) | data @122
  const IFD0 = 8, EXIF = IFD0 + 2 + 3 * 12 + 4, GPS = EXIF + 2 + 12 + 4, DATA = GPS + 2 + 4 * 12 + 4;
  const DATE = DATA, LAT = DATE + 20, LNG = LAT + 24;
  tiff.push(0x49, 0x49); u16(42); u32(IFD0);
  u16(3);
  entry(0x0112, 3, 1, opts.orientation);
  entry(0x8769, 4, 1, EXIF);
  entry(0x8825, 4, 1, GPS);
  u32(0);
  u16(1);
  entry(0x9003, 2, 20, DATE);
  u32(0);
  u16(4);
  entry(0x0001, 2, 2, opts.latRef.charCodeAt(0));
  entry(0x0002, 5, 3, LAT);
  entry(0x0003, 2, 2, opts.lngRef.charCodeAt(0));
  entry(0x0004, 5, 3, LNG);
  u32(0);
  for (const c of opts.date.padEnd(19, " ")) tiff.push(c.charCodeAt(0));
  tiff.push(0);
  for (const v of [...opts.lat, ...opts.lng]) { u32(v); u32(1); }

  const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const length = app1.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...app1, 0xff, 0xda, 0, 2]);
}

describe("readJpegExif", () => {
  it("reads date, GPS and orientation", () => {
    const exif = readJpegExif(jpegWithExif({ orientation: 6, date: "2026:10:14 09:30:12", lat: [6, 12, 0], latRef: "S", lng: [106, 49, 30], lngRef: "E" }));
    assert.equal(exif.orientation, 6);
    assert.equal(exif.takenAt, "2026-10-14T09:30:12");
    assert.ok(Math.abs((exif.lat ?? 0) - -6.2) < 1e-9);
    assert.ok(Math.abs((exif.lng ?? 0) - 106.825) < 1e-9);
  });

  it("returns nothing for a file that isn't a JPEG with EXIF", () => {
    assert.deepEqual(readJpegExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), {});
    assert.deepEqual(readJpegExif(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2])), {});
    assert.deepEqual(readJpegExif(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, 40, 1, 2, 3])), {});
  });

  it("ignores empty camera dates", () => {
    assert.equal(exifDateToIso("0000:00:00 00:00:00"), undefined);
    assert.equal(exifDateToIso(undefined), undefined);
  });
});
