# LIUKER motion homepage — 2026-11-14

This release applies the approved paper-textured homepage and frontal metal monitor to the production portfolio. The desktop camera follows the monitor, film strip, selected work, creator and contact sections. Mobile, reduced-motion and no-JavaScript visitors get a complete HTML homepage with real project links and contact details.

## Preserved production baseline

- Project: `liuker/liuker.space` (`prj_XWNtIdFAnwMNvFETqusWiPfQUFqw`).
- Domain: `https://liuker.space`.
- Previous deployment: `dpl_2PxoizNakpbvNWsmZ4V4EiUw8J4P`.
- Previous immutable URL: `https://liukerspace-q3irhi7ey-liuker.vercel.app`.
- Previous full commit: `472af4444b799b2e1df1e48b18f69ea2f7092716`.
- Remote backup tag: `rollback/20261114-before-motion`.

The old deployment and original media are retained. The local `deployments/liuker-backup-20261114` folder contains the checked deployment record, source-only ZIP, original tracked-file manifest and rollback script. Large original media remain versioned by the old commit and Git LFS; the ZIP is explicitly a source backup rather than a duplicate of every video.

## Rollback

To restore the previous public deployment, from an authenticated Vercel CLI:

```powershell
vercel rollback dpl_2PxoizNakpbvNWsmZ4V4EiUw8J4P --yes --scope liuker --timeout 60s
```

This restores domain routing; it does not reset GitHub main. For future development on the old source, create a new branch at `rollback/20261114-before-motion`, or revert this release through Git. Do not force-push shared main or delete the old deployment.

## Verification

Use the Vercel build path: `node scripts/sync-projects.mjs`, `tsc --noEmit`, and `next build --webpack`. The old `npm test` is a starter skeleton test, as documented elsewhere in AGENTS.md.

Check desktop chapter links, project navigation, independent showreel, email/phone/WeChat actions, English mode, keyboard focus, pause/resume and source-video failure. At 390px and 768px verify the readable HTML layout and no automatic video requests. With reduced motion or JavaScript disabled, the HTML content and all project/contact links remain available.

The Anton display font is self-hosted under `public/motion/fonts`; its license is included as `OFL.txt`. The existing video/covers and project catalog are retained; only the approved small homepage clip receives a new versioned URL.
