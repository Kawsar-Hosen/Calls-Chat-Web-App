import { Layout } from '@/components/Layout';

export const metadata = { title: 'Privacy Policy — Netora' };

export default function NetoraPrivacyPolicy() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-2">Netora Privacy Policy</h1>
        <p className="text-gray-500 mb-1"><strong>Effective date:</strong> August 15, 2026</p>
        <p className="text-gray-500 mb-8"><strong>App:</strong> Netora for Android &middot; <strong>Package:</strong> com.netora.networkutility</p>

        <div className="prose prose-lg space-y-6 text-gray-700">
          <p>Netora is a local-first network diagnostic utility. This policy describes what the app reads, what information leaves the device, and what Netora stores.</p>

          <h2 className="text-2xl font-bold mt-8">Information Netora Handles</h2>
          <p>Netora reads Android network state to identify whether Wi-Fi, mobile data, or no internet is active. When Android makes fields available, Netora may display Wi-Fi signal strength, link speed, frequency, channel, local IP, mobile carrier, and cellular generation. Speed tests measure download throughput, upload throughput, ping, jitter, and failed latency samples used as packet loss.</p>

          <h2 className="text-2xl font-bold mt-8">Optional Wi-Fi Identifiers</h2>
          <p>Wi-Fi SSID and BSSID require Android foreground location permission. Netora requests this permission only after you choose <strong>Enable Wi-Fi name access</strong> in Privacy Settings. Netora does not request or read GPS coordinates. Denying the permission does not affect speed tests, mobile data support, public network lookup, server detection, or other diagnostics.</p>

          <h2 className="text-2xl font-bold mt-8">Optional External Network Details</h2>
          <p>When <strong>Public network details</strong> is enabled, Netora contacts external IP lookup services to display the current public IP, IP version, ISP, ASN, and approximate IP-derived city/country. The result is held in memory for the current connection and is not written to Netora history. You can disable these lookups in Privacy Settings.</p>
          <p>The app may use the following fallback providers: <code>ipapi.co</code>, <code>ipwho.is</code>, and <code>ipinfo.io</code>. Each provider necessarily receives your public IP and standard HTTPS request metadata. Their own privacy policies govern their processing.</p>

          <h2 className="text-2xl font-bold mt-8">Speed Test Server and Map</h2>
          <p>Speed testing uses <code>speed.cloudflare.com</code>. Cloudflare Anycast selects the edge that answers on the current network. Netora reads the returned edge code and may contact <code>airport-data.com</code> to resolve that code to a city and map coordinates. The interactive map loads Leaflet resources from <code>unpkg.com</code> and CARTO/OpenStreetMap tiles. Server location is not your physical GPS location.</p>

          <h2 className="text-2xl font-bold mt-8">Local Storage</h2>
          <p>Test history and preferences are stored locally using Android application storage. History contains measured speeds, latency results, connection type/name, and the responding server label. Netora has no account system and no Netora backend. You can delete individual history items or clear all history. Local data remains until deletion, app data is cleared, or the app is uninstalled.</p>

          <h2 className="text-2xl font-bold mt-8">Sharing, Advertising, and Analytics</h2>
          <p>Netora shows advertisements through <strong>Google AdMob</strong> (banner, native, and interstitial formats). To serve and measure ads, Google AdMob may access your device&#39;s advertising ID, IP address, and coarse ad-request signals. Netora does not store this information and does not operate its own analytics or tracking SDK.</p>
          <p>Interstitial ads are shown only after a completed speed test, with a frequency cap, and never while a test is running, while offline, or on error.</p>
          <p>For users in the EEA, the UK, and other regulated regions, Netora presents a Google User Messaging Platform (UMP) consent form before requesting ads. If you do not consent to personalized ads, only non-personalized ads are requested. You can review Google&#39;s advertising practices at <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">policies.google.com/technologies/ads</a>.</p>
          <p>Netora does not sell personal information. External infrastructure providers receive standard request information when your device contacts their service.</p>

          <h2 className="text-2xl font-bold mt-8">Security</h2>
          <p>Netora uses HTTPS for network lookups, speed tests, edge resolution, and map resources. Public IP/ISP/ASN results are not persisted by Netora. No secret API keys are embedded in the app.</p>

          <h2 className="text-2xl font-bold mt-8">Children</h2>
          <p>Netora is a general network utility and is not directed to children.</p>

          <h2 className="text-2xl font-bold mt-8">Changes</h2>
          <p>This policy may be updated when app features or service providers change. The effective date identifies the current version.</p>

          <h2 className="text-2xl font-bold mt-8">Contact</h2>
          <p>For privacy questions or support, contact <a href="mailto:support@xyteee.com" className="text-brand hover:underline">support@xyteee.com</a>. Developer: XYTEEE.</p>
        </div>
      </div>
    </Layout>
  );
}
