# ORVA AI Reel Enhancer

The AI Reel Enhancer is a template-based MVP layer for making basic inventory reels look more premium.

It is not a full AI video generation system like Filmora, CapCut, Kling, or Runway. The current implementation uses browser-based rendering with ORVA templates, product image slides, zoom/pan motion, transitions, overlays, CTA cards, and music-style placeholders.

## Flow

1. Client selects product images in Reel Studio.
2. Client generates a basic reel.
3. Client clicks **Make it Premium**.
4. Client chooses a template:
   - Premium Sale
   - New Arrival
   - Best Sellers
   - Festival Offer
   - Luxury Product Showcase
5. Client customizes hook, CTA, music style, overlays, offer badge, and ORVA watermark.
6. ORVA renders a premium reel in the browser and uploads it to Supabase Storage.
7. The backend saves the enhanced reel URL and increments monthly usage.

## Limits

Enhanced reels are credit-limited by plan:

- Starter / Inventory Ready / Photo-to-Inventory: 5 enhanced reels per month
- Growth: 20 enhanced reels per month
- Managed: 50 enhanced reels per month

Basic reels remain available even if enhancement fails or credits are exhausted.

## Rendering

The MVP renderer is template-based and browser-side. It supports:

- 9:16 vertical output
- Product image slides
- Zoom/pan motion
- Fade transitions
- Product name overlays
- Price overlays
- Offer badges
- Hook text
- CTA end card
- ORVA watermark toggle
- Music-style placeholder metadata

Paid AI video APIs can be added later behind the same `/api/reels/enhance` flow.

## Required SQL

Run:

```sql
scripts/orva-ai-reel-enhancer.sql
```

This creates:

- `reels`
- `reel_usage`
- updated `social_exports` reel channel constraints

## Safety

- The backend verifies the client owns the reel.
- Enhancement requires an active subscription.
- Usage count is tracked server-side.
- Supabase service keys are never exposed to the browser.
- If enhancement fails, the basic reel URL is not deleted.
