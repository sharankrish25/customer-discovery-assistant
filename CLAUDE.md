# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Customer Discovery Assistant - A Next.js 15 application designed to help with customer discovery workflows using Anthropic's Claude API and Supabase for data persistence. The project is currently in its initial setup phase with core dependencies installed but application logic not yet implemented.

**New to the project?** See [SETUP.md](./SETUP.md) for initial setup instructions, especially for configuring environment variables.

## Development Commands

### Running the Development Server
```bash
npm run dev
```
Starts the Next.js development server with Turbopack on http://localhost:3000

### Building for Production
```bash
npm run build
```
Creates an optimized production build using Turbopack

### Running Production Server
```bash
npm start
```
Starts the production server (requires running `npm run build` first)

### Linting
```bash
npm run lint
```
Runs ESLint to check code quality

## Tech Stack & Dependencies

- **Framework**: Next.js 15.5.6 with App Router
- **React**: 19.1.0
- **TypeScript**: 5 (strict mode enabled)
- **Styling**: Tailwind CSS 4.1.14
- **Bundler**: Turbopack (Next.js)
- **AI Integration**: @anthropic-ai/sdk ^0.67.0
- **Backend/Database**: @supabase/supabase-js ^2.75.1

## Architecture

### Directory Structure

```
app/                    # Next.js App Router (React Server Components)
├── layout.tsx         # Root layout with font configuration
├── page.tsx           # Home page
└── globals.css        # Global styles and CSS variables
public/                # Static assets
```

### App Router Pattern

This project uses Next.js 15's App Router with React Server Components:
- All components in `app/` are Server Components by default
- Add `'use client'` directive for Client Components
- API routes should be created as `app/api/[route]/route.ts`

### Path Aliases

TypeScript is configured with path aliases:
```typescript
import { Component } from '@/app/components/Component'
import { helper } from '@/lib/utils'
```

The `@/*` alias maps to the project root directory.

### Styling Approach

- **Tailwind CSS 4** with new syntax (`@import "tailwindcss"`)
- CSS variables for theming in `app/globals.css`:
  - `--background` and `--foreground` for color scheme
  - `--font-geist-sans` and `--font-geist-mono` for fonts
- Dark mode support via `prefers-color-scheme` media query
- Utility-first approach with Tailwind classes

### Font Configuration

The app uses Vercel's Geist font family, loaded via `next/font/google`:
- Geist Sans (primary font)
- Geist Mono (monospace font)

Fonts are applied via CSS variables defined in `app/layout.tsx`.

## Integration Patterns

### Anthropic AI SDK

**Status**: Installed but not yet integrated

When implementing Anthropic integration:
1. Store API key in `.env.local` as `ANTHROPIC_API_KEY`
2. Create API routes in `app/api/` for server-side Claude API calls
3. Never expose API keys to client-side code
4. Use Server Actions or API Routes for all Anthropic SDK calls

Example pattern:
```typescript
// app/api/chat/route.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Supabase

**Status**: Installed but not yet integrated

When implementing Supabase:
1. Create `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for server-side operations)
2. Initialize client in a utility file (e.g., `lib/supabase.ts`)
3. Use client-side SDK for auth and public queries
4. Use service role key only in API routes/Server Actions

## Environment Variables

**For detailed setup instructions, see [SETUP.md](./SETUP.md).**

### Quick Reference

Required environment variables:

```bash
# Anthropic
ANTHROPIC_API_KEY=your_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Team Workflow (Recommended)

For team development, use Vercel's environment variable management:

```bash
# First-time setup (one team member)
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# All team members (including the one who added them)
npm run env:pull
```

This keeps secrets secure, synced, and out of git. See [SETUP.md](./SETUP.md) for full details.

## TypeScript Configuration

- **Strict mode enabled** - all code must be properly typed
- **Target**: ES2017
- **Module resolution**: bundler
- Path aliases configured via `paths` in `tsconfig.json`
- Next.js TypeScript plugin enabled for enhanced type checking

## Code Style & Linting

- ESLint 9 with flat config format (`eslint.config.mjs`)
- Extends `next/core-web-vitals` and `next/typescript`
- Use functional components with TypeScript
- Follow Next.js conventions for file naming:
  - `page.tsx` for pages
  - `layout.tsx` for layouts
  - `route.ts` for API routes
  - `loading.tsx` for loading states
  - `error.tsx` for error boundaries

## Component Patterns

When creating new components:
- Default to Server Components (better performance)
- Use Client Components (`'use client'`) only when needed for:
  - Interactive features (onClick, onChange, etc.)
  - React hooks (useState, useEffect, etc.)
  - Browser APIs
- Keep components in `app/components/` directory
- Use TypeScript interfaces for props

## API Development

When creating API routes:
1. Create in `app/api/[route]/route.ts`
2. Export named functions: `GET`, `POST`, `PUT`, `DELETE`, etc.
3. Use `NextRequest` and `NextResponse` types
4. Handle errors with try-catch and return appropriate status codes
5. Keep all sensitive operations server-side

Example structure:
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Process request
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

## Current State

This is a fresh Next.js project with:
- ✅ Core dependencies installed
- ✅ TypeScript and ESLint configured
- ✅ Tailwind CSS 4 setup complete
- ✅ Font optimization configured
- ❌ No API routes implemented
- ❌ No custom components
- ❌ No Anthropic integration
- ❌ No Supabase integration
- ❌ No environment variables configured
- ❌ No testing framework setup

When implementing new features, follow Next.js 15 best practices for the App Router and leverage Server Components for optimal performance.
