# Media delivery interface

The site currently serves media from the same origin. All runtime media paths
pass through `app/media-delivery.ts`, so a future OSS, R2, Blob or CDN migration
does not require rewriting React components or the project archive.

## Current configuration

```env
NEXT_PUBLIC_MEDIA_ORIGIN=
NEXT_PUBLIC_MEDIA_VERSION=20260902-balanced-v1
```

- Keep `NEXT_PUBLIC_MEDIA_ORIGIN` empty for same-origin `/media/*` delivery.
- Set it to an origin such as `https://media.liuker.space` after copying the
  existing `/media/*` directory to object storage while preserving paths.
- Bump `NEXT_PUBLIC_MEDIA_VERSION` whenever an object is replaced at the same
  path. This enables immutable browser caching without serving stale media.
- Absolute HTTPS URLs in `projects.csv` are intentionally preserved. This is
  the migration seam for assets managed by a video platform instead of a
  path-compatible object store.

## Future adaptive video migration

When HLS/DASH is introduced, keep posters and preview MP4 files on the current
path-compatible CDN and add a provider-specific player only for full videos and
Showreel. The lightweight preview tier should remain an ordinary H.264 MP4 so
the homepage does not need a streaming-player dependency.
