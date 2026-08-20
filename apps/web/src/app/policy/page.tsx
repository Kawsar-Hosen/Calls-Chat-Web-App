import { Layout } from '@/components/Layout';

export default function PolicyPage() {
  return (
    <Layout>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-400">Effective Date: August 20, 2026</p>
          <p className="text-gray-400 text-sm mt-1">Last Updated: August 20, 2026</p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-brand/5 border border-brand/20 rounded-xl p-5 mb-10">
            <p className="text-gray-700 text-sm leading-relaxed">
              XYTEEE (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the XYTEEE mobile application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application and services. Please read this policy carefully. By using XYTEEE, you agree to the collection and use of information in accordance with this policy.
            </p>
          </div>

          <div className="space-y-10">

            {/* 1. Information We Collect */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>

              <h3 className="text-lg font-bold text-gray-900 mb-2 mt-6">a. Information You Provide Directly</h3>
              <p className="text-gray-500 leading-relaxed mb-3">When you create an account and use XYTEEE, we collect the following personal information:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li><strong className="text-gray-700">Account Information:</strong> Email address, username, display name, and password (stored as an encrypted hash).</li>
                <li><strong className="text-gray-700">Profile Information:</strong> Biography, profile photo, cover photo, date of birth, gender, location, website URL, and social media links.</li>
                <li><strong className="text-gray-700">Communication Content:</strong> Text messages, photos, videos, voice messages, files, and other media you send through direct messaging and group conversations.</li>
                <li><strong className="text-gray-700">User-Generated Content:</strong> Posts, stories, comments, reactions, and any content you create or share on the platform.</li>
                <li><strong className="text-gray-700">Verification Documents:</strong> If you apply for account verification, you may submit identity documents (e.g., government-issued ID). These are reviewed by our team and deleted after verification is complete or denied.</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-2 mt-6">b. Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li><strong className="text-gray-700">Device Information:</strong> Device name, platform (Android/iOS), and push notification token.</li>
                <li><strong className="text-gray-700">Log Data:</strong> IP address, browser/user-agent string, login timestamps, and session information.</li>
                <li><strong className="text-gray-700">Usage Data:</strong> Features used, interaction patterns, and app performance data.</li>
                <li><strong className="text-gray-700">Online Status:</strong> Whether you are currently online and your last seen timestamp, visible to other users.</li>
              </ul>

              <h3 className="text-lg font-bold text-gray-900 mb-2 mt-6">c. Information from Third Parties</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li><strong className="text-gray-700">Google Sign-In:</strong> If you register via Google, we receive your name, email address, and profile photo from your Google account.</li>
                <li><strong className="text-gray-700">Facebook Sign-In:</strong> If you register via Facebook, we receive your name, email address, and profile photo from your Facebook account.</li>
                <li><strong className="text-gray-700">Telegram Authentication:</strong> If you authenticate via Telegram, we receive your phone number and Telegram user ID for verification purposes.</li>
              </ul>
            </div>

            {/* 2. How We Use Your Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
              <p className="text-gray-500 leading-relaxed mb-3">We use the information we collect for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>To provide, operate, and maintain the XYTEEE platform and its features.</li>
                <li>To create and manage your account, including authentication and session management.</li>
                <li>To enable messaging, voice calls, and video calls between users.</li>
                <li>To display your profile, posts, and content to other users as per your privacy settings.</li>
                <li>To send you push notifications, email notifications, and in-app alerts (which you can disable in settings).</li>
                <li>To detect, prevent, and address fraud, abuse, and technical issues.</li>
                <li>To enforce our Terms of Service and comply with legal obligations.</li>
                <li>To improve and develop new features for the platform.</li>
              </ul>
            </div>

            {/* 3. How We Share Your Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Share Your Information</h2>
              <p className="text-gray-500 leading-relaxed mb-3">We do NOT sell your personal information. We may share your information only in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li><strong className="text-gray-700">With Other Users:</strong> Your profile information (name, username, avatar, bio) and content you choose to share publicly are visible to other users based on your privacy settings.</li>
                <li><strong className="text-gray-700">With Service Providers:</strong> We share data with third-party services that help us operate XYTEEE (see Section 4 below).</li>
                <li><strong className="text-gray-700">For Legal Reasons:</strong> We may disclose information if required by law, regulation, legal process, or governmental request.</li>
                <li><strong className="text-gray-700">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred with notice to you.</li>
                <li><strong className="text-gray-700">With Your Consent:</strong> We may share information for any other purpose with your explicit consent.</li>
              </ul>
            </div>

            {/* 4. Third-Party Services */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Third-Party Services</h2>
              <p className="text-gray-500 leading-relaxed mb-3">XYTEEE integrates with the following third-party services. Each service has its own privacy policy:</p>
              <div className="space-y-3">
                {[
                  { name: 'Cloudflare (R2 Storage & TURN)', desc: 'Used for media storage (photos, videos, files) and WebRTC call connectivity. Cloudflare receives file data and temporary connection credentials.' },
                  { name: 'Neon PostgreSQL', desc: 'Cloud database service that stores all user data, content, and application data.' },
                  { name: 'Firebase Cloud Messaging (FCM)', desc: 'Used to deliver push notifications to your device. Google receives your push notification token.' },
                  { name: 'Google OAuth', desc: 'Used for Google Sign-In authentication. Google receives authentication requests.' },
                  { name: 'Facebook Graph API', desc: 'Used for Facebook Sign-In authentication. Facebook receives authentication requests.' },
                  { name: 'Telegram Bot API', desc: 'Used for phone number verification via Telegram. Telegram receives your phone number during the verification flow.' },
                  { name: 'GIPHY', desc: 'Used for GIF and sticker search in chats. Search queries are sent to GIPHY\'s API.' },
                  { name: 'Nominatim / OpenStreetMap', desc: 'Used for location search when setting your profile location. Search queries are sent to Nominatim.' },
                  { name: 'Expo (EAS)', desc: 'Used for app builds, push notification infrastructure, and over-the-air updates.' },
                ].map((s) => (
                  <div key={s.name} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                    <p className="text-gray-500 text-sm mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Data Storage & Security */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Storage & Security</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>All data is transmitted using TLS/SSL encryption.</li>
                <li>Passwords are hashed using bcrypt and are never stored in plaintext.</li>
                <li>Authentication tokens (JWT) have short expiry periods (15 minutes for access tokens).</li>
                <li>Media files are stored in encrypted cloud storage (Cloudflare R2).</li>
                <li>We implement rate limiting and abuse prevention measures.</li>
                <li>Data is stored in secure cloud infrastructure with regular backups.</li>
              </ul>
            </div>

            {/* 6. Data Retention */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li><strong className="text-gray-700">Account Data:</strong> Retained as long as your account is active.</li>
                <li><strong className="text-gray-700">Stories:</strong> Automatically deleted after 24 hours.</li>
                <li><strong className="text-gray-700">Messages:</strong> Retained until you delete them or delete your account.</li>
                <li><strong className="text-gray-700">Verification Documents:</strong> Deleted after the verification process is complete (approved or denied).</li>
                <li><strong className="text-gray-700">Session Data:</strong> Login sessions and device tokens are retained until you log out or revoke access.</li>
                <li><strong className="text-gray-700">After Account Deletion:</strong> All personal data is permanently removed within 30 days of account deletion request.</li>
              </ul>
            </div>

            {/* 7. Your Rights */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights</h2>
              <p className="text-gray-500 leading-relaxed mb-3">You have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li><strong className="text-gray-700">Access:</strong> View all your data through the app settings.</li>
                <li><strong className="text-gray-700">Correction:</strong> Update your profile information at any time through the app settings.</li>
                <li><strong className="text-gray-700">Deletion:</strong> Delete your account and all associated data permanently through Settings &gt; Account &gt; Delete Account. You can also bulk-delete your posts, stories, messages, and media individually.</li>
                <li><strong className="text-gray-700">Data Portability:</strong> Request a copy of your data by contacting us at support@xyteee.com.</li>
                <li><strong className="text-gray-700">Consent Withdrawal:</strong> You can disable push notifications, location access, and other permissions through your device settings.</li>
              </ul>
            </div>

            {/* 8. Children's Privacy */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children&apos;s Privacy</h2>
              <p className="text-gray-500 leading-relaxed">
                XYTEEE is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided us with personal information, we will promptly delete it. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at support@xyteee.com.
              </p>
            </div>

            {/* 9. Account Deletion */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Account Deletion</h2>
              <p className="text-gray-500 leading-relaxed mb-3">
                You can delete your account at any time from the app. To delete your account:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>Open XYTEEE and go to <strong className="text-gray-700">Settings</strong>.</li>
                <li>Navigate to <strong className="text-gray-700">Account &gt; Delete Account</strong>.</li>
                <li>Enter your password and the verification code sent to your email.</li>
                <li>Confirm deletion.</li>
              </ol>
              <p className="text-gray-500 leading-relaxed mt-3">
                Once deleted, all your data — including profile, posts, stories, messages, media, and account information — will be permanently removed within 30 days. This action cannot be undone.
              </p>
            </div>

            {/* 10. Location Data */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Location Data</h2>
              <p className="text-gray-500 leading-relaxed">
                XYTEEE may request access to your device&apos;s location to help you set a location on your profile. Location data is used only when you explicitly choose to add a location and is stored as a text string on your profile. We do not continuously track your location. You can revoke location access at any time through your device settings.
              </p>
            </div>

            {/* 11. Push Notifications */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Push Notifications</h2>
              <p className="text-gray-500 leading-relaxed">
                XYTEEE sends push notifications for new messages, calls, comments, reactions, and other activity. You can manage your notification preferences in the app settings or disable notifications entirely through your device settings.
              </p>
            </div>

            {/* 12. Children&apos;s Online Privacy Protection Act (COPPA) */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. COPPA Compliance</h2>
              <p className="text-gray-500 leading-relaxed">
                XYTEEE complies with the Children&apos;s Online Privacy Protection Act (COPPA). We do not knowingly collect personal information from children under 13 years of age. If you are under 13, please do not use XYTEEE or provide any personal information.
              </p>
            </div>

            {/* 13. Changes to This Policy */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Changes to This Policy</h2>
              <p className="text-gray-500 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last Updated&quot; date. Your continued use of XYTEEE after any changes constitutes acceptance of the updated policy.
              </p>
            </div>

            {/* 14. Contact Us */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Us</h2>
              <p className="text-gray-500 leading-relaxed mb-4">If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-gray-700 font-medium">XYTEEE Support Team</p>
                <p className="text-gray-500 mt-1">Email: <a href="mailto:support@xyteee.com" className="text-brand hover:underline">support@xyteee.com</a></p>
                <p className="text-gray-500 mt-1">Website: <a href="https://xyteee.com" className="text-brand hover:underline">https://xyteee.com</a></p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </Layout>
  );
}
