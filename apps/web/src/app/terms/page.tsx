import { Layout } from '@/components/Layout';

export default function TermsPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-6">Terms of Service</h1>
        <p className="text-gray-500 mb-4">Last updated: August 2026</p>
        <div className="prose prose-lg space-y-4 text-gray-700">
          <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
          <p>By using XYTEEE, you agree to these Terms of Service. If you do not agree, please do not use the app.</p>
          <h2 className="text-2xl font-bold">2. User Conduct</h2>
          <p>You agree not to misuse XYTEEE, violate laws, harass others, or distribute spam, malware, or harmful content.</p>
          <h2 className="text-2xl font-bold">3. Content Ownership</h2>
          <p>You retain ownership of content you create on XYTEEE. By posting, you grant us a license to display and distribute your content within the platform.</p>
          <h2 className="text-2xl font-bold">4. Account Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time.</p>
          <h2 className="text-2xl font-bold">5. Limitation of Liability</h2>
          <p>XYTEEE is provided &ldquo;as is&rdquo; without warranties. We are not liable for any damages arising from use of the platform.</p>
        </div>
      </div>
    </Layout>
  );
}
