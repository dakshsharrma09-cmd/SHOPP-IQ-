import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MessageSquare, Globe, ArrowRight, RotateCcw, ChevronRight, Shield, Lock } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/formatters';

export default function Login() {
  const { sendOTP, verifyOTP, user, tenant } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (tenant) navigate('/dashboard', { replace: true });
      else navigate('/register', { replace: true });
    }
  }, [user, tenant, navigate]);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      setError(language === 'hi' ? '10 angka ka phone number daalo' : 'Enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await sendOTP(cleaned);
      setConfirmResult(result);
      setStep('otp');
      setCountdown(30);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setError(
          language === 'hi'
            ? 'Firebase mein Phone Auth enable nahi hai. Firebase Console → Authentication → Sign-in method → Phone ON karo.'
            : 'Phone Auth is not enabled. Go to Firebase Console → Authentication → Sign-in method → Enable Phone.'
        );
      } else if (code === 'auth/too-many-requests') {
        setError(
          language === 'hi'
            ? 'Bahut zyada requests ho gayi. Thodi der baad koshish karo.'
            : 'Too many requests. Please try again later.'
        );
      } else if (code === 'auth/invalid-phone-number') {
        setError(
          language === 'hi'
            ? 'Phone number galat hai. Sahi 10 angka ka number daalo.'
            : 'Invalid phone number. Enter a valid 10-digit number.'
        );
      } else {
        setError(err.message || 'Failed to send OTP');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit on last digit
    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        handleVerifyOTP(fullOtp);
      }
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpString?: string) => {
    const code = otpString || otp.join('');
    if (code.length !== 6) {
      setError(language === 'hi' ? 'Poora 6 ank ka OTP daalo' : 'Enter the complete 6-digit OTP');
      return;
    }
    if (!confirmResult) return;
    setError('');
    setLoading(true);
    try {
      const { isNewUser } = await verifyOTP(confirmResult, code);
      if (isNewUser) {
        navigate('/register');
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError(language === 'hi' ? 'Galat OTP hai. Dobara koshish karein.' : 'Invalid OTP. Please try again.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at top, #EDE9FE 0%, #FCE7F3 50%, #F5F3FF 100%)' }}>

      {/* Decorative blurred circles */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'rgba(109,40,217,0.06)', filter: 'blur(80px)' }} />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'rgba(219,39,119,0.05)', filter: 'blur(80px)' }} />

      {/* Language Toggle - top right */}
      <button
        onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
        className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all text-sm font-medium bg-white/70 backdrop-blur-sm"
      >
        <Globe size={14} />
        {language === 'en' ? 'हिंदी' : 'English'}
      </button>

      {/* Hidden recaptcha container */}
      <div id="recaptcha-container" />

      {/* Login Card */}
      <div className="relative w-full max-w-[420px] mx-auto animate-slide-up z-10">
        <div className="p-10 bg-white relative overflow-hidden"
          style={{
            borderRadius: '24px',
            border: '1px solid rgba(109,40,217,0.1)',
            boxShadow: '0 20px 60px rgba(109,40,217,0.12), 0 4px 20px rgba(0,0,0,0.06)'
          }}>

          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="ShoppIQ" className="h-[80px] w-auto mx-auto" />
          </div>

          {step === 'phone' ? (
            <div className="animate-slide-up">
              <h2 className="text-xl font-heading font-semibold mb-1 text-center" style={{ color: '#1E1B4B' }}>
                {language === 'hi' ? 'Swagat hai! 👋' : 'Welcome Back! 👋'}
              </h2>
              <p className="text-sm text-center mb-6" style={{ color: '#6B7280' }}>
                {language === 'hi' ? 'Apna phone number daalo' : 'Enter your mobile number to continue'}
              </p>

              {/* Phone Input */}
              <div className="mb-5">
                <label className="block text-[13px] font-semibold text-[#374151] mb-2 font-heading">
                  {t('phoneNumber')}
                </label>
                <div className="flex overflow-hidden transition-all bg-white"
                  style={{
                    borderRadius: '12px',
                    border: error ? '2px solid #DC2626' : '1.5px solid #E5E7EB',
                    height: '52px',
                  }}>
                  <div className="flex items-center gap-2 px-4 border-r border-[#E5E7EB] text-gray-600 text-sm font-medium flex-shrink-0 bg-gray-50">
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      setError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    placeholder="98765 43210"
                    className="flex-1 px-4 text-gray-900 text-base font-medium tracking-wider outline-none bg-transparent"
                    style={{ fontSize: '16px' }}
                    maxLength={10}
                    autoFocus
                  />
                </div>
                {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
              </div>

              {/* Send OTP Button */}
              <button
                onClick={handleSendOTP}
                disabled={loading || phone.length !== 10}
                className={cn(
                  'w-full flex items-center justify-center gap-2 text-white font-semibold font-heading transition-all',
                  (loading || phone.length !== 10) && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                  background: 'linear-gradient(135deg, #6D28D9 0%, #9333EA 50%, #DB2777 100%)',
                  height: '54px',
                  borderRadius: '14px',
                  boxShadow: '0 8px 24px rgba(109,40,217,0.35)',
                  fontSize: '15px',
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {language === 'hi' ? 'Bhej rahe hain...' : 'Sending...'}
                  </div>
                ) : (
                  <>
                    <MessageSquare size={18} />
                    {language === 'hi' ? 'SMS se OTP bhejo' : 'Send OTP via SMS'}
                    <ChevronRight size={16} />
                  </>
                )}
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-5 mt-5">
                <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  <Shield size={12} /> Secure Login
                </span>
                <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  <Lock size={12} /> Data Protected
                </span>
                <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  🇮🇳 Made in India
                </span>
              </div>

              {/* Terms */}
              <p className="text-center mt-5" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                By continuing you agree to our{' '}
                <Link to="/terms" className="font-medium" style={{ color: '#6D28D9' }}>Terms</Link>
                {' & '}
                <Link to="/privacy" className="font-medium" style={{ color: '#6D28D9' }}>Privacy Policy</Link>
              </p>
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare size={20} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-heading font-semibold mb-1" style={{ color: '#1E1B4B' }}>
                  {language === 'hi' ? 'OTP Bhej Diya! ✅' : 'OTP Sent! ✅'}
                </h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {language === 'hi'
                    ? `+91 ${phone} par SMS se 6-digit OTP bheja gaya`
                    : `We've sent a 6-digit OTP to +91 ${phone} via SMS`}
                </p>
              </div>

              {/* 6-box OTP input */}
              <div className={cn("flex gap-2.5 justify-center mb-6", error && "animate-shake")}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    className={cn(
                      'w-12 h-13 text-center text-lg font-semibold outline-none transition-all',
                      digit
                        ? 'border-[#6D28D9] bg-[#F5F3FF] text-[#1F2937]'
                        : 'border-[#E5E7EB] bg-white text-[#1F2937] focus:border-[#6D28D9]'
                    )}
                    style={{
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderRadius: '12px',
                      height: '52px',
                      width: '48px',
                    }}
                    maxLength={1}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-xs text-center mb-4">{error}</p>}

              {/* Verify Button */}
              <button
                onClick={() => handleVerifyOTP()}
                disabled={loading || otp.join('').length !== 6}
                className={cn(
                  'w-full flex items-center justify-center gap-2 text-white font-semibold font-heading transition-all',
                  (loading || otp.join('').length !== 6) && 'opacity-50 cursor-not-allowed'
                )}
                style={{
                  background: 'linear-gradient(135deg, #6D28D9 0%, #9333EA 50%, #DB2777 100%)',
                  height: '54px',
                  borderRadius: '14px',
                  boxShadow: '0 8px 24px rgba(109,40,217,0.35)',
                  fontSize: '15px',
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {language === 'hi' ? 'Verify ho raha hai...' : 'Verifying...'}
                  </div>
                ) : (
                  <>
                    {t('verifyOTP')}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Resend OTP */}
              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  ← {language === 'hi' ? 'Wapas jao' : 'Go back'}
                </button>
                {countdown > 0 ? (
                  <span className="text-sm text-gray-500">
                    {t('resendIn')} {countdown}s
                  </span>
                ) : (
                  <button
                    onClick={handleSendOTP}
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 transition-colors font-medium"
                  >
                    <RotateCcw size={14} />
                    {language === 'hi' ? 'SMS se OTP dobara bhejo' : 'Resend OTP via SMS'}
                  </button>
                )}
              </div>

              {/* Terms */}
              <p className="text-center mt-6" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                By continuing you agree to our{' '}
                <Link to="/terms" className="font-medium" style={{ color: '#6D28D9' }}>Terms</Link>
                {' & '}
                <Link to="/privacy" className="font-medium" style={{ color: '#6D28D9' }}>Privacy Policy</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
