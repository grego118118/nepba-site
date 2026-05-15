# Birdsong Yoga — Northampton, MA

A bespoke website for **Maggie d'Amour**, a 500-RYT yoga teacher, lifelong birder, and founder of *Birdsong Yoga* in Northampton, Massachusetts.

This folder is a self-contained static site — drop it on Vercel, Netlify, GitHub Pages, or any static host and it works. No build step, no framework, no lock-in. The booking page is wired for **Stripe Checkout** (instructions below).

---

## What's included

```
yoga-studio/
├── index.html          # Single-page site: hero, about, classes,
│                         schedule, pricing, retreats, testimonials,
│                         journal, newsletter, contact, footer
├── book.html           # Multi-step booking + Stripe checkout flow
├── css/styles.css      # Design system + all components (~1,000 lines)
├── js/main.js          # Nav, mobile menu, reveal animations,
│                         schedule renderer, newsletter, contact
└── js/book.js          # Plan + class selection, order summary,
                          Stripe handoff (demo mode by default)
```

---

## Running it locally

It's just static files. Either:

```bash
# Option 1 — open in a browser
open yoga-studio/index.html

# Option 2 — serve with any static server
cd yoga-studio
python3 -m http.server 8080
# → http://localhost:8080
```

---

## Brand system

- **Voice:** quiet, careful, slightly literary. Maggie's bird-watching shapes the metaphor library — *birdsong, dawn chorus, the meadow, the migration*.
- **Palette:**
  - Forest `#2D3E2F` (primary)
  - Forest Deep `#1C2A1F` (dark sections)
  - Cream `#F4EFE6` (background)
  - Cream Warm `#ECE4D4` (alt background)
  - Sage `#7A9B7E` (eyebrows, accents)
  - Gold `#C89358` (CTAs, highlights)
- **Type:** Cormorant Garamond (display, italics) + Inter (body/UI). Both via Google Fonts.
- **Logo:** A custom SVG bird mark (defined inline in `index.html`). Replace with a polished version when Maggie has one.

---

## The Stripe payment integration

The booking page (`book.html`) is fully wired for **Stripe Checkout**. To go live:

### 1. Create products in Stripe

In your Stripe Dashboard, create one **Product + Price** per plan:

| Plan                          | Type        | Suggested Stripe price ID    |
|-------------------------------|-------------|------------------------------|
| First Class ($15)             | one-time    | `price_intro`                |
| Drop-In ($22)                 | one-time    | `price_dropin`               |
| 10-Class Pack ($180)          | one-time    | `price_pack10`               |
| Flock Membership ($149/mo)    | recurring   | `price_flock`                |
| Outdoor Flow @ Arcadia ($25)  | one-time    | `price_outdoor`              |
| Spring Migration Retreat      | one-time    | `price_spring`               |

Paste the actual `price_…` IDs into the `PLANS` array at the top of `js/book.js`.

### 2. Stand up a small server endpoint

The frontend posts to `/api/create-checkout-session` and expects `{ url }` back. A complete Vercel/Next.js example:

```ts
// /api/create-checkout-session/route.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { priceId, mode, customer } = await req.json();
  const session = await stripe.checkout.sessions.create({
    mode,                      // "payment" or "subscription"
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: customer.email,
    success_url: `${process.env.SITE_URL}/book.html?status=ok`,
    cancel_url:  `${process.env.SITE_URL}/book.html?status=cancel`,
    metadata: {
      planId: customer.planId ?? "",
      classId: customer.classId ?? "",
      firstTime: String(customer.firstTime ?? false),
      phone: customer.phone ?? "",
      name: customer.name ?? ""
    }
  });
  return Response.json({ url: session.url });
}
```

### 3. Flip the switch

In `js/book.js`:

```js
const STRIPE_LIVE = true;
```

Done. Until then, the booking flow runs in **demo mode** (it simulates a successful checkout with a confirmation modal) so the site is fully demo-able for sales calls.

### Webhooks (recommended next step)

Set up a `/api/stripe-webhook` listening for `checkout.session.completed` and `customer.subscription.created` to:
- Email Maggie a notification ("Sarah just booked Sunrise Birdsong Flow")
- Email the customer a calendar invite (.ics)
- Insert the booking into a Google Calendar / studio CRM
- Apply the membership benefits in your booking system

---

## Deployment

### Vercel (recommended — gives you the API route too)

