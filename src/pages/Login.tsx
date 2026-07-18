import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, MessageCircle, Globe, ArrowRight, RotateCcw, ChevronRight } from 'lucide-react';
import type { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/formatters';

export default function Login() {
  const { sendOTP, verifyOTP } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

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
      style={{ background: 'linear-gradient(135deg, #0F0A1E 0%, #1A0D3F 50%, #0F0A1E 100%)' }}>

      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(#7C3AED 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      {/* Language Toggle - top right */}
      <button
        onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
        className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 text-white/70 hover:text-white hover:border-white/40 transition-all text-sm font-medium"
      >
        <Globe size={14} />
        {language === 'en' ? 'हिंदी' : 'English'}
      </button>

      {/* Hidden recaptcha container */}
      <div id="recaptcha-container" />

      {/* Login Card */}
      <div className="relative w-full max-w-md animate-scale-in">
        <div className="rounded-3xl p-8 border relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(124,58,237,0.3)',
            boxShadow: '0 0 60px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)', boxShadow: '0 0 30px rgba(124,58,237,0.5)' }}>
              <BarChart3 size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">
              SHOPP <span className="text-gradient-purple">IQ</span>
            </h1>
            <p className="text-sm font-medium" style={{ color: '#F59E0B' }}>
              Dukaan se Digital tak
            </p>
          </div>

          {step === 'phone' ? (
            <div className="animate-slide-up">
              <h2 className="text-xl font-heading font-semibold text-white mb-1 text-center">
                {language === 'hi' ? 'Swagat hai! 👋' : 'Welcome Back! 👋'}
              </h2>
              <p className="text-sm text-gray-400 text-center mb-6">
                {language === 'hi' ? 'Apna phone number daalo' : 'Enter your mobile number to continue'}
              </p>

              {/* Phone Input */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-400 mb-2 font-heading">
                  {t('phoneNumber')}
                </label>
                <div className="flex rounded-xl overflow-hidden border transition-all"
                  style={{ borderColor: error ? '#EF4444' : 'rgba(124,58,237,0.3)' }}>
                  <div className="flex items-center gap-2 px-4 py-3 border-r text-white/70 text-sm font-medium flex-shrink-0"
                    style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.1)' }}>
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
                    className="flex-1 px-4 py-3 text-white text-lg font-medium tracking-wider outline-none"
                    style={{ background: 'transparent' }}
                    maxLength={10}
                    autoFocus
                  />
                </div>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              </div>

              {/* Send OTP Button */}
              <button
                onClick={handleSendOTP}
                disabled={loading || phone.length !== 10}
                className={cn(
                  'btn-whatsapp w-full justify-center text-base py-4 rounded-2xl font-heading',
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
                    <MessageCircle size={20} />
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
                <div className="w-14 h-14 rounded-full bg-brand-whatsapp/20 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle size={24} className="text-brand-whatsapp" />
                </div>
                <h2 className="text-xl font-heading font-semibold text-white mb-1">
                  {t('enterOTP')}
                </h2>
                <p className="text-sm text-gray-400">
                  {language === 'hi'
                    ? `+91 ${phone} par OTP bheja gaya`
                    : `OTP sent to +91 ${phone}`}
                </p>
              </div>

              {/* 6-box OTP input */}
              <div className="flex gap-2 justify-center mb-6">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    className={cn('otp-box', digit && 'filled')}
                    maxLength={1}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {error && <p className="text-red-400 text-xs text-center mb-4">{error}</p>}

              {/* Verify Button */}
              <button
                onClick={() => handleVerifyOTP()}
                disabled={loading || otp.join('').length !== 6}
                className={cn(
                  'btn-primary w-full justify-center text-base py-4 rounded-2xl font-heading',
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
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  ← {language === 'hi' ? 'Wapas jao' : 'Go back'}
                </button>
                {countdown > 0 ? (
                  <span className="text-sm text-gray-400">
                    {t('resendIn')} {countdown}s
                  </span>
                ) : (
                  <button
                    onClick={handleSendOTP}
                    className="text-sm text-brand-purple hover:text-brand-purple-light flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={14} />
                    {t('resendOTP')}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-xs text-gray-500">
              {language === 'hi'
                ? 'India ke 10,000+ kirana stores ka bharosa'
                : "Trusted by 10,000+ kirana stores across India"}
            </p>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="text-center">
                <div className="text-white text-sm font-bold font-heading">10K+</div>
                <div className="text-gray-500 text-[10px]">Stores</div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <div className="text-white text-sm font-bold font-heading">₹50Cr+</div>
                <div className="text-gray-500 text-[10px]">Processed</div>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-center">
                <div className="text-white text-sm font-bold font-heading">4.8 ★</div>
                <div className="text-gray-500 text-[10px]">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
