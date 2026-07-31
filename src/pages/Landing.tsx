import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function useIntersectionObserver() {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isIntersecting };
}

const FadeIn = ({ children, delay = 0, className = '' }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const { ref, isIntersecting } = useIntersectionObserver();
  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 transform ${isIntersecting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function Landing() {
  const [annual, setAnnual] = useState(false);

  const features = [
    { icon: '📊', title: 'Smart Dashboard', desc: 'Real-time bikri analytics', color: 'bg-blue-500/10 border-blue-500/30' },
    { icon: '🧾', title: 'GST Billing', desc: 'Automatic tax calculation', color: 'bg-green-500/10 border-green-500/30' },
    { icon: '📦', title: 'Inventory Management', desc: 'Low stock alerts', color: 'bg-orange-500/10 border-orange-500/30' },
    { icon: '👥', title: 'Customer CRM', desc: 'Loyalty points & segments', color: 'bg-purple-500/10 border-purple-500/30' },
    { icon: '💰', title: 'Payment Tracking', desc: 'Udhar management', color: 'bg-red-500/10 border-red-500/30' },
    { icon: '📈', title: 'Analytics', desc: 'Profit/Loss reports', color: 'bg-teal-500/10 border-teal-500/30' },
    { icon: '🤖', title: 'AI WhatsApp Bot', desc: 'Voice se stock check', color: 'bg-brand-whatsapp/10 border-brand-whatsapp/30' },
    { icon: '🎁', title: 'Loyalty Program', desc: 'Customer retention', color: 'bg-pink-500/10 border-pink-500/30' },
  ];

  const plans = [
    {
      name: 'Starter', price: 299, annualPrice: 239,
      features: ['500 invoices/month', '100 products', '1 user', 'Basic analytics', 'WhatsApp notifications'],
    },
    {
      name: 'Growth', price: 799, annualPrice: 639, popular: true,
      features: ['Unlimited invoices', '1000 products', '3 users', 'Advanced analytics', 'WhatsApp bot', 'GST reports', 'Loyalty program'],
    },
    {
      name: 'Pro', price: 1499, annualPrice: 1199,
      features: ['Everything in Growth', 'Unlimited products', '10 users', 'CA collaboration', 'Multi-store', 'Priority support', 'Custom reports', 'API access'],
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans overflow-x-hidden selection:bg-brand-purple selection:text-white" style={{ background: '#0F0A1E' }}>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 8s ease-in-out infinite 2s;
        }
        .text-gradient-purple {
          background: linear-gradient(135deg, #A78BFA, #7C3AED);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .text-gradient-gold {
          background: linear-gradient(135deg, #FCD34D, #F59E0B);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4" style={{ background: 'linear-gradient(135deg, #1E0A3C 0%, #2D1266 100%)' }}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[20%] left-[10%] w-64 h-64 rounded-full mix-blend-screen animate-float" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3), transparent 70%)' }} />
          <div className="absolute top-[40%] right-[10%] w-96 h-96 rounded-full mix-blend-screen animate-float-delayed" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)' }} />
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#7C3AED 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <FadeIn>
            <h1 className="text-5xl md:text-7xl font-heading font-extrabold mb-6 tracking-tight">
              <span className="text-white">Welcome to</span> <br className="md:hidden" />
              <span className="text-gradient-purple animate-pulse">ShoppIQ</span>
            </h1>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-2xl md:text-3xl font-heading font-semibold mb-6 text-gradient-gold">
              Dukaan se Digital tak
            </p>
          </FadeIn>
          <FadeIn delay={400}>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              India ka #1 AI-powered dukaan management app for kirana stores & MSMEs. Manage billing, inventory, and customers effortlessly.
            </p>
          </FadeIn>
          <FadeIn delay={600} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="px-8 py-4 rounded-full font-heading font-bold text-lg text-white shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_rgba(124,58,237,0.7)] transition-all transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
              Abhi Start Karo — Free ✨
            </Link>
            <a href="#how-it-works" className="px-8 py-4 rounded-full font-heading font-bold text-lg border-2 border-white/20 hover:bg-white/5 transition-all text-white">
              Demo Dekho
            </a>
          </FadeIn>
          
          <FadeIn delay={800} className="mt-20 flex flex-wrap justify-center gap-8 md:gap-16 border-t border-white/10 pt-10">
            <div className="text-center">
              <div className="text-3xl font-bold font-heading text-white">10,000+</div>
              <div className="text-sm text-gray-400 mt-1 uppercase tracking-wider">Stores</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-heading text-white">₹50Cr+</div>
              <div className="text-sm text-gray-400 mt-1 uppercase tracking-wider">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-heading text-white">28</div>
              <div className="text-sm text-gray-400 mt-1 uppercase tracking-wider">States</div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-[#0F0A1E]">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold mb-4">Everything you need</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">One app to run your entire retail business smartly and efficiently.</p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <FadeIn key={i} delay={i * 100} className={`p-6 rounded-3xl border backdrop-blur-sm transition-all duration-300 hover:transform hover:-translate-y-2 ${feature.color} hover:bg-white/5`}>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-heading font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 bg-[#160D2E] relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <FadeIn className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold mb-4">How it works</h2>
            <p className="text-gray-400 text-lg">Start managing your store in just 3 simple steps</p>
          </FadeIn>
          
          <div className="flex flex-col md:flex-row justify-between items-center relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 border-t-2 border-dashed border-purple-500/30 transform -translate-y-1/2 z-0" />
            
            {[
              { step: 1, title: 'Sign Up', desc: 'Login with Phone OTP in seconds' },
              { step: 2, title: 'Add Products', desc: 'Scan barcode or add manually' },
              { step: 3, title: 'Start Billing', desc: 'Print bills & send via WhatsApp' },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 200} className="relative z-10 flex flex-col items-center text-center max-w-xs mb-10 md:mb-0">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold font-heading mb-4 shadow-[0_0_20px_rgba(124,58,237,0.4)]" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
                  {item.step}
                </div>
                <h3 className="text-xl font-heading font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-[#0F0A1E]">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-12">
            <h2 className="text-4xl font-heading font-bold mb-4">Simple Pricing</h2>
            <p className="text-gray-400 text-lg mb-8">Choose the plan that fits your business needs</p>
            
            <div className="inline-flex items-center p-1 bg-white/5 rounded-full border border-white/10">
              <button 
                onClick={() => setAnnual(false)} 
                className={`px-6 py-2 rounded-full font-medium transition-all ${!annual ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setAnnual(true)} 
                className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${annual ? 'bg-brand-purple text-white' : 'text-gray-400 hover:text-white'}`}
              >
                Annually <span className="text-[10px] uppercase bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Save 20%</span>
              </button>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
            {plans.map((plan, i) => (
              <FadeIn key={i} delay={i * 200} className={`relative p-8 rounded-3xl border transition-all duration-300 ${plan.popular ? 'bg-brand-purple/10 border-brand-purple/50 transform md:-translate-y-4 shadow-[0_0_40px_rgba(124,58,237,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-brand-purple text-white text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-lg">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-heading font-semibold text-white mb-2">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-bold text-white">₹{annual ? plan.annualPrice : plan.price}</span>
                  <span className="text-gray-400 mb-1">/mo</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-3 text-gray-300">
                      <span className="text-green-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/login" className={`block w-full py-4 text-center rounded-xl font-heading font-bold transition-all ${plan.popular ? 'bg-brand-purple hover:bg-brand-purple-light text-white shadow-lg' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                  Get Started
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0A0514] border-t border-white/10 pt-16 pb-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-8 mb-12">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-heading font-bold text-white mb-2">SHOPP <span className="text-gradient-purple">IQ</span></h2>
            <p className="text-gray-400 text-sm">Dukaan se Digital tak.</p>
          </div>
          <div className="flex gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact Us</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto text-center border-t border-white/10 pt-8 text-gray-500 text-sm">
          <p>Made with ❤️ in India for the World.</p>
          <p className="mt-2">© {new Date().getFullYear()} ShoppIQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
