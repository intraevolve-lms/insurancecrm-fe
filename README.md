# InsuranceCRM — Frontend

React 19 / TypeScript / Vite frontend for the InsuranceCRM backend ([insurancecrm](https://github.com/Nawaz027/insurancecrm)). Customer & lead management, communication logging, agent performance, and a renewal-focused dashboard.

## Prerequisites

- Node.js 18+
- The [backend](https://github.com/Nawaz027/insurancecrm) running and reachable (see `.env`)

## Environment variables

Create a `.env` file (see `.env` for the current local example — it is not committed):

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8081` | Base URL of the backend API. |

## Running locally

```bash
npm install
npm run dev
```

Starts the dev server on **http://localhost:3000**, proxying `/api` requests to the backend.

## Running tests

```bash
npm test        # run once
npm run test:watch
```

Vitest + React Testing Library. No backend/network dependency — API calls are mocked per test.

## Building

```bash
npm run build
```

## Tech stack

React 19, TypeScript, Vite, TanStack Query, Zustand, React Router, Tailwind CSS, Radix UI, Axios.
