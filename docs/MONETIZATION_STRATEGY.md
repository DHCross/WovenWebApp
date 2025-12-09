# Monetization Strategy — Simpler Alternatives to Auth0

## The Problem with Auth0

Auth0 is excellent for user identity management at scale, but it introduces significant friction for solo/indie projects:

- **Configuration complexity**: Redirect URIs, callback paths, audience/issuer mismatches
- **Environment coupling**: Different configs for local, staging, production
- **Token lifecycle**: Silent refresh, expired tokens, CORS issues
- **Third-party dependency**: Outages, pricing changes, API deprecations
- **Testing friction**: Can't easily test flows without real credentials

For Raven Calder, you don't need to *identify* users. You need to *gate access*. Those are different problems.

---

## Simpler Alternatives

### Option 1: Static License Keys (Recommended for MVP)

**How it works:**
- You generate unique license keys (e.g., `RAVEN-XXXX-XXXX-XXXX`)
- Users enter their key once; it's stored in `localStorage`
- Backend validates key against a simple allowlist (env var or JSON file)

**Pros:**
- Zero external dependencies
- Works offline after initial validation
- Easy to revoke (remove from list)
- No redirect flows, no tokens, no CORS
- Can be sold via Gumroad, Stripe, Ko-fi, etc.

**Cons:**
- Keys can be shared (solvable with device limits)
- No user identity (you know a key is valid, not *who* is using it)
- Manual key generation

**Complexity: ⭐ (Very Low)**

```javascript
// Example validation
const VALID_KEYS = process.env.LICENSE_KEYS?.split(',') || [];
if (!VALID_KEYS.includes(providedKey)) return 401;
```

---

### Option 2: Usage-Based Tokens (For Pay-Per-Use)

**How it works:**
- User buys "credits" (e.g., 10 readings for $5)
- Each credit is a single-use token stored in a database
- Token is consumed on each Poetic Brain call

**Pros:**
- Natural paywall without subscriptions
- Low commitment entry point for users
- Can offer free credits to new users

**Cons:**
- Requires a database (even a simple one like Netlify Blobs, Supabase, or a JSON file)
- Need to track consumption per token

**Complexity: ⭐⭐ (Low)**

---

### Option 3: Signed URLs / Time-Limited Access

**How it works:**
- Generate a URL with an embedded signature and expiration (like AWS pre-signed URLs)
- URL is valid for N days/uses
- No login required; whoever has the URL can access

**Pros:**
- Zero user management
- Great for gift links or one-time purchases
- Can be generated dynamically after payment

**Cons:**
- URLs can be shared (but expire)
- Not suitable for recurring subscriptions

**Complexity: ⭐⭐ (Low)**

---

### Option 4: Stripe Checkout → Session Token

**How it works:**
- User clicks "Buy Access" → redirected to Stripe Checkout
- After payment, Stripe webhook creates a session token
- Token stored in browser, validated by backend

**Pros:**
- Payment and access flow integrated
- No Auth0; Stripe handles the hard part
- Supports subscriptions if you want them later

**Cons:**
- Still requires webhook handling
- Need to store tokens somewhere (can be in-memory for MVP)

**Complexity: ⭐⭐⭐ (Medium)**

---

### Option 5: Magic Links (Email-Based Access)

**How it works:**
- User enters email → receives a link with embedded token
- Clicking link logs them in (token stored in browser)
- No passwords, no OAuth

**Pros:**
- Familiar UX ("passwordless")
- Email = identity without OAuth
- Can integrate with email marketing

**Cons:**
- Requires email sending (via Resend, SendGrid, Postmark)
- Users can be locked out if they lose email access

**Complexity: ⭐⭐⭐ (Medium)**

---

## My Recommendation

For your current situation (testing, solo dev, need to ship):

### Phase 1: Static License Keys
1. Generate 10-20 keys manually
2. Store in a `.env` variable: `LICENSE_KEYS=RAVEN-XXXX,RAVEN-YYYY,...`
3. Add a simple form to enter key (stores in localStorage)
4. Validate on API calls: if key in list → proceed, else → 401
5. Sell keys via Gumroad/Stripe (one-time payment)

**Time to implement: 1-2 hours**

### Phase 2 (Later): Stripe Integration
Once you have paying customers and want to automate:
1. Add Stripe Checkout for purchases
2. Use Stripe webhooks to auto-generate keys
3. Email keys to buyers automatically

---

## Architecture Sketch for License Keys

```
┌─────────────────────────────────────────────────────────┐
│  User Browser                                           │
├─────────────────────────────────────────────────────────┤
│  1. Enters license key on /activate page                │
│  2. Key saved to localStorage                           │
│  3. Key sent with each API request (header or body)     │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  API Route (/api/raven, /api/poetic-brain)              │
├─────────────────────────────────────────────────────────┤
│  1. Extract key from request                            │
│  2. Check against LICENSE_KEYS env var                  │
│  3. If valid → process request                          │
│  4. If invalid → return 401 "Invalid license key"       │
└─────────────────────────────────────────────────────────┘
```

---

## Questions to Consider

1. **Do you need to identify users, or just gate access?**  
   If just gating → license keys are perfect.

2. **Do you want subscriptions or one-time purchases?**  
   One-time → license keys. Recurring → eventually add Stripe.

3. **How many users do you expect in the first 6 months?**  
   Under 100 → manual key management is fine.

4. **Do users need accounts for other reasons (saved profiles, history)?**  
   If yes → consider Magic Links or simple email-based accounts later.

---

## Next Steps

1. ✅ Keep Auth0 disabled (already done)
2. 📝 Decide on Option 1 (license keys) vs another approach
3. 🛠️ When ready, I can implement the license key flow in ~1 hour
4. 💰 Set up a simple purchase page on Gumroad or Stripe

Let me know which direction resonates, and I'll help you build it when you're ready!
