# Privacy Policy for Raven Calder Math Brain & Poetic Brain

_Last updated: 2025-10-08_

Raven Calder’s Math Brain and Poetic Brain experiences (the “Services”) are operated by D. H. Cross (“we,” “us,” or “our”). This policy explains how we handle personal data collected through the Services, including the Raven Calder API, Netlify deployment, and affiliated tools hosted in the WovenWebApp repository.

We publish this policy to support transparency for:

- Visitors using raven-calder.com or ravencalder.com websites.
- Individuals interacting with Raven Calder GPT experiences hosted on OpenAI.
- Developers, testers, and collaborators accessing this repository.

If you have any questions, contact us at **privacy@ravencalder.com**.

---

## 1. Data We Process

### 1.1 Astrology Input Data
We process user-provided astrology inputs, which may include:

- Birth date, time, and location.
- Transit window start/end dates and sampling cadence.
- Optional contextual notes (e.g., report focus or relationship context).

These inputs are used exclusively to produce charts, seismograph summaries, Balance Meter readings, and related narratives. They are transmitted to third-party services (RapidAPI Astrologer endpoints) strictly for chart computation.

### 1.2 Diagnostic & Operational Data
During development and testing we may review the following transient data:

- Request/response payloads captured in local logs (`tmp-benchmark.log`, `test-results/`).
- Netlify function logs for troubleshooting errors (e.g., 504 incidents).

These logs are developer-facing, held locally, and purged after debugging. They are not shared publicly.

### 1.3 Repository Metadata
When you open pull requests, issues, or contribute code, GitHub may expose your username, profile link, and commit metadata consistent with GitHub’s own privacy policy.

We do not intentionally ingest sensitive categories (racial or ethnic origin, health data, etc.) and request that you avoid including such details in free-form inputs.

---

## 2. How We Use Data

- **Chart Generation:** Send birth/transit data to the Astrologer API to compute natal, transit, synastry, and composite charts.
- **Seismograph & Balance Meter:** Calculate summary metrics (magnitude, directional bias, coherence) as defined in `config/spec.json`.
- **Narrative Output:** Produce plain-language reflections following Raven Calder FIELD → MAP → VOICE principles.
- **Quality Assurance:** Validate outputs against automated tests (e.g., `__tests__/balance-export-regression.test.ts`) and manual QA scripts.
- **Security & Abuse Prevention:** Monitor for excessive or suspicious traffic that might indicate platform misuse.

We do **not** sell personal data or use it for advertising.

---

## 3. Data Retention

- **User Inputs:** For production deployments, user inputs are processed in-memory and not stored in persistent databases. Netlify function invocations are stateless.
- **Logs:** Debug logs may temporarily capture payload snippets during active troubleshooting. We delete or anonymize these logs after resolving the issue, typically within 30 days.
- **Repository Artifacts:** Sanitized sample payloads included in this repository (`Sample Output/`, `test-benchmark-*.json`) are anonymized and contain either fictitious or redacted data.

If you submit personal information via support email, we retain that correspondence only as long as needed to address your request.

---

## 4. Legal Basis & User Rights (GDPR / UK GDPR / CCPA)

### 4.1 Legal Basis
- **Consent:** We rely on your voluntary provision of input data to generate astrological content.
- **Legitimate Interests:** We process minimal analytics (e.g., anonymized performance metrics) to maintain site reliability.

Where required by law, consent is sought before collecting personal data.

### 4.2 Your Rights
Depending on your jurisdiction, you may have the right to:

- Access the personal data we process about you.
- Request correction or deletion of personal data.
- Object to or restrict certain processing.
- Receive a copy of your data in a portable format.

To exercise these rights, email **privacy@ravencalder.com**. We may need to verify your identity before fulfilling a request. We respond within 30 days, subject to any lawful extensions.

### 4.3 California Residents (CCPA/CPRA)
California residents can request details about the categories of personal data collected, disclosed, or sold (we do not sell data). Submit requests via email as noted above.

---

## 5. International Data Transfers

We operate primarily from the United States. API calls may be routed through RapidAPI infrastructure in multiple regions to fulfill requests. When transferring personal data across borders, we rely on contractual safeguards and service-provider privacy commitments.

---

## 6. Security Practices

- All production endpoints enforce HTTPS (TLS 1.2+).
- Secrets (API keys, tokens) are stored in environment variables managed via Netlify and GitHub Actions secrets.
- Access to production deployment dashboards is restricted to authorized maintainers.
- Automated tests detect regressions in time-handling and scaling to reduce the risk of data misuse.

Despite these measures, no system is 100% secure. If we detect unauthorized access, we will notify affected users where required by law.

---

## 7. Third-Party Services

We rely on the following processors/subprocessors:

| Service | Purpose | Location | Policy |
| --- | --- | --- | --- |
| RapidAPI / Astrologer | Chart calculation | Global (US/EU) | https://rapidapi.com/privacy |
| Netlify | Hosting & serverless functions | US | https://www.netlify.com/privacy |
| GitHub | Source control & CI | US | https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement |
| OpenAI (ChatGPT / GPT Actions) | Front-end experience for Raven Calder GPT | US | https://openai.com/policies/privacy-policy |

We conduct diligence on these vendors and require them to provide adequate data protection.

---

## 8. AI Transparency & Open-Source Components

- Our AI models synthesize astrological narratives using deterministic geometry first; reflections are not deterministic or predictive guarantees.
- The repository incorporates open-source libraries under their respective licenses. Ensure compliance with MIT/ISC/Apache/AGPL components referenced in `package.json` and `openapi.json`.
- When using Raven Calder GPT through OpenAI Actions, no personal data is added to training datasets unless you explicitly opt in via OpenAI.

---

## 9. Children’s Privacy

The Services are not intended for individuals under 16. If you are aware that a child has provided us with personal information without parental consent, contact us and we will delete the data.

---

## 10. Changes to this Policy

We may update this policy as regulations evolve or functionality changes. Significant updates are documented in `CHANGELOG.md` and the top of this file.

---

## 11. Contact

For any privacy inquiries, please contact: **privacy@ravencalder.com**.

If you have unresolved privacy concerns, you may lodge a complaint with your local data protection authority.
