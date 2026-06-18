-- ORVA Instagram publishing + WhatsApp catalog sync tracking
-- Run once after scripts/orva-facebook-page-export.sql.

alter table public.social_exports drop constraint if exists social_exports_channel_check;
alter table public.social_exports add constraint social_exports_channel_check
    check (channel in ('facebook', 'facebook_page', 'instagram', 'whatsapp', 'whatsapp_catalog', 'instagram_reel', 'facebook_reel', 'whatsapp_status'));
