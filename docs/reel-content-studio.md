# ORVA Reel Content Studio

Reel Content Studio lets a client attach one product video, generate reel-ready copy, preview the reel, and test publish a single Instagram Reel.

## What works before Meta approval

- Upload or save a product video in ORVA.
- Generate hook, caption, hashtags, and CTA.
- Edit and save reel copy.
- Preview the reel in a phone-style simulation.
- Copy caption.
- Download video for manual posting.

## Instagram test publishing

Real Instagram Reel publishing requires:

- Instagram Business or Creator account.
- Instagram account linked to the connected Facebook Page.
- Meta Login permissions for `instagram_basic` and `instagram_content_publish`.
- A public video URL. Local blob/data URLs cannot be published by Meta.
- Server-side access token stored in Supabase only.

The frontend never receives the Instagram access token.

## Demo mode

Set:

```bash
NEXT_PUBLIC_META_MOCK_MODE=true
```

In demo mode, Test Publish Reel does not call Meta. ORVA saves a mock social export record and marks the reel as published.

## Database

Run:

```sql
-- scripts/orva-reel-content-studio.sql
```

This adds reel fields to `products` and ensures `social_exports` can store reel attempts.

## MVP safety rules

- No bulk reel publishing.
- No auto-publish.
- The user must click Test Publish Reel.
- Copy/download fallback must continue to work if Meta fails.
- Failed publish attempts are visible to admins at `/admin/social-exports`.
