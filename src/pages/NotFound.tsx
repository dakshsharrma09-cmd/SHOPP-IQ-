import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans overflow-x-hidden selection:bg-brand-purple selection:text-white flex items-center justify-center" style={{ background: '#0F0A1E' }}>
      
      {/* Background Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[30%] left-[30%] w-64 h-64 rounded-full mix-blend-screen animate-pulse" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.2), transparent 70%)' }} />
        <div className="absolute top-[60%] right-[30%] w-96 h-96 rounded-full mix-blend-screen animate-pulse" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1), transparent 70%)', animationDelay: '1s' }} />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#7C3AED 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 text-center px-4">
        <h1 className="text-8xl md:text-9xl font-heading font-extrabold mb-4 tracking-tighter" style={{ background: 'linear-gradient(135deg, #A78BFA, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </h1>
        <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-6">Page Not Found</h2>
        <p className="text-lg text-gray-400 max-w-md mx-auto mb-10">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link to="/landing" className="inline-block px-8 py-4 rounded-full font-heading font-bold text-lg text-white shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.6)] transition-all transform hover:scale-105" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)' }}>
          Return to Home
        </Link>
      </div>
    </div>
  );
}
