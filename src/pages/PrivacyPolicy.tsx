import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans overflow-x-hidden selection:bg-brand-purple selection:text-white" style={{ background: '#0F0A1E' }}>
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4" style={{ background: 'linear-gradient(135deg, #1E0A3C 0%, #2D1266 100%)' }}>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-heading font-extrabold mb-6 tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-300">Last updated: August 6, 2026</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 bg-[#0F0A1E]">
        <div className="max-w-4xl mx-auto prose prose-invert prose-purple">
          <div className="bg-white/5 rounded-3xl p-8 md:p-12 border border-white/10">
            <Link to="/landing" className="inline-block mb-8 text-brand-purple hover:text-white transition-colors">&larr; Back to Home</Link>
            
            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">1. Information Collection</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              At ShoppIQ, we collect information to provide better services to all our users. When you sign up for a ShoppIQ account, we ask for personal information, like your name, store name, phone number, and email address. We use phone numbers for authentication and verification purposes. We also collect the data you input while using the application, including inventory, customer information, and billing details.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">2. Usage of Data</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              We use the information we collect from all our services to provide, maintain, protect and improve them, to develop new ones, and to protect ShoppIQ and our users. Your business data is used to provide you with analytics, reports, and seamless management of your retail business operations.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">3. Data Storage</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Your business data is securely stored on Firebase and Google Cloud platforms. We utilize industry-standard cloud infrastructure to ensure high availability, redundancy, and data integrity for your business operations.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">4. Security</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              We work hard to protect ShoppIQ and our users from unauthorized access to or unauthorized alteration, disclosure or destruction of information we hold. We encrypt many of our services using SSL and your data is encrypted in transit. We review our information collection, storage and processing practices, including physical security measures, to guard against unauthorized access to systems.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">5. Third-party Services</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              We may share non-personally identifiable information publicly and with our partners — like publishers, advertisers or connected sites. We may also utilize third-party services for analytics, payment processing, or communication (such as WhatsApp integration), which are governed by their respective privacy policies.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">6. Cookies</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              We use various technologies to collect and store information when you visit ShoppIQ, and this may include using cookies or similar technologies to identify your browser or device. We use these technologies to collect and store information when you interact with services we offer to our partners.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">7. User Rights</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You have the right to access, update, and request deletion of your personal and business data. You can exercise these rights through your account settings or by contacting our support team.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">8. Contact Us</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at privacy@shoppiq.in.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
