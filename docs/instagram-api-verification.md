# Instagram API Verification

ORVA publishes Instagram posts through the Instagram Graph API. The app never exposes Page tokens or Instagram tokens to the browser.

## Required Meta setup

1. Use a Facebook Page that is linked to an Instagram professional account.
2. In Meta Developer Dashboard, configure Facebook Login with the same redirect URI used by ORVA:
   `http://localhost:3000/api/auth/facebook/callback`
3. Request these scopes during login:
   `public_profile`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`
4. Reconnect Facebook from ORVA Connections after changing permissions.

## Verify in ORVA

1. Go to `/dashboard/connections`.
2. Connect Facebook.
3. If Meta returns a linked Instagram professional account, the Instagram card shows Connected.
4. Click `Verify Instagram`.
5. ORVA calls the backend `/api/instagram/verify` route, checks the Instagram account with Graph API, and stores the safe verification metadata in Supabase.

## Publish test

1. Use a product with a public image URL. Instagram does not accept local `data:` image URLs.
2. Go to Products.
3. Click the Instagram `Publish` button.
4. Review or edit the caption.
5. Click `Publish Instagram Post`.

If publishing fails with a permissions message, enable the missing Meta permissions and reconnect.
