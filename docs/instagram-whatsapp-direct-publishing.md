# Instagram Publishing and WhatsApp Catalog Sync

ORVA supports reviewed single-product publishing. Tokens remain server-side.

## Install the tracking migration

Run these files in Supabase SQL Editor:

1. `scripts/orva-social-connections.sql`
2. `scripts/orva-facebook-page-export.sql`
3. `scripts/orva-instagram-whatsapp-publishing.sql`

## Instagram

Instagram publishing requires:

- an Instagram professional account
- the Instagram account linked to the connected Facebook Page
- Meta Login permissions: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, and `pages_manage_posts`
- a publicly accessible product image URL

After Meta permissions are enabled, disconnect and reconnect Facebook from ORVA Connections. ORVA stores the Instagram professional account and Page token server-side.

## WhatsApp catalog

WhatsApp catalog sync requires:

- a Meta Commerce catalog
- the catalog linked to the WhatsApp Business Account in Meta Business Manager
- a server-side token with `catalog_management` and `business_management`
- a publicly accessible product image URL

Configure:

```env
WHATSAPP_CATALOG_ID=
WHATSAPP_WABA_ID=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
PRODUCT_STORE_BASE_URL=
```

`PRODUCT_STORE_BASE_URL` should be the public base URL used for product links. During an early demo, ORVA falls back to the product image URL if it is omitted.

## Real testing

Set:

```env
NEXT_PUBLIC_META_MOCK_MODE=false
```

Restart the Next.js server after changing environment variables.

Test one product first from `Dashboard -> Products`:

1. `Publish Instagram Post`
2. `Sync WhatsApp Catalog`

Each API attempt is stored in `public.social_exports`.
