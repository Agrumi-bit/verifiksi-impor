<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture Baseline (V1)

Stack: Next.js 16 + React 19 + TypeScript, Tailwind v4 + Shadcn/UI, TanStack Query + Zustand, React Hook Form + Zod, Prisma + PostgreSQL, Better Auth, Leaflet + MapLibre, Recharts, React PDF. Deployed as a modular monolith via Docker + Nginx on a single Hostinger VPS (Ubuntu).

## Storage Strategy

The project is in the **Development phase**. Cloud object storage (Amazon S3, MinIO, Cloudflare R2) is **not** used yet — this is a deliberate, mandatory decision for V1, not an oversight. Application code must never depend on a specific storage provider: all file access goes through the `StorageService` interface in [src/lib/storage/types.ts](src/lib/storage/types.ts), currently backed by [src/lib/storage/local-storage.ts](src/lib/storage/local-storage.ts). Only the relative file path is stored in PostgreSQL, never a provider-specific URL.

1. **Development storage** — Local File Storage, under `./storage` at the project root (`STORAGE_ROOT` env var).
2. **Staging storage** — Local File Storage, same mechanism as development, on the staging host's disk.
3. **Production storage** — Local File Storage on the single Hostinger VPS, at `/app/storage` inside the container, persisted via the `app_storage` Docker volume (see `docker-compose.yml`).
4. **Future migration strategy** — When scale requires it, an S3-compatible `StorageService` implementation (Amazon S3, MinIO, or Cloudflare R2) can be added alongside `local-storage.ts` and swapped in via `src/lib/storage/index.ts`. Because business logic only calls the `StorageService` interface and only ever persists relative paths, this migration requires no changes outside the storage module.

Directory layout under `storage/` (mirrored under `STORAGE_NAMESPACES` in [types.ts](src/lib/storage/types.ts)):

```
/storage
  /companies
  /documents
  /inspection
  /certificates
  /signatures
  /photos
  /qrcode
  /temporary
```

Example stored paths: `documents/company-001/nib.pdf`, `inspection/INS-00001/photo-001.jpg`, `certificates/LHVKI-2026-00001.pdf`.
