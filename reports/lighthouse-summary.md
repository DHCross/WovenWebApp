# Lighthouse Performance Summary for sprightly-genie-998c07.netlify.app

- **Performance Score:** 44/100 (mobile, emulated Moto G4, simulated slow 4G)
- **First Contentful Paint:** 2.0s
- **Largest Contentful Paint:** 10.8s
- **Time to Interactive:** 20.1s
- **Speed Index:** 24.3s
- **Total Blocking Time:** 130ms
- **Cumulative Layout Shift:** 0.27

## Opportunities for Improvement

- Serve images in next-gen formats (potential savings: 25.7s)
- Defer offscreen images (potential savings: 23.6s)
- Properly size images to reduce payload (page >7MB across 45 requests)
- Reduce initial server response time (1.87s savings)
- Eliminate render-blocking CSS and JS
- Preconnect to critical origins
- Reduce unused JavaScript

## Diagnostics

- Images missing explicit `width` and `height`
- Excessive network payloads and request chains
- Large layout shifts and long main-thread tasks

## Accessibility Snapshot

- **Score:** 97/100
- Primary concern: insufficient color contrast in certain areas
- Manual review still recommended for broader coverage

## Audit Context

- Lighthouse 9.6.8 via HeadlessChromium 107.0.5296.0
- Single-page load under simulated slow 4G conditions
