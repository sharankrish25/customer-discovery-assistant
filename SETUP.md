# Setup Guide

This guide walks you through setting up the Customer Discovery Assistant for local development.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- [Vercel CLI](https://vercel.com/docs/cli) installed (`npm i -g vercel`)
- Anthropic API key ([get one here](https://console.anthropic.com/))
- Supabase project ([create one here](https://supabase.com/))

## 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd customer-discovery-assistant
npm install
```

## 2. Environment Variables (Team Workflow)

### ✅ Recommended: Vercel Environment Variables (for teams)

This approach keeps secrets secure and synced across your team without committing them to git.

#### First-time setup (run once by one team member):

1. **Link your project to Vercel** (if not already linked):
   ```bash
   vercel link
   ```

2. **Add environment variables to Vercel**:
   ```bash
   vercel env add ANTHROPIC_API_KEY
   ```
   - Paste your Anthropic API key when prompted
   - Select **all three environments**: `production`, `preview`, `development`

   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   ```
   - Paste your Supabase URL (from Supabase dashboard → Settings → API)
   - Select all three environments

   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   - Paste your Supabase anon key
   - Select all three environments

3. **Verify variables are stored**:
   ```bash
   vercel env ls
   ```

#### Every team member (including the person who added them):

1. **Pull environment variables locally**:
   ```bash
   npm run env:pull
   ```

   Or manually:
   ```bash
   vercel env pull .env.local
   ```

   This creates/updates `.env.local` with the latest values from Vercel.

2. **Done!** Your `.env.local` is now populated and ready for local development.

---

### 🔄 Keeping environment variables in sync

Whenever environment variables are updated in Vercel, all team members should run:

```bash
npm run env:pull
```

---

### 🔐 Security benefits of this approach

| Benefit                          | Why it matters                                    |
| -------------------------------- | ------------------------------------------------- |
| ✅ No secrets in git             | `.env.local` is gitignored by default             |
| ✅ No copy-paste via Slack/email | Reduces risk of leaking keys                      |
| ✅ Always in sync                | Everyone gets the same values                     |
| ✅ Easy key rotation             | Update in Vercel → team runs `npm run env:pull`  |
| ✅ Works in CI/CD                | Vercel deployments automatically use these values |

---

### 🛠️ Alternative: Manual `.env.local` (local-only development)

If you're working solo or prefer manual setup:

1. **Create `.env.local`** in the project root:
   ```bash
   touch .env.local
   ```

2. **Add your environment variables**:
   ```bash
   # Anthropic
   ANTHROPIC_API_KEY=your_anthropic_api_key_here

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Never commit this file** — it's already in `.gitignore`

---

## 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Verify Environment Variables Are Loaded

You can verify your environment variables are correctly loaded by checking the API routes work:

```bash
# Once you have API routes implemented, test them:
curl http://localhost:3000/api/health
```

Or add a temporary check in `app/page.tsx`:

```typescript
// Temporary debug check (remove after verifying)
console.log('Anthropic API key exists:', !!process.env.ANTHROPIC_API_KEY);
console.log('Supabase URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
```

---

## 5. Build and Test Production Build

```bash
npm run build
npm start
```

---

## Troubleshooting

### "Missing environment variables" error

1. Run `npm run env:pull` to sync from Vercel
2. Verify `.env.local` exists and has the correct variables
3. Restart your dev server (`npm run dev`)

### "vercel: command not found"

Install the Vercel CLI globally:

```bash
npm i -g vercel
```

### Environment variables not updating

1. Delete `.env.local`
2. Run `npm run env:pull` again
3. Restart dev server

### Want to rotate API keys?

1. **Remove old key from Vercel**:
   ```bash
   vercel env rm ANTHROPIC_API_KEY
   ```

2. **Add new key**:
   ```bash
   vercel env add ANTHROPIC_API_KEY
   ```

3. **All team members pull new value**:
   ```bash
   npm run env:pull
   ```

---

## Next Steps

- Read the [CLAUDE.md](./CLAUDE.md) for development guidelines
- Check `lib/` for Anthropic and Supabase integration patterns
- Review Next.js 15 App Router docs: https://nextjs.org/docs

---

## Quick Reference

| Command              | Purpose                                 |
| -------------------- | --------------------------------------- |
| `npm install`        | Install dependencies                    |
| `npm run dev`        | Start development server                |
| `npm run build`      | Build for production                    |
| `npm start`          | Run production server                   |
| `npm run lint`       | Lint code                               |
| `npm run env:pull`   | Sync environment variables from Vercel  |
| `vercel env ls`      | List all environment variables in Vercel|
| `vercel env add`     | Add new environment variable            |
| `vercel env rm`      | Remove environment variable             |
