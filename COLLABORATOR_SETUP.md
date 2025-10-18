# 🔐 Collaborator Setup Guide

Welcome to the Customer Discovery Assistant project! This guide will help you get the API keys configured without manually copying/pasting secrets.

## ✅ Quick Setup (3 steps)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

This will open your browser for authentication. Sign in with the same account that has access to this project.

### 3. Pull Environment Variables

```bash
vercel env pull .env.local
```

This automatically downloads all API keys (including `ANTHROPIC_API_KEY`) into your local `.env.local` file.

### 4. Start Development

```bash
npm install
npm run dev
```

That's it! 🎉 The app is now running with all the necessary API keys.

---

## 🔍 Verification

Check that your `.env.local` file exists and contains the API key:

```bash
cat .env.local | grep ANTHROPIC_API_KEY
```

You should see the API key listed (but the value will be hidden in your terminal for security).

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `vercel` command not found | Run `npm install -g vercel` |
| Not logged in | Run `vercel login` and authenticate in browser |
| Wrong project linked | Run `vercel link` in the repo root |
| `.env.local` missing after pull | Run `vercel env pull .env.local` again |
| Permission denied | Ask the project owner to add you as a collaborator on Vercel |

---

## 🔄 Updating Environment Variables

If API keys are rotated or updated:

```bash
vercel env pull .env.local
```

This will fetch the latest values from Vercel.

---

## 🚀 Why This Method?

✅ **Secure** - No sharing API keys over Slack/email
✅ **Automatic** - Keys stay in sync across all developers
✅ **Simple** - One command to get all secrets
✅ **Version controlled** - Changes to env vars are tracked in Vercel

---

## 📚 Additional Resources

- [Vercel Environment Variables Docs](https://vercel.com/docs/cli/env)
- [Project Setup Guide](./SETUP.md)
- [Claude.md Project Instructions](./CLAUDE.md)

---

Need help? Contact the project maintainer or check the main [README.md](./README.md).
