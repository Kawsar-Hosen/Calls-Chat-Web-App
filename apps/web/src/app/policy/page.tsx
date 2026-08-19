import { Layout } from '@/components/Layout';

export default function PolicyPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-6">Privacy Policy</h1>
        <p className="text-gray-500 mb-4">Last updated: August 2026</p>
        <div className="prose prose-lg space-y-4 text-gray-700">
          <h2 className="text-2xl font-bold">1. Information We Collect</h2>
          <p>We collect information you provide directly: name, email, username, profile data, messages, posts, and media you share on XYTEEE.</p>
          <h2 className="text-2xl font-bold">2. How We Use Your Information</h2>
          <p>We use your information to provide and improve XYTEEE services, personalize your experience, and communicate with you.</p>
          <h2 className="text-2xl font-bold">3. Data Storage & Security</h2>
          <p>Your data is stored securely using industry-standard encryption. We use Cloudflare for content delivery and Neon PostgreSQL for data storage.</p>
          <h2 className="text-2xl font-bold">4. Sharing of Information</h2>
          <p>We do not sell your personal information. We may share data only when required by law or to protect the safety of our users.</p>
          <h2 className="text-2xl font-bold">5. Your Rights</h2>
          <p>You can access, update, or delete your account at any time from the app settings. For questions, contact us at support@xyteee.com.</p>
        </div>
      </div>
    </Layout>
  );
}
