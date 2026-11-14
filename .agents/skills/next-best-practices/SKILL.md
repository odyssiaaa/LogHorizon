---
name: next-best-practices
description: Next.js App Router and fullstack best practices covering React Server Components, server actions, route handlers, data caching, dynamic rendering, metadata SEO, and bundle optimization.
---

# Next.js Best Practices & Architecture Guide

Comprehensive architectural patterns and production guidelines for Next.js applications (App Router, Turbopack, React 19).

## Core Principles

### 1. Server Components vs Client Components
- **Default to Server Components (RSC):** Keep data fetching, database access (Prisma / Neon), secrets, and heavy dependencies on the server.
- **Isolate Client Components (`"use client"`):** Only use client boundaries at the leaves of the component tree for interactivity (event listeners, `useState`, `useEffect`, browser APIs).
- **Pass Server Components as Children:** Avoid importing Server Components directly into Client Components; pass them as `children` or props to preserve server rendering.

### 2. Data Fetching & Mutation
- **Parallel Data Fetching:** Use `Promise.all` or independent async RSC trees with Suspense boundaries to prevent sequential waterfall bottlenecks.
- **Server Actions & Route Handlers:** Validate inputs strictly (Zod or type guards), verify session / authentication at the beginning of the action, and handle errors gracefully.
- **Cache & Revalidation:** Use `revalidatePath` and `revalidateTag` strategically. Use `unstable_cache` or native `fetch` cache options appropriately.

### 3. Performance & Asset Optimization
- **Image Optimization:** Always use `next/image` with explicit `width`, `height`, or `fill` with `sizes` to eliminate layout shifts (CLS).
- **Font Optimization:** Use `next/font` for zero-layout-shift self-hosted font loading.
- **Dynamic Imports:** Use `next/dynamic` with `ssr: false` for client-only widgets or heavy third-party bundles (e.g. charts, rich text editors).

### 4. SEO & Metadata
- **Static & Dynamic Metadata:** Export `metadata` object for static routes and `generateMetadata` for dynamic params (`[id]`, `[username]`).
- **OpenGraph & Twitter Cards:** Include title, description, URL, and canonical image tags for Discord, Twitter, and search engine link previews.

### 5. Error & Loading Boundaries
- Provide `loading.tsx` with clean Skeleton loaders for instant visual feedback.
- Provide `error.tsx` (Client Component) with recovery actions (`reset()`) and `not-found.tsx` for missing entities.
