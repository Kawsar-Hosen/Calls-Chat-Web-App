import { Layout } from '@/components/Layout';

export default function DataSafetyPage() {
  return (
    <Layout>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Transparency</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Data Safety</h1>
          <p className="text-gray-400 text-sm">How XYTEEE collects, shares, and protects your data</p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-brand/5 border border-brand/20 rounded-xl p-5 mb-10">
            <p className="text-gray-700 text-sm leading-relaxed">
              This page provides a summary of how XYTEEE handles your data. For complete details, please refer to our{' '}
              <a href="/policy" className="text-brand font-medium hover:underline">Privacy Policy</a>.
            </p>
          </div>

          <div className="space-y-10">

            {/* Data Collected */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Data We Collect</h2>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">Personal Information</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Name, email address, username, date of birth, gender, profile photo, cover photo, bio, and location (set by you).</p>
                  <p className="text-brand text-xs font-medium mt-2">Purpose: Account creation & profile</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">Contacts & Social Graph</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Friend connections, followers, followings, blocked users, and group memberships.</p>
                  <p className="text-brand text-xs font-medium mt-2">Purpose: Social features & messaging</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">User-Generated Content</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Posts, stories, comments, reactions, messages (text, photos, videos, voice messages, files), and story highlights.</p>
                  <p className="text-brand text-xs font-medium mt-2">Purpose: Core app functionality</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">Messages</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Direct messages and group messages are stored on our servers and encrypted in transit. We do not read or analyze your private messages.</p>
                  <p className="text-brand text-xs font-medium mt-2">Purpose: Messaging functionality</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">Photos & Media</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Images, videos, audio files, and documents you upload for posts, stories, profile pictures, and message attachments. Stored in encrypted cloud storage.</p>
                  <p className="text-brand text-xs font-medium mt-2">Purpose: Content sharing & profile</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">Device Information</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Device name, platform (Android/iOS), and push notification token.</p>
                  <p className="text-brand text-xs font-medium mt-2">Purpose: Push notifications & service improvement</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">Usage Data</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Login timestamps, session duration, IP address, and feature usage patterns.</p>
                  <p className="text-brand text-xs font-medium mt-2">Purpose: Security & service improvement</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                  <p className="font-bold text-gray-900 mb-1">Financial Information</p>
                  <p className="text-gray-500 text-sm leading-relaxed">Not collected. XYTEEE is free and does not process payments.</p>
                  <p className="text-brand text-xs font-medium mt-2">Not applicable</p>
                </div>
              </div>
            </div>

            {/* How Data Is Used */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Use Your Data</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: '🔧', label: 'App Functionality', desc: 'Provide messaging, calling, social feed, and other core features.' },
                  { icon: '🔒', label: 'Security & Fraud Prevention', desc: 'Detect abuse, unauthorized access, and technical issues.' },
                  { icon: '📧', label: 'Communications', desc: 'Send notifications, alerts, and account-related emails.' },
                  { icon: '📊', label: 'Analytics & Improvement', desc: 'Understand usage patterns to improve the app experience.' },
                  { icon: '⚖️', label: 'Legal Compliance', desc: 'Respond to legal requests and comply with applicable laws.' },
                  { icon: '🎯', label: 'Personalization', desc: 'Customize your feed, recommendations, and experience.' },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="font-bold text-gray-900">{item.icon} {item.label}</p>
                    <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How Data Is Shared */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Share Your Data</h2>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-4">
                <p className="text-gray-900 font-bold mb-2">We do NOT sell your personal data.</p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We may share limited data with service providers who help us operate the app (cloud hosting, push notifications, authentication). These providers are contractually obligated to protect your data and use it only for the purposes we specify.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { provider: 'Cloudflare', purpose: 'Media storage & call connectivity', data: 'Files you upload, temporary connection data' },
                  { provider: 'Firebase (Google)', purpose: 'Push notifications', data: 'Push notification token' },
                  { provider: 'Google OAuth', purpose: 'Sign-in', data: 'Authentication token (name, email, photo)' },
                  { provider: 'Facebook', purpose: 'Sign-in', data: 'Authentication token (name, email, photo)' },
                  { provider: 'Telegram', purpose: 'Phone verification', data: 'Phone number' },
                  { provider: 'GIPHY', purpose: 'GIF/Sticker search', data: 'Search queries' },
                ].map((item) => (
                  <div key={item.provider} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100">
                    <span className="text-brand font-bold text-sm whitespace-nowrap">{item.provider}</span>
                    <div>
                      <p className="text-gray-700 text-sm">{item.purpose}</p>
                      <p className="text-gray-400 text-xs mt-0.5">Data: {item.data}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Security */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How We Protect Your Data</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { title: 'Encryption in Transit', desc: 'All data transmitted between your device and our servers uses TLS/SSL encryption.' },
                  { title: 'Password Hashing', desc: 'Passwords are hashed with bcrypt and never stored in plaintext.' },
                  { title: 'Encrypted Storage', desc: 'Media files are stored in encrypted cloud storage (Cloudflare R2).' },
                  { title: 'Secure Tokens', desc: 'Authentication tokens (JWT) expire after 15 minutes and are refreshed automatically.' },
                  { title: 'Rate Limiting', desc: 'API endpoints are rate-limited to prevent abuse and brute force attacks.' },
                  { title: 'Access Controls', desc: 'Only authorized personnel can access user data, and only when necessary.' },
                ].map((item) => (
                  <div key={item.title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                    <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Retention & Deletion */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Retention & Deletion</h2>
              <div className="bg-brand/5 border border-brand/20 rounded-xl p-5 mb-4">
                <p className="text-gray-700 font-bold mb-1">You can delete your account anytime</p>
                <p className="text-gray-600 text-sm">
                  Go to Settings &gt; Account &gt; Delete Account. Enter your password and email verification code. All data — including profile, posts, stories, messages, and media — is permanently removed within 30 days.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 text-sm leading-relaxed">
                <li><strong className="text-gray-700">Stories:</strong> Automatically deleted after 24 hours.</li>
                <li><strong className="text-gray-700">Messages:</strong> Retained until you delete them or your account.</li>
                <li><strong className="text-gray-700">Posts:</strong> Retained until you delete them or your account. You can bulk-delete posts from Settings &gt; Storage.</li>
                <li><strong className="text-gray-700">Verification Documents:</strong> Deleted after the review process (approved or denied).</li>
                <li><strong className="text-gray-700">Account Data:</strong> Permanently deleted within 30 days of account deletion.</li>
              </ul>
            </div>

            {/* Data Export */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Data Rights</h2>
              <div className="space-y-3">
                {[
                  { right: 'Access', desc: 'View all your data through the app settings and profile.' },
                  { right: 'Correction', desc: 'Update your profile information at any time.' },
                  { right: 'Deletion', desc: 'Delete individual content (posts, stories, messages, media) or your entire account.' },
                  { right: 'Portability', desc: 'Request a copy of your data by emailing support@xyteee.com.' },
                  { right: 'Opt-Out', desc: 'Disable push notifications, location access, and other permissions in device settings.' },
                  { right: 'Withdraw Consent', desc: 'Revoke data sharing permissions through your device settings.' },
                ].map((item) => (
                  <div key={item.right} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-brand font-bold text-sm">{item.right}</span>
                    <p className="text-gray-500 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Children's Privacy */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Children&apos;s Privacy</h2>
              <p className="text-gray-500 leading-relaxed">
                XYTEEE is not designed for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided personal information, we will delete it immediately. If you believe a child has provided us with data, please contact support@xyteee.com.
              </p>
            </div>

            {/* Contact */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-center">
              <p className="font-bold text-gray-900 mb-2">Questions about your data?</p>
              <p className="text-gray-500 text-sm mb-3">Contact us at <a href="mailto:support@xyteee.com" className="text-brand hover:underline font-medium">support@xyteee.com</a></p>
              <p className="text-gray-400 text-xs">See our <a href="/policy" className="text-brand hover:underline">Privacy Policy</a> for full details.</p>
            </div>

          </div>
        </div>
      </section>
    </Layout>
  );
}
