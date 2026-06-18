# Facebook Login Local Setup

Use this checklist before testing the ORVA Facebook connection locally.

## ORVA Environment

Add these values to `.env.local`:

```env
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
NEXT_PUBLIC_META_MOCK_MODE=false
NEXT_PUBLIC_FACEBOOK_APP_ID=your_meta_app_id
NEXT_PUBLIC_FACEBOOK_REDIRECT_URI=http://localhost:3000/api/auth/facebook/callback
```

`META_APP_SECRET` is server-only. Never expose it in browser code or prefix it with `NEXT_PUBLIC_`.

## Meta Developer Dashboard

1. Open **App Settings → Basic**.
2. Add `localhost` under **App Domains**.
3. Add a **Website** platform with:

   `http://localhost:3000/`

4. Open **Facebook Login → Settings**.
5. Add this exact **Valid OAuth Redirect URI**:

   `http://localhost:3000/api/auth/facebook/callback`

6. Save the changes.

ORVA requests:

- `public_profile`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`

ORVA does not request the `email` scope. Disconnect and reconnect Facebook after adding Page publishing so Meta can grant the new Page permissions.

## If Facebook Stays Connecting

If ORVA returns to a failed state after the OAuth window expires, the callback did not complete. Check:

1. `NEXT_PUBLIC_META_MOCK_MODE=false`
2. The Meta app is using the same App ID as `META_APP_ID`.
3. **Facebook Login → Settings → Client OAuth Login** is enabled.
4. **Facebook Login → Settings → Web OAuth Login** is enabled.
5. The valid redirect URI matches exactly:

   `http://localhost:3000/api/auth/facebook/callback`

6. The Meta app account you use for testing has access to the app while the app is in development mode.

## Demo Mode

Set `NEXT_PUBLIC_META_MOCK_MODE=true` to test the Connections card without calling Meta. Clicking **Connect Facebook** simulates a successful connection after one second.