```bash
npm i -g vercel
cd yoga-studio
vercel
```

### Netlify

```bash
npm i -g netlify-cli
cd yoga-studio
netlify deploy --prod --dir=.
```

### Custom domain

`birdsongyoga.com` would be the obvious pick. Confirm availability and set DNS to whichever host you use.

---

## Other ideas to pitch Maggie (extras beyond the base $10k)

These are the upsells / phase-2 ideas referenced in the cold-call email:

### Booking & operations
1. **Two-way Google Calendar sync** so Maggie's personal calendar and the studio schedule stay in lockstep.
2. **Class capacity + waitlist** with auto-promotion when someone cancels.
3. **Apple/Google Wallet pass** for the Flock Membership — single tap at the door.
4. **QR sign-in at the studio** — students show a QR at the door to clock in to class.

### Community & engagement
5. **"Sightings" map** — a community page where students log birds they've spotted on Friday walks (Mapbox + a tiny Postgres table).
6. **Sunrise Birdsong podcast** with embedded player + transcripts. Cross-post to Spotify/Apple.
7. **Bird-of-the-week email**, auto-sent each Sunday with the upcoming schedule. Connect to Resend or Buttondown.
8. **A small shop**: Birdsong-branded mats, totes, field guides. Stripe handles it; Printful handles fulfillment.

### Programs & products
9. **Bird-watching + yoga retreat package** — premium tier: a 5-day retreat in late spring with a guest naturalist, lodging at a bed & breakfast, and a guided trip to Mt. Tom. $1,200+ per person.
10. **Corporate / wellness program** for nearby Smith College, Cooley Dickinson Hospital, MassMutual — recurring on-site classes billed monthly.
11. **Online video library** for members — a Vimeo OTT-style archive of recorded classes (`flock.birdsongyoga.com`).
12. **Private session booking** with hourly availability and per-session pricing.

### Storytelling
13. **A field-notes blog** (the `Journal` section) with a real CMS — Sanity or Contentful — so Maggie can post without touching code.
14. **An "About the Studio" mini-documentary** — a 90-second loop of birds, yoga, the river, scored with the dawn chorus. Lives in the hero or as a `Story` page.
15. **Seasonal microsites** — `birdsongyoga.com/migration` for spring retreats, `…/foliage` for autumn. Drives email signups.

### Local SEO & growth
16. **Google Business Profile setup**, schema.org `LocalBusiness` markup, review request automation after each class.
17. **First-class voucher landing page** for paid Meta ads targeting Northampton / Florence / Easthampton / Amherst.
18. **A referral program** — "refer a friend, get a free class" — handled via a unique URL per member.

---

## Cold-call email draft for Maggie

> **Subject:** A first sketch — *birdsongyoga.com*
>
> Hi Maggie,
>
> I came across your plans for a yoga studio in Northampton and your love of birds got me thinking — I built a quick concept site to show you what's possible.
>
> Take a look: **[link]**
>
> A few things I built in:
> - A signature class — *Sunrise Birdsong Flow* — that ties your two passions together
> - Online booking + Stripe payments for drop-ins, 10-class packs, and an unlimited "Flock" monthly membership
> - A standing offer: monthly outdoor classes at the Arcadia Wildlife Sanctuary, plus free Friday morning bird walks from the studio steps
> - Spring & autumn retreats (migration season + foliage) priced as premium weekends
> - A Sunday newsletter, a journal section, and a layout that looks beautiful on a phone in a car
>
> I'd love to walk you through it — and a dozen other ideas that didn't make this round (a "sightings" community map, a corporate wellness program for Smith College and Cooley Dickinson, a small Birdsong-branded shop). Free for fifteen minutes this week?
>
> Warmly,
> *[Your name]*

---

## A few notes on craft

- All animations respect `prefers-reduced-motion`.
- All interactive elements are keyboard accessible and have visible focus states.
- The site uses semantic HTML5 (`<header>`, `<nav>`, `<section>`, `<article>`, `<figure>`) so it lands well in screen readers and search engines.
- Images are hot-linked from Unsplash for the demo. Replace with Maggie's own photography before launch — the site will look 10× better with real Northampton imagery.
- Bird silhouettes in the hero, the about section, and the logo are all hand-tuned inline SVG, so they scale crisply on retina displays.

---

*Built with care for Maggie d'Amour's Birdsong Yoga.*
