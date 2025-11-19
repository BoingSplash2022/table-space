// src/app/privacy-policy/page.tsx
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-6 prose">
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> [Enter date]</p>

      <h2>1. Introduction</h2>
      <p>
        Welcome to TableSpace (“we”, “us”, “our”). We are committed to protecting your
        personal data and respecting your privacy. This Privacy Policy explains how we
        collect, use, store, and safeguard information when you use our website
        www.tablespace.app (the “Site”).
      </p>

      <h2>2. Contact Information</h2>
      <p>
        <strong>Address:</strong> 56 The Drive, Hove, BN3 3PD, United Kingdom<br />
        <strong>Email:</strong> nick.dunn2019@gmail.com
      </p>

      <h2>3. Information We Collect</h2>
      <ul>
        <li>Your email address when you create an account.</li>
        <li>Technical information such as IP address, browser type, and usage patterns (if analytics are enabled).</li>
      </ul>

      <h2>4. How We Use Your Information</h2>
      <ul>
        <li>To create and maintain your TableSpace account.</li>
        <li>For authentication and security.</li>
        <li>To send necessary service-related communications.</li>
        <li>To improve the Site and user experience.</li>
      </ul>

      <h2>5. Lawful Basis</h2>
      <ul>
        <li><strong>Contract</strong> – to provide your account.</li>
        <li><strong>Legitimate interest</strong> – site security & performance.</li>
        <li><strong>Consent</strong> – only for optional analytics/marketing.</li>
      </ul>

      <h2>6. Cookies</h2>
      <p>
        We only use necessary cookies unless you consent to optional analytics. Analytics
        cookies, if enabled, will require your permission.
      </p>

      <h2>7. Data Sharing</h2>
      <p>We may share your data with trusted providers acting on our behalf:</p>
      <ul>
        <li>Hosting providers</li>
        <li>Authentication services</li>
      </ul>
      <p>We never sell personal data.</p>

      <h2>8. Data Retention</h2>
      <p>
        We keep data for as long as your account is active. You may request deletion at
        any time.
      </p>

      <h2>9. Your Rights</h2>
      <ul>
        <li>Access your data</li>
        <li>Request correction</li>
        <li>Request deletion</li>
        <li>Object to processing</li>
        <li>Request portability</li>
      </ul>

      <h2>10. International Transfers</h2>
      <p>
        If data is processed outside the UK/EU, we use appropriate safeguards like Standard
        Contractual Clauses.
      </p>

      <h2>11. Security</h2>
      <p>
        We use reasonable security measures, but no system can guarantee complete security.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update this policy. The most recent version will always appear here.
      </p>

      <h2>13. Contact Us</h2>
      <p>
        <strong>Email:</strong> nick.dunn2019@gmail.com<br />
        <strong>Address:</strong> 56 The Drive, Hove, BN3 3PD
      </p>

      {/* Back Button */}
      <div className="mt-10">
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
