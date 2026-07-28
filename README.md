# Roll'N Trailer Rentals Platform V2 — Phase 1

This is the first real Next.js application phase.

## Included
- Mobile-first public site
- Fleet loaded live from Supabase
- Dynamic trailer pages
- Live date-overlap availability check
- Supabase magic-link customer login
- Customer portal foundation
- Owner dashboard access control
- LocalBusiness, WebSite and Product structured data
- Existing trailer images

## Required Vercel environment variables
Copy `.env.example` values into Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only; do not expose)
- `NEXT_PUBLIC_SITE_URL`

Use the project's **Connect** dialog in Supabase to get the Project URL and publishable key.
Never put the service role key in browser code or share it publicly.

## Create your owner account
1. Deploy the preview.
2. Open `/login`.
3. Enter your business email and use the emailed magic link.
4. In Supabase SQL Editor, run:
   `update public.profiles set role = 'owner' where email = 'YOUR_EMAIL';`
5. Reopen `/owner`.

## Supabase Auth URL setup
In Supabase: Authentication → URL Configuration
- Site URL: your Vercel preview URL while testing
- Add redirect URL: `https://YOUR-PREVIEW.vercel.app/**`
Later add `https://rollntrailerrentals.com/**`.

## Next phase
- Create booking checkout transaction
- Stripe deposit and saved payment authorization
- Document upload
- Agreement acceptance
- Webhook confirmation
- Email notifications
- Owner calendar and approvals
