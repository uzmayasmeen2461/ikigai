# Facebook Page Product Export

ORVA supports a safe MVP flow for publishing one inventory product at a time to a connected Facebook Page.

## MVP Scope

- Facebook Page posts are supported.
- Facebook Marketplace is not part of this MVP.
- ORVA does not bulk publish all products.
- Always test one product first.

## Required Meta Permissions

Reconnect Facebook after enabling Page export so Meta can grant:

- `public_profile`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`

ORVA loads the managed Facebook Pages after login and securely stores the first Page ID and Page access token on the server.

While the Meta app is in development mode, the Facebook account used for testing must have an app role and must manage at least one Facebook Page. Before publishing for accounts outside the app roles, complete Meta App Review and request the required Page permissions for the app.

## Test One Product

1. Run `scripts/orva-facebook-page-export.sql` in Supabase SQL Editor.
2. Disconnect Facebook from `/dashboard/connections`.
3. Reconnect Facebook and approve the Page permissions.
4. Open `/dashboard/products`.
5. Click **Export to Facebook Page** for one product.
6. Review the caption.
7. Use **Copy Caption** as a manual fallback.
8. Click **Publish Test Post**.

If a product has an image URL, ORVA publishes a Page photo with a caption. Without an image URL, ORVA publishes a Page feed post.

## Security

Facebook Page access tokens stay backend-only in `social_connections`. The frontend never receives a Page token, Meta app secret, or raw credential.
