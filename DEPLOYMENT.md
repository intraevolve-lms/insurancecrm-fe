# Deployment

For the full picture (architecture, MongoDB Atlas setup, backups, docker-compose usage), see the
backend repo's [DEPLOYMENT.md](https://github.com/intraevolve-lms/insurancecrm/blob/master/DEPLOYMENT.md).
This file covers only what's specific to this frontend image.

> **Verified locally on 2026-07-05**, built and run together with the backend and a local
> MongoDB via the backend repo's `docker-compose.local.yml` — SPA loads, and `/api/` proxies
> through to the backend correctly (login + an authenticated call both returned 200).

## Image

Multi-stage: `node:20-alpine` runs `npm ci && npm run build`, then the static `dist/` output is
served by `nginx:1.27-alpine` (`nginx.conf`).

## Why there's no backend-URL build arg

The app always calls a **relative** `/api/...` path (`src/lib/axios.ts`) — `VITE_API_BASE_URL`
in `.env` is only used by the Vite *dev server's* proxy target, never by the built app itself.
That means the backend's actual address is never baked into this image at build time — instead,
`nginx.conf` reverse-proxies `/api/` to a container/host named `backend`. **If the Oracle setup
runs the backend under a different service name or on a separate host, update `nginx.conf`'s
`proxy_pass` target to match, then rebuild the image** (this can't be an env var swapped in at
container start, since it's compiled into the nginx config at image build time).

## CI/CD

`.github/workflows/docker-publish.yml` builds and pushes to **GitHub Container Registry**
(`ghcr.io/intraevolve-lms/insuredindex-fe`) on every push to `main`/`master`, authenticating with the
automatic per-run `GITHUB_TOKEN` — no repo secrets to configure. Each push tags `:latest`,
`:<commit-sha>`, and `:v<run-number>` (this repo's own build counter — independent from the
backend's). See the backend's DEPLOYMENT.md for the one-time step to flip the package to public
after its first push, and for how `FRONTEND_TAG` is used to roll back a specific build.

## Verifying a build locally

```bash
docker build -t insuredindex-frontend .
docker run --rm -p 8080:80 insuredindex-frontend
# → http://localhost:8080 (API calls will fail with no "backend" host reachable — that's expected
#   when running this container alone, not through compose)
```
