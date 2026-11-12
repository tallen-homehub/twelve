# Setup

About 20 minutes the first time. Everything here happens in the Supabase and Vercel dashboards; no terminal needed.

## 1. Create the database (Supabase)

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Open `supabase/migrations/20261111000001_init.sql` in GitHub, click **Raw**, copy everything, paste it into the editor, click **Run**. You should see "Success. No rows returned."
3. Run each later file in `supabase/migrations/` the same way, in filename order, only once each.

## 2. Turn on phone login with test numbers (no real texts yet)

Supabase requires an SMS provider to be filled in even for test numbers, but it never uses it for them.

1. **Authentication → Sign In / Providers → Phone**: turn it on.
2. SMS provider: **Twilio**. Account SID, Auth Token and Message Service SID: type `placeholder` in each.
3. **Test Phone Numbers and OTPs**: add your number and a fake rep number with fixed codes, for example
   `1435XXXXXXX=123456, 15550000001=111111`. Use the country code (1) and no `+`.
4. **Test OTPs Valid Until**: a date after the demo (e.g. Mar 1, 2027). Remove test numbers before real launch.
5. Save.

## 3. Invite yourself as admin

In **SQL Editor**, run (with your real number, in +1 format):

```sql
insert into public.invites (phone, full_name, role) values ('+1435XXXXXXX', 'Tallen Tipton', 'admin');
insert into public.invites (phone, full_name, role, rep_type) values ('+15550000001', 'Test Rep', 'rep', 'setter');
```

A number without an invite can log in but sees "you're not on the list yet" and nothing else.

## 4. Deploy (Vercel)

1. **Add New → Project → Import** `tallen-homehub/twelve`.
2. Before clicking Deploy, open **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase → Project Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: same page, the `anon` / publishable key
3. Deploy. Open the link on your phone, log in with your test number and code.
4. On iPhone: Share → **Add to Home Screen** to install it like an app.

Keys added later in the week (Vercel → Settings → Environment Variables, then Redeploy):
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`.
Never paste keys into chat or commit them to the repo.

## 5. Supabase auth URL

Supabase → **Authentication → URL Configuration** → set **Site URL** to your Vercel link.
