import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parsePhotoMeta, photoMetaCaption } from "./photo-meta";

describe("photo metadata", () => {
  it("keeps only valid date and coordinates", () => {
    assert.deepEqual(parsePhotoMeta("2026-10-14T09:30:12", "-6.2", "106.825"), { takenAt: "2026-10-14T09:30:12", lat: -6.2, lng: 106.825 });
    assert.deepEqual(parsePhotoMeta("kemarin", "-6.2", "106.825"), { lat: -6.2, lng: 106.825 });
    assert.equal(parsePhotoMeta(null, "95", "10"), null);
    assert.equal(parsePhotoMeta(null, "0", "0"), null);
    assert.equal(parsePhotoMeta(null, null, null), null);
  });

  it("writes the caption shown under a photo", () => {
    assert.equal(photoMetaCaption({ takenAt: "2026-10-14T09:30:12", lat: -6.2, lng: 106.825 }), "Diambil 14 Okt 2026 09:30 · -6.20000, 106.82500");
    assert.equal(photoMetaCaption({ takenAt: "2026-01-05T17:02:00" }), "Diambil 5 Jan 2026 17:02");
    assert.equal(photoMetaCaption(null), null);
  });
});

