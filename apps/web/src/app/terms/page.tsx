import { Layout } from '@/components/Layout';

export default function TermsPage() {
  return (
    <Layout>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-400">Effective Date: August 20, 2026</p>
          <p className="text-gray-400 text-sm mt-1">Last Updated: August 20, 2026</p>
        </div>
      </section>

      <section className="py-12 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">

          <div className="bg-brand/5 border border-brand/20 rounded-xl p-5 mb-10">
            <p className="text-gray-700 text-sm leading-relaxed">
              Welcome to XYTEEE. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the XYTEEE mobile application and related services (collectively, the &quot;Service&quot;) operated by XYTEEE (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
            </p>
          </div>

          <div className="space-y-10">

            {/* 1. Eligibility */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Eligibility</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>You must be at least <strong className="text-gray-700">13 years of age</strong> to use XYTEEE.</li>
                <li>If you are under 18, you must have the consent of a parent or legal guardian to use the Service.</li>
                <li>You must not be barred from receiving the Service under applicable law.</li>
                <li>You must provide accurate, current, and complete information during registration.</li>
              </ul>
            </div>

            {/* 2. Account Registration & Security */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Account Registration & Security</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>You may register using email/password, Google, Facebook, or Telegram.</li>
                <li>You are responsible for maintaining the confidentiality of your credentials.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
                <li>You must notify us immediately of any unauthorized access to your account.</li>
                <li>One account per person. Creating multiple accounts to evade bans is prohibited.</li>
                <li>We reserve the right to suspend or terminate accounts that we reasonably believe are compromised or fraudulent.</li>
              </ul>
            </div>

            {/* 3. User Content */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Content</h2>
              <p className="text-gray-500 leading-relaxed mb-3">
                You retain ownership of all content you create, upload, or share on XYTEEE, including posts, stories, messages, photos, videos, and comments (&quot;User Content&quot;).
              </p>
              <p className="text-gray-500 leading-relaxed mb-3">By posting User Content on XYTEEE, you grant us a limited, non-exclusive, worldwide license to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>Store, display, reproduce, and distribute your content within the Service.</li>
                <li>Modify content solely for technical purposes (e.g., compression, resizing) to provide the Service.</li>
                <li>This license ends when you delete your content or your account, except where retention is required by law.</li>
              </ul>
            </div>

            {/* 4. Prohibited Conduct */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Prohibited Conduct</h2>
              <p className="text-gray-500 leading-relaxed mb-3">You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>Use XYTEEE for any unlawful purpose or in violation of any local, state, national, or international law.</li>
                <li>Harass, bully, threaten, stalk, defame, or intimidate other users.</li>
                <li>Post content that is hateful, discriminatory, sexually explicit, violent, or promotes illegal activities.</li>
                <li>Impersonate another person, entity, or falsely claim affiliation with a person or entity.</li>
                <li>Spam, solicit, or advertise products or services without authorization.</li>
                <li>Attempt to gain unauthorized access to other accounts, systems, or networks.</li>
                <li>Use automated bots, scrapers, or other automated tools to access the Service.</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
                <li>Distribute malware, viruses, or any other malicious code.</li>
                <li>Circumvent, disable, or interfere with security features or rate-limiting mechanisms.</li>
                <li>Resell, sublicense, or commercially exploit the Service or any part thereof.</li>
                <li>Create multiple accounts to evade enforcement actions.</li>
                <li>Collect or harvest personal information of other users without their consent.</li>
              </ul>
            </div>

            {/* 5. Content Moderation */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Content Moderation</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>We reserve the right to remove content that violates these Terms without prior notice.</li>
                <li>We may issue warnings, restrict features, suspend, or permanently ban accounts that violate our policies.</li>
                <li>You can report content or users through the in-app report feature.</li>
                <li>We use a combination of automated tools and human review for content moderation.</li>
              </ul>
            </div>

            {/* 6. Voice & Video Calls */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Voice & Video Calls</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>XYTEEE provides peer-to-peer voice and video calling using WebRTC technology.</li>
                <li>Audio and video streams are transmitted directly between users and are NOT recorded or stored on our servers.</li>
                <li>We do not access, monitor, or record your calls without your explicit consent.</li>
                <li>Call signaling metadata (caller, callee, duration) may be stored for service functionality.</li>
              </ul>
            </div>

            {/* 7. Direct Messages & Groups */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Direct Messages & Groups</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>Messages in direct conversations are private between participants.</li>
                <li>We do not read, monitor, or analyze the content of your private messages, except when reported by users or when required by law.</li>
                <li>You may delete messages and conversations at any time.</li>
                <li>Group admins are responsible for the conduct of members in their groups.</li>
                <li>You acknowledge that group messages are visible to all group members.</li>
              </ul>
            </div>

            {/* 8. Intellectual Property */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>The Service, including its design, branding, logos, code, and features, is owned by XYTEEE and protected by copyright, trademark, and other intellectual property laws.</li>
                <li>You may not copy, modify, distribute, sell, or lease any part of the Service without written permission.</li>
                <li>If you believe your intellectual property rights have been infringed on XYTEEE, please contact us with details of the infringement.</li>
              </ul>
            </div>

            {/* 9. Third-Party Links & Services */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Links & Services</h2>
              <p className="text-gray-500 leading-relaxed">
                XYTEEE may contain links to third-party websites or services. We are not responsible for the content, policies, or practices of any third-party service. Your interactions with third-party services are governed by their respective terms and privacy policies.
              </p>
            </div>

            {/* 10. Virtual Items & Purchases */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Virtual Items & Purchases</h2>
              <p className="text-gray-500 leading-relaxed">
                XYTEEE is currently a free service. If we introduce premium features or virtual items in the future, the following will apply: all purchases are final and non-refundable unless required by applicable law. Prices and availability may change without notice.
              </p>
            </div>

            {/* 11. Disclaimer of Warranties */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Disclaimer of Warranties</h2>
              <p className="text-gray-500 leading-relaxed">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </p>
            </div>

            {/* 12. Limitation of Liability */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Limitation of Liability</h2>
              <p className="text-gray-500 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, XYTEEE AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID TO US IN THE PAST TWELVE (12) MONTHS OR $100, WHICHEVER IS GREATER.
              </p>
            </div>

            {/* 13. Indemnification */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Indemnification</h2>
              <p className="text-gray-500 leading-relaxed">
                You agree to indemnify, defend, and hold harmless XYTEEE and its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
              </p>
            </div>

            {/* 14. Termination */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Termination</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-500 leading-relaxed">
                <li>You may terminate your account at any time through the app settings (Settings &gt; Account &gt; Delete Account).</li>
                <li>We may suspend or terminate your account at our discretion, with or without notice, for violations of these Terms or for any other reason.</li>
                <li>Upon termination, your right to use the Service ceases immediately.</li>
                <li>We may retain certain data to comply with legal obligations, resolve disputes, and enforce our agreements.</li>
              </ul>
            </div>

            {/* 15. Governing Law */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Governing Law</h2>
              <p className="text-gray-500 leading-relaxed">
                These Terms are governed by and construed in accordance with applicable laws, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved in the courts of competent jurisdiction.
              </p>
            </div>

            {/* 16. Dispute Resolution */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">16. Dispute Resolution</h2>
              <p className="text-gray-500 leading-relaxed">
                Any dispute arising out of or relating to these Terms or the Service shall first be attempted to be resolved through informal negotiation. If the dispute cannot be resolved informally within 30 days, it shall be submitted to binding arbitration in accordance with applicable arbitration rules. You agree to resolve disputes on an individual basis and waive the right to participate in class actions.
              </p>
            </div>

            {/* 17. Changes to Terms */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">17. Changes to Terms</h2>
              <p className="text-gray-500 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page with a new effective date. Your continued use of XYTEEE after changes are posted constitutes acceptance of the updated Terms. We encourage you to review these Terms periodically.
              </p>
            </div>

            {/* 18. Severability */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">18. Severability</h2>
              <p className="text-gray-500 leading-relaxed">
                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.
              </p>
            </div>

            {/* 19. Entire Agreement */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">19. Entire Agreement</h2>
              <p className="text-gray-500 leading-relaxed">
                These Terms, together with our Privacy Policy, constitute the entire agreement between you and XYTEEE regarding the Service and supersede all prior agreements and understandings.
              </p>
            </div>

            {/* 20. Contact Us */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">20. Contact Us</h2>
              <p className="text-gray-500 leading-relaxed mb-4">If you have any questions about these Terms, please contact us:</p>
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
