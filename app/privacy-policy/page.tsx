import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Raven Calder',
  description: 'Privacy policy for Raven Calder Math Brain & Poetic Brain experiences.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="prose prose-slate mx-auto max-w-4xl px-6 py-12 dark:prose-invert">
      <h1>Privacy Policy for Raven Calder Math Brain &amp; Poetic Brain</h1>
      <p className="text-sm text-slate-500">Last updated: 2025-10-08</p>

      <p>
        Raven Calder&apos;s Math Brain and Poetic Brain experiences (the &ldquo;Services&rdquo;) are operated by D. H.
        Cross (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). This policy explains how we handle personal data collected through the Services,
        including the Raven Calder API, Netlify deployment, and affiliated tools hosted in the WovenWebApp repository.
      </p>

      <p>
        We publish this policy to support transparency for visitors using raven-calder.com or ravencalder.com,
        individuals interacting with Raven Calder GPT experiences hosted on OpenAI, and collaborators working in this
        repository. Questions? Email <a href="mailto:privacy@ravencalder.com">privacy@ravencalder.com</a>.
      </p>

      <section>
        <h2>1. Data We Process</h2>
        <h3>1.1 Astrology Input Data</h3>
        <p>
          We process user-provided astrology inputs, which may include birth date, time, location, transit window
          parameters, and optional contextual notes. These inputs are used exclusively to produce charts, seismograph
          summaries, Balance Meter readings, and related narratives. They are transmitted to third-party services
          (RapidAPI Astrologer endpoints) strictly for chart computation.
        </p>

        <h3>1.2 Diagnostic &amp; Operational Data</h3>
        <p>
          During development and testing we may review transient diagnostic data such as request/response payloads in
          local logs and Netlify function output for troubleshooting. These logs are developer-facing, held locally, and
          purged after debugging.
        </p>

        <h3>1.3 Repository Metadata</h3>
        <p>
          GitHub may expose contributor usernames, profile links, and commit metadata consistent with GitHub&apos;s privacy
          policy. We do not intentionally ingest sensitive categories of personal data.
        </p>
      </section>

      <section>
        <h2>2. How We Use Data</h2>
        <ul>
          <li>Generate natal, transit, synastry, and composite charts via the Astrologer API.</li>
          <li>Compute seismograph and Balance Meter metrics defined in <code>config/spec.json</code>.</li>
          <li>Produce narrative reflections following Raven Calder FIELD → MAP → VOICE principles.</li>
          <li>Validate outputs with automated tests and manual QA.</li>
          <li>Maintain platform security and abuse monitoring.</li>
        </ul>
        <p>We do not sell personal data or use it for advertising.</p>
      </section>

      <section>
        <h2>3. Data Retention</h2>
        <ul>
          <li>User inputs are processed in-memory; Netlify functions are stateless and do not persist payloads.</li>
          <li>Debug logs containing payload snippets are deleted or anonymized after the issue is resolved (within 30 days).</li>
          <li>Sample payloads stored in the repository are sanitized or fictitious.</li>
        </ul>
      </section>

      <section>
        <h2>4. Legal Basis &amp; User Rights</h2>
        <p>
          We rely on your consent to process astrology inputs and on legitimate interests to maintain service reliability.
          Depending on your jurisdiction (e.g., GDPR, UK GDPR, CCPA/CPRA) you may request access, correction, deletion,
          restriction, or portability of your data, or object to certain processing. Submit requests to
          <a href="mailto:privacy@ravencalder.com"> privacy@ravencalder.com</a>. We respond within 30 days where legally required.
        </p>
      </section>

      <section>
        <h2>5. International Data Transfers</h2>
        <p>
          We operate primarily from the United States. API calls may be routed through RapidAPI infrastructure in
          multiple regions. We rely on contractual safeguards and vendor privacy commitments for cross-border transfers.
        </p>
      </section>

      <section>
        <h2>6. Security Practices</h2>
        <ul>
          <li>All production endpoints enforce HTTPS (TLS 1.2+).</li>
          <li>Secrets are stored in environment variables managed by Netlify and GitHub.</li>
          <li>Access to production dashboards is limited to authorized maintainers.</li>
          <li>Automated tests catch regressions in time-handling and scaling logic.</li>
        </ul>
        <p>If unauthorized access is detected, we will notify affected users when legally required.</p>
      </section>

      <section>
        <h2>7. Third-Party Services</h2>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Purpose</th>
              <th>Location</th>
              <th>Policy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>RapidAPI / Astrologer</td>
              <td>Chart calculation</td>
              <td>Global (US/EU)</td>
              <td><a href="https://rapidapi.com/privacy" target="_blank" rel="noreferrer">rapidapi.com/privacy</a></td>
            </tr>
            <tr>
              <td>Netlify</td>
              <td>Hosting &amp; serverless functions</td>
              <td>US</td>
              <td><a href="https://www.netlify.com/privacy" target="_blank" rel="noreferrer">netlify.com/privacy</a></td>
            </tr>
            <tr>
              <td>GitHub</td>
              <td>Source control &amp; CI</td>
              <td>US</td>
              <td><a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement" target="_blank" rel="noreferrer">GitHub Privacy Statement</a></td>
            </tr>
            <tr>
              <td>OpenAI</td>
              <td>Front-end GPT experience</td>
              <td>US</td>
              <td><a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noreferrer">openai.com/policies</a></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>8. AI Transparency &amp; Open-Source Components</h2>
        <p>
          Our AI models ground their reflections in astrological geometry before generating narrative language. The
          repository integrates open-source libraries under their respective licenses. When using Raven Calder GPT on
          OpenAI, data is not added to model training unless you opt in through OpenAI&apos;s settings.
        </p>
      </section>

      <section>
        <h2>9. Children&apos;s Privacy</h2>
        <p>
          The Services are not intended for individuals under 16. If a child provides personal data without parental
          consent, contact us and we will delete the data.
        </p>
      </section>

      <section>
        <h2>10. Changes to this Policy</h2>
        <p>
          We may update this policy as regulations evolve or functionality changes. Significant updates are documented
          in the repository CHANGELOG and at the top of this page.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Email <a href="mailto:privacy@ravencalder.com">privacy@ravencalder.com</a> with any privacy questions. You may also lodge a complaint with
          your local data protection authority if your concerns remain unresolved.
        </p>
      </section>

      <p className="mt-8 text-sm">
        Need a downloadable copy? View the Markdown version in the repository:&nbsp;
        <Link href="https://raw.githubusercontent.com/DHCross/WovenWebApp/main/docs/PRIVACY_POLICY.md" target="_blank" rel="noreferrer">
          docs/PRIVACY_POLICY.md
        </Link>
        .
      </p>
    </main>
  );
}
