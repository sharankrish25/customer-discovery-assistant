# Deployment Checklist

## Environment Variables Required

The following environment variables must be set in your Vercel deployment:

### Required
- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude AI
  - Get it from: https://console.anthropic.com/
  - Format: `sk-ant-...`

### Optional
- `NEXT_PUBLIC_SUPABASE_URL` - If using Supabase features
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - If using Supabase features

## Pre-Deployment Checklist

✅ **Dependencies**
- All required dependencies are in package.json
- `zod` dependency has been added
- `@anthropic-ai/sdk` is included

✅ **API Routes**
- `/api/analyze` - Main analysis endpoint (FIXED)
- `/api/coach` - Interview coaching
- `/api/next-questions` - Generate follow-up questions
- `/api/followup` - Generate follow-up emails

✅ **Build Process**
- `npm run build` passes successfully
- No TypeScript errors
- No linting errors
- All imports resolve correctly

✅ **Prompt Files**
- All prompt files are included in `/prompts/` directory
- Prompt files are readable by the application

## Deployment Steps

1. **Set Environment Variables in Vercel:**
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Verify Deployment:**
   - Check that all API routes respond correctly
   - Test the main analysis flow
   - Verify environment variables are accessible

## Common Deployment Issues Fixed

1. **Missing Dependencies:**
   - Added `zod` to package.json dependencies
   - All imports now resolve correctly

2. **Missing API Route:**
   - Created `/app/api/analyze/route.ts` 
   - Handles interview analysis requests

3. **Environment Variables:**
   - Application gracefully handles missing API keys
   - Clear error messages for debugging

## Testing the Deployment

After deployment, test these endpoints:

1. **POST /api/analyze**
   ```json
   {
     "interviewId": "test-123",
     "transcript": "Sample interview transcript...",
     "productIdea": "Sample product idea..."
   }
   ```

2. **POST /api/coach**
   ```json
   {
     "interviewId": "test-123",
     "transcript": "Sample interview transcript..."
   }
   ```

3. **POST /api/next-questions**
   ```json
   {
     "interviewId": "test-123",
     "transcript": "Sample interview transcript...",
     "productIdea": "Sample product idea..."
   }
   ```

4. **POST /api/followup**
   ```json
   {
     "interviewId": "test-123",
     "transcript": "Sample interview transcript...",
     "insights": {...},
     "customerName": "John Doe"
   }
   ```

## Troubleshooting

If deployment still fails:

1. Check Vercel build logs for specific errors
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Check that all file paths are correct
5. Verify TypeScript compilation passes

The application should now deploy successfully to Vercel!
