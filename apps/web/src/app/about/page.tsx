import { Layout } from '@/components/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold mb-6">About XYTEEE</h1>
        <div className="prose prose-lg space-y-4 text-gray-700">
          <p className="text-xl text-gray-600">XYTEEE is a modern social media platform built for meaningful connections.</p>
          <h2 className="text-2xl font-bold">Our Mission</h2>
          <p>To create a free, open, and engaging social platform where people can connect, share, and communicate without barriers.</p>
          <h2 className="text-2xl font-bold">Features</h2>
          <ul className="list-disc pl-6">
            <li>Real-time messaging & group chats</li>
            <li>Voice & video calls via WebRTC</li>
            <li>Social feed with posts, stories, reactions</li>
            <li>Follow system & friend connections</li>
            <li>Multi-account support</li>
            <li>Customizable profiles & themes</li>
          </ul>
          <h2 className="text-2xl font-bold">Contact</h2>
          <p>For support or business inquiries, email us at <strong>support@xyteee.com</strong></p>
        </div>
      </div>
    </Layout>
  );
}
