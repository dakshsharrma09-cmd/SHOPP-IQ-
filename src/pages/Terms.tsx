import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans overflow-x-hidden selection:bg-brand-purple selection:text-white" style={{ background: '#0F0A1E' }}>
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4" style={{ background: 'linear-gradient(135deg, #1E0A3C 0%, #2D1266 100%)' }}>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-heading font-extrabold mb-6 tracking-tight text-white">
            Terms of Service
          </h1>
          <p className="text-xl text-gray-300">Last updated: August 6, 2026</p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 px-4 bg-[#0F0A1E]">
        <div className="max-w-4xl mx-auto prose prose-invert prose-purple">
          <div className="bg-white/5 rounded-3xl p-8 md:p-12 border border-white/10">
            <Link to="/landing" className="inline-block mb-8 text-brand-purple hover:text-white transition-colors">&larr; Back to Home</Link>
            
            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              By accessing and using ShoppIQ, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services. Any participation in this service will constitute acceptance of this agreement.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">2. Description of Service</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              ShoppIQ is a cloud-based business management tool designed for retail stores and MSMEs. We provide services including inventory management, GST billing, customer relationship management, and analytics via our web application.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">3. User Responsibilities</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or mobile device. You agree to accept responsibility for all activities that occur under your account or password. You must provide accurate and complete information when creating your account and using our services.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">4. Data Ownership</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Users retain full ownership of all business data, customer information, and inventory details entered into the ShoppIQ platform. We claim no ownership over the data you process through our services, other than the right to host and backup such data to provide you with the agreed services.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">5. Pricing and Payments</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              ShoppIQ offers various subscription tiers. By subscribing to a paid tier, you agree to pay the fees associated with your chosen plan. All payments are non-refundable unless otherwise required by law or explicitly stated in these terms. We reserve the right to modify our pricing with reasonable notice.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">6. Cancellation and Termination</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You may cancel your account at any time. Upon cancellation, your access to the service will be terminated. We reserve the right to suspend or terminate your account if you violate these terms or for any other reason at our sole discretion.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              ShoppIQ shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the services.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">8. Governing Law</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any legal action or proceeding related to this platform shall be brought exclusively in the courts of India.
            </p>

            <h2 className="text-2xl font-heading font-bold text-white mt-8 mb-4">9. Contact Information</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              If you have any questions about these Terms, please contact us at legal@shoppiq.in.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
