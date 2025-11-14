Of course. Here is the updated version of your development and architecture guide, revised to reflect your successful migration to a **pure Next.js App Router architecture**.

The old problems caused by the "hybrid beast"—the conflicts between static HTML and the Next.js app—are now resolved. This document outlines the new, simpler, and more robust setup.

-----

### \#\# Core Architecture: A Unified Next.js App

Your project is now a standard, modern Next.js application. This eliminates the previous routing and build conflicts.

  * **Single Framework:** The entire application, from the UI to the API, is controlled by the **Next.js App Router**.
  * **UI:** All pages, including the "Math Brain" and "Poetic Brain," are React Server Components located in the `app/` directory.
  * **API:** All backend logic, including chart calculations and auth configuration, is handled by **Next.js API Routes** in the `app/api/` directory. Standalone Netlify Functions are no longer needed.
  * **Deployment:** The project is deployed on Netlify using the official **`@netlify/plugin-nextjs`**, which correctly handles all aspects of a modern Next.js build.

-----

### \#\# Updated Netlify Configuration (`netlify.toml`)

Your `netlify.toml` is now drastically simpler. The Next.js plugin handles everything automatically.

```toml
# netlify.toml

[build]
  # The Next.js plugin automatically sets the correct publish
  # directory and build command. No need to specify them.
  functions = "netlify/functions" # Still good practice to define

# The Next.js plugin is essential for a correct build on Netlify.
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

-----

### \#\# Updated `package.json` Scripts

Your development scripts are now standard for any Next.js project, making the workflow simple and predictable.

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

-----

### \#\# API Routes: The New Backend

Your backend logic now lives inside Next.js API Routes. Here are the updated, type-safe TypeScript versions.

#### **1. Install Dependencies (if not already present)**

```bash
npm install zod
```

#### **2. `app/api/astrology-mathbrain/route.ts`**

This route provides the core chart calculation functionality, now with Zod for robust, type-safe validation.

```typescript
// app/api/astrology-mathbrain/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Zod schema defines the expected shape of the request body
const BodySchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  name: z.string().min(1),
  city: z.string().min(1),
  nation: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  zodiac_type: z.enum(["tropical", "sidereal"]),
  timezone: z.string().min(1),
});

export async function POST(request: Request) {
  // Env check
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
  if (!RAPIDAPI_KEY) {
    return NextResponse.json({ error: "Server misconfiguration: RAPIDAPI_KEY is not set" }, { status: 500 });
  }

  // Parse and validate the request body
  const body = await request.json();
  const result = BodySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Missing or invalid fields", issues: result.error.issues }, { status: 400 });
  }

  const input = result.data;

  try {
    // --- Replace with your real astrologer API endpoint ---
    const upstream = await fetch("https://example-astrology-api.com/compute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
      },
      body: JSON.stringify(input),
    });

    if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "Could not read upstream error.");
        return NextResponse.json({ error: "Upstream API error", status: upstream.status, detail }, { status: 502 });
    }

    const data = await upstream.json();
    return NextResponse.json({ ok: true, data });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Internal error", detail: msg }, { status: 500 });
  }
}
```

#### **3. `app/api/auth-config/route.ts`**

This provides the necessary Auth0 configuration to your frontend.

```typescript
// app/api/auth-config/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;

  if (!domain || !clientId) {
    return NextResponse.json({ error: "Auth misconfiguration" }, { status: 500 });
  }

  return NextResponse.json({ domain, clientId });
}
```

-----

### \#\# Local Development Workflow: Simple and Clean

Your local workflow is now incredibly straightforward.

1.  **Start the Server:** In your terminal, run the single development command.
    ```bash
    npm run dev
    ```
2.  **Access Your App:** Open your browser to the URL provided by Next.js (usually **`http://localhost:3000`**).
      * The "Math Brain" UI is at `http://localhost:3000/math-brain`.
      * The "Poetic Brain" UI is at `http://localhost:3000/chat`.
      * Your API routes are available at `http://localhost:3000/api/...`.

That's it. The old complexities of running two separate servers, managing proxies, and dealing with port conflicts are gone. Your setup is now clean, maintainable, and follows modern best practices.