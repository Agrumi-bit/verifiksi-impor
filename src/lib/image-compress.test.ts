import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fitWithin, IMAGE_MIN_BYTES, keepCompressed, renameExtension, shouldCompress } from "./image-compress";

describe("image compression rules", () => {
  it("compresses only photos big enough to be worth it, and always HEIC", () => {
    assert.equal(shouldCompress({ name: "a.jpg", type: "image/jpeg", size: IMAGE_MIN_BYTES }), true);
    assert.equal(shouldCompress({ name: "a.jpg", type: "image/jpeg", size: IMAGE_MIN_BYTES - 1 }), false);
    assert.equal(shouldCompress({ name: "a.pdf", type: "application/pdf", size: 9_000_000 }), false);
    assert.equal(shouldCompress({ name: "IMG_1.HEIC", type: "", size: 10 }), true);
  });

  it("fits the longest edge within the limit without enlarging", () => {
    assert.deepEqual(fitWithin(4000, 3000), { width: 2000, height: 1500 });
    assert.deepEqual(fitWithin(3000, 4000), { width: 1500, height: 2000 });
    assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  });

  it("renames to the encoded format", () => {
    assert.equal(renameExtension("IMG_1234.JPG", "webp"), "IMG_1234.webp");
    assert.equal(renameExtension("foto.kantor.png", "jpg"), "foto.kantor.jpg");
    assert.equal(renameExtension("tanpa-ekstensi", "webp"), "tanpa-ekstensi.webp");
  });

  it("keeps the compressed file only when it is smaller — except HEIC, which must be converted", () => {
    assert.equal(keepCompressed({ name: "a.jpg", type: "image/jpeg", size: 1000 }, 400), true);
    assert.equal(keepCompressed({ name: "a.jpg", type: "image/jpeg", size: 1000 }, 1200), false);
    assert.equal(keepCompressed({ name: "a.heic", type: "image/heic", size: 1000 }, 1200), true);
  });
});
