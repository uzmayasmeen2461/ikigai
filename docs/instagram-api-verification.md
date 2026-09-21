# Instagram API Verification

ORVA publishes Instagram posts through the Instagram API with Instagram Login. The app never exposes Instagram tokens to the browser.

## Required Meta setup

1. Use an Instagram professional account.
2. Configure Instagram Business Login with this redirect URI:
   `http://localhost:3000/api/auth/instagram/callback`
3. Request `instagram_business_basic` and `instagram_business_content_publish`.
4. Reconnect Instagram from ORVA Connections after changing permissions.

## Verify in ORVA

1. Go to `/dashboard/connections`.
2. Connect Instagram independently.
3. The Instagram card shows the professional account returned by Instagram Business Login.
4. Click `Verify Instagram`.
5. ORVA calls the backend `/api/instagram/verify` route, checks the Instagram account with Graph API, and stores the safe verification metadata in Supabase.

## Publish test

1. Use a product with a public image URL. Instagram does not accept local `data:` image URLs.
2. Go to Products.
3. Click the Instagram `Publish` button.
4. Review or edit the caption.
5. Click `Publish Instagram Post`.

If publishing fails with a permissions message, enable the missing Meta permissions and reconnect.
