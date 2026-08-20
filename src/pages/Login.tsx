import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Globe, ArrowRight, RotateCcw, ChevronRight } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/formatters';

function CountUp({ target, prefix = '', suffix = '', isFloat = false }: { target: number; prefix?: string; suffix?: string; isFloat?: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(isFloat ? Number(current.toFixed(1)) : Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, isFloat]);
  return <>{prefix}{isFloat ? count.toFixed(1) : count.toLocaleString('en-IN')}{suffix}</>;
}

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden login-pattern-bg animated-gradient-bg">

      {/* Language Toggle - top right */}
      <button
        onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
        className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all text-sm font-medium bg-white/50 backdrop-blur-sm"
      >
        <Globe size={14} />
        {language === 'en' ? 'हिंदी' : 'English'}
      </button>

      {/* Hidden recaptcha container */}
      <div id="recaptcha-container" />

      {/* Login Card */}
      <div className="relative w-full max-w-[420px] mx-auto animate-slide-up-fade">
        <div className="rounded-2xl p-8 bg-white border border-[#F3F4F6] relative overflow-hidden"
          style={{
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(109,40,217,0.06)'
          }}>

          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo.png" alt="ShoppIQ" className="h-[80px] w-auto mx-auto" />
          </div>

          {step === 'phone' ? (
            <div className="animate-slide-up">
              <h2 className="text-xl font-heading font-semibold text-gray-900 mb-1 text-center">
                {language === 'hi' ? 'Swagat hai! 👋' : 'Welcome Back! 👋'}
              </h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                {language === 'hi' ? 'Apna phone number daalo' : 'Enter your mobile number to continue'}
              </p>

              {/* Phone Input */}
              <div className="mb-4">
                <label className="block text-[13px] font-semibold text-[#374151] mb-2 font-heading">
                  {t('phoneNumber')}
                </label>
                <div className="flex rounded-[10px] overflow-hidden border-[1.5px] transition-all bg-white focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200"
                  style={{ borderColor: error ? '#EF4444' : '#E5E7EB', height: '44px' }}>
                  <div className="flex items-center gap-2 px-3 py-2 border-r border-[#E5E7EB] text-gray-600 text-sm font-medium flex-shrink-0 bg-gray-50">
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
                    placeholder={language === 'hi' ? '98765 43210' : '98765 43210'}
                    className="flex-1 px-3 py-2 text-gray-900 text-base font-medium tracking-wider outline-none bg-transparent"
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
                  'btn-primary w-full justify-center text-base rounded-xl font-heading h-[44px]',
                  (loading || phone.length !== 10) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {language === 'hi' ? 'Bhej rahe hain...' : 'Sending...'}
                  </div>
                ) : (
                  <>
                    <MessageCircle size={18} />
                    {t('sendOTP')}
                    <ChevronRight size={16} />
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                {language === 'hi'
                  ? 'OTP WhatsApp aur SMS dono par aayega'
                  : 'OTP will be sent via WhatsApp & SMS'}
              </p>
            </div>
          ) : (
            <div className="animate-slide-up">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle size={20} className="text-purple-600" />
                </div>
                <h2 className="text-xl font-heading font-semibold text-gray-900 mb-1">
                  {t('enterOTP')}
                </h2>
                <p className="text-sm text-gray-500">
                  {language === 'hi'
                    ? `+91 ${phone} par OTP bheja gaya`
                    : `OTP sent to +91 ${phone}`}
                </p>
              </div>

              {/* 6-box OTP input */}
              <div className={cn("flex gap-2 justify-center mb-6", error && "animate-shake")}>
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
                      'w-11 h-12 text-center text-lg font-semibold rounded-[10px] border-[1.5px] outline-none transition-all',
                      digit ? 'border-[#6D28D9] bg-[#F5F3FF] text-[#1F2937]' : 'border-[#E5E7EB] bg-white text-[#1F2937] focus:border-purple-500 focus:ring-2 focus:ring-purple-200'
                    )}
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
                  'btn-primary w-full justify-center text-base rounded-xl font-heading h-[44px]',
                  (loading || otp.join('').length !== 6) && 'opacity-50 cursor-not-allowed'
                )}
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
              <div className="flex items-center justify-between mt-4">
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
                    {t('resendOTP')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-4">
              {language === 'hi'
                ? 'India ke 10,000+ kirana stores ka bharosa'
                : "Trusted by 10,000+ kirana stores across India"}
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="flex-1 bg-[#F5F3FF] rounded-lg py-2 px-1 text-center">
                <div className="text-purple-700 text-sm font-bold font-heading"><CountUp target={10} suffix="K+" /></div>
                <div className="text-purple-600/70 text-[10px] font-medium mt-0.5">Stores</div>
              </div>
              <div className="flex-1 bg-[#F5F3FF] rounded-lg py-2 px-1 text-center">
                <div className="text-purple-700 text-sm font-bold font-heading"><CountUp target={50} prefix="₹" suffix="Cr+" /></div>
                <div className="text-purple-600/70 text-[10px] font-medium mt-0.5">Processed</div>
              </div>
              <div className="flex-1 bg-[#F5F3FF] rounded-lg py-2 px-1 text-center">
                <div className="text-purple-700 text-sm font-bold font-heading"><CountUp target={4.8} suffix=" ★" isFloat /></div>
                <div className="text-purple-600/70 text-[10px] font-medium mt-0.5">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
