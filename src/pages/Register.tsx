import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/formatters';
import {
  BarChart3, CheckCircle,
  ArrowLeft, Building2, ShoppingBag, Pill,
  Cpu, Shirt, UtensilsCrossed, Package
} from 'lucide-react';
import confetti from 'canvas-confetti';

const businessTypes = [
  { id: 'kirana', label: 'Kirana Store', labelHi: 'किराना स्टोर', icon: ShoppingBag },
  { id: 'grocery', label: 'Grocery', labelHi: 'किराना', icon: Package },
  { id: 'pharmacy', label: 'Pharmacy', labelHi: 'मेडिकल', icon: Pill },
  { id: 'electronics', label: 'Electronics', labelHi: 'इलेक्ट्रॉनिक्स', icon: Cpu },
  { id: 'clothing', label: 'Clothing', labelHi: 'कपड़े', icon: Shirt },
  { id: 'restaurant', label: 'Restaurant', labelHi: 'रेस्तरां', icon: UtensilsCrossed },
  { id: 'other', label: 'Other', labelHi: 'अन्य', icon: Building2 },
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry', 'Jammu & Kashmir', 'Ladakh'
];

export default function Register() {
  const { registerTenant, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    businessName: '',
    businessNameHindi: '',
    businessType: '' as any,
    city: '',
    state: 'Rajasthan',
    ownerName: '',
    gstin: '',
    isMsmeRegistered: false,
    whatsappNumber: user?.phoneNumber?.replace('+91', '') || '',
    languagePreference: language as 'hi' | 'en',
  });

  const confettiRef = useRef(false);

  const update = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (s === 2) {
      if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
      if (!formData.businessType) newErrors.businessType = 'Select a business type';
      if (!formData.city.trim()) newErrors.city = 'City is required';
    }
    if (s === 3) {
      if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(s => s + 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await registerTenant({
        businessName: formData.businessName,
        businessNameHindi: formData.businessNameHindi || '',
        ownerName: formData.ownerName,
        phoneNumber: user?.phoneNumber || '',
        whatsappNumber: formData.whatsappNumber,
        gstin: formData.gstin || '',
        businessType: formData.businessType,
        city: formData.city,
        state: formData.state,
        pincode: '',
        trialEndsAt: null as any,
        logoUrl: '',
        isMsmeRegistered: formData.isMsmeRegistered,
        languagePreference: formData.languagePreference,
      });
      setLanguage(formData.languagePreference);
      setSuccess(true);

      // Trigger confetti
      if (!confettiRef.current) {
        confettiRef.current = true;
        const end = Date.now() + 3000;
        const colors = ['#7C3AED', '#F59E0B', '#10B981', '#8B5CF6', '#FCD34D'];

        function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors,
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        }
        frame();
      }

      setTimeout(() => navigate('/dashboard'), 4000);
    } catch (err: any) {
      setErrors({ submit: err.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = [
    { num: 1, label: language === 'hi' ? 'Phone' : 'Phone' },
    { num: 2, label: language === 'hi' ? 'Dukaan' : 'Business' },
    { num: 3, label: language === 'hi' ? 'Maalik' : 'Owner' },
    { num: 4, label: language === 'hi' ? 'WhatsApp' : 'WhatsApp' },
  ];

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0F0A1E 0%, #1A0D3F 100%)' }}>
        <div className="text-center animate-scale-in">
          <div className="w-24 h-24 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-brand-green" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-white mb-3">
            {t('welcomeMessage')}
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            <span className="text-gradient-gold font-semibold">{formData.businessName}</span>
          </p>
          <p className="text-gray-400 mb-8">{t('registrationComplete')}</p>
          <div className="flex items-center gap-2 text-gray-400 justify-center">
            <div className="w-4 h-4 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            {language === 'hi' ? 'Dashboard khol rahe hain...' : 'Opening your dashboard...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0F0A1E 0%, #1A0D3F 100%)' }}>

      <div className="w-full max-w-lg animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
              <BarChart3 size={20} className="text-white" />
            </div>
            <span className="text-2xl font-heading font-bold text-white">SHOPP IQ</span>
          </div>
          <p className="text-sm text-gray-400">
            {language === 'hi' ? 'अपनी दुकान रजिस्टर करें' : 'Register your business'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {stepLabels.map(({ num, label }) => (
              <div key={num} className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold font-heading transition-all duration-300',
                  step > num ? 'bg-brand-green text-white' :
                    step === num ? 'bg-brand-purple text-white shadow-purple-glow-sm' :
                      'bg-white/10 text-gray-500'
                )}>
                  {step > num ? '✓' : num}
                </div>
                <span className={cn(
                  'text-[10px] font-heading transition-colors',
                  step >= num ? 'text-gray-300' : 'text-gray-600'
                )}>{label}</span>
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 border"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(124,58,237,0.3)',
          }}>

          {/* Step 1: Already done - Phone verification */}
          {step === 1 && (
            <div className="animate-slide-up">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-brand-green" />
                </div>
                <h2 className="text-xl font-heading font-bold text-white mb-2">
                  {language === 'hi' ? 'Phone verify ho gaya! ✅' : 'Phone Verified! ✅'}
                </h2>
                <p className="text-gray-400 text-sm mb-2">{user?.phoneNumber}</p>
                <p className="text-gray-400 text-sm">
                  {language === 'hi'
                    ? 'Ab apni dukaan ki jaankari do'
                    : 'Now let\'s set up your business profile'}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Business Info */}
          {step === 2 && (
            <div className="animate-slide-up space-y-4">
              <div>
                <h2 className="text-xl font-heading font-bold text-white mb-1">
                  {language === 'hi' ? 'Dukaan ki Jaankari 🏪' : 'Business Information 🏪'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {language === 'hi' ? 'Apni dukaan ke baare mein batao' : 'Tell us about your business'}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-heading">
                  {language === 'hi' ? 'Dukaan ka Naam (English)*' : 'Business Name (English)*'}
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => update('businessName', e.target.value)}
                  placeholder="e.g. Sharma General Store"
                  className="input-field text-white placeholder:text-gray-600"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: errors.businessName ? '#EF4444' : 'rgba(124,58,237,0.3)' }}
                />
                {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName}</p>}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-heading">
                  {language === 'hi' ? 'Dukaan ka Naam (Hindi)' : 'Business Name (Hindi)'}
                </label>
                <input
                  type="text"
                  value={formData.businessNameHindi}
                  onChange={(e) => update('businessNameHindi', e.target.value)}
                  placeholder="जैसे शर्मा जनरल स्टोर"
                  className="input-field text-white placeholder:text-gray-600"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(124,58,237,0.3)' }}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 font-heading">
                  {language === 'hi' ? 'Dukaan ka Prakar*' : 'Business Type*'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {businessTypes.map((bt) => (
                    <button
                      key={bt.id}
                      onClick={() => update('businessType', bt.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium font-heading transition-all',
                        formData.businessType === bt.id
                          ? 'bg-brand-purple/20 border-brand-purple text-brand-purple'
                          : 'border-white/10 text-gray-400 hover:border-brand-purple/50'
                      )}
                    >
                      <bt.icon size={18} />
                      <span>{language === 'hi' ? bt.labelHi : bt.label}</span>
                    </button>
                  ))}
                </div>
                {errors.businessType && <p className="text-red-400 text-xs mt-1">{errors.businessType}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-heading">
                    {language === 'hi' ? 'Sheher*' : 'City*'}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="e.g. Jaipur"
                    className="input-field text-white placeholder:text-gray-600"
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: errors.city ? '#EF4444' : 'rgba(124,58,237,0.3)' }}
                  />
                  {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-heading">
                    {language === 'hi' ? 'Rajya*' : 'State*'}
                  </label>
                  <select
                    value={formData.state}
                    onChange={(e) => update('state', e.target.value)}
                    className="input-field text-white"
                    style={{ background: 'rgba(30,15,60,0.9)', borderColor: 'rgba(124,58,237,0.3)' }}
                  >
                    {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Owner Details */}
          {step === 3 && (
            <div className="animate-slide-up space-y-4">
              <div>
                <h2 className="text-xl font-heading font-bold text-white mb-1">
                  {language === 'hi' ? 'Maalik ki Jaankari 👤' : 'Owner Details 👤'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {language === 'hi' ? 'Apni personal jaankari bharein' : 'Fill in your personal details'}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-heading">
                  {language === 'hi' ? 'Maalik ka Naam*' : 'Owner Name*'}
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => update('ownerName', e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="input-field text-white placeholder:text-gray-600"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: errors.ownerName ? '#EF4444' : 'rgba(124,58,237,0.3)' }}
                />
                {errors.ownerName && <p className="text-red-400 text-xs mt-1">{errors.ownerName}</p>}
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-heading">
                  GSTIN ({language === 'hi' ? 'Zaroori nahi' : 'Optional'})
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => update('gstin', e.target.value.toUpperCase())}
                  placeholder="e.g. 08ABCDE1234F1Z5"
                  maxLength={15}
                  className="input-field text-white placeholder:text-gray-600 font-mono uppercase tracking-wider"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(124,58,237,0.3)' }}
                />
                {formData.gstin && (
                  <p className={cn('text-xs mt-1', formData.gstin.length === 15 ? 'text-brand-green' : 'text-gray-500')}>
                    {formData.gstin.length}/15
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between p-4 rounded-xl border cursor-pointer"
                  style={{ borderColor: 'rgba(124,58,237,0.3)', background: 'rgba(255,255,255,0.03)' }}
                  onClick={() => update('isMsmeRegistered', !formData.isMsmeRegistered)}>
                  <div>
                    <div className="text-white text-sm font-medium font-heading">
                      {language === 'hi' ? 'MSME Panjikrit hai?' : 'MSME Registered?'}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {language === 'hi' ? 'Udyam Registration Certificate' : 'Udyam Registration Certificate'}
                    </div>
                  </div>
                  <div className={cn(
                    'w-12 h-6 rounded-full transition-all duration-300 relative',
                    formData.isMsmeRegistered ? 'bg-brand-purple' : 'bg-gray-700'
                  )}>
                    <div className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300',
                      formData.isMsmeRegistered ? 'right-1' : 'left-1'
                    )} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: WhatsApp */}
          {step === 4 && (
            <div className="animate-slide-up space-y-4">
              <div>
                <h2 className="text-xl font-heading font-bold text-white mb-1">
                  {language === 'hi' ? 'WhatsApp Setup 📱' : 'WhatsApp Setup 📱'}
                </h2>
                <p className="text-gray-400 text-sm">
                  {language === 'hi'
                    ? 'Grahak ko bill WhatsApp par bhejna ke liye'
                    : 'For sending bills to customers via WhatsApp'}
                </p>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-heading">
                  WhatsApp Number
                </label>
                <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(124,58,237,0.3)' }}>
                  <div className="flex items-center px-4 py-3 text-white/70 text-sm font-medium flex-shrink-0"
                    style={{ background: 'rgba(124,58,237,0.1)', borderRight: '1px solid rgba(124,58,237,0.3)' }}>
                    🇮🇳 +91
                  </div>
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={(e) => update('whatsappNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="flex-1 px-4 py-3 text-white outline-none"
                    style={{ background: 'transparent' }}
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-2 font-heading">
                  {language === 'hi' ? 'Bhasha Chuniye' : 'Language Preference'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'en', label: 'English', sub: 'English interface' },
                    { id: 'hi', label: 'हिंदी', sub: 'Hindi interface' },
                  ].map(l => (
                    <button
                      key={l.id}
                      onClick={() => update('languagePreference', l.id)}
                      className={cn(
                        'p-4 rounded-xl border text-center transition-all',
                        formData.languagePreference === l.id
                          ? 'bg-brand-purple/20 border-brand-purple'
                          : 'border-white/10 hover:border-brand-purple/50'
                      )}
                    >
                      <div className={cn(
                        'text-lg font-bold font-heading',
                        formData.languagePreference === l.id ? 'text-white' : 'text-gray-400'
                      )}>{l.label}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{l.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl border" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                <h3 className="text-brand-green text-sm font-semibold font-heading mb-2">
                  {language === 'hi' ? 'Aapki jaankari:' : 'Your Details:'}
                </h3>
                <div className="space-y-1 text-sm text-gray-400">
                  <div>🏪 {formData.businessName}</div>
                  <div>👤 {formData.ownerName}</div>
                  <div>📍 {formData.city}, {formData.state}</div>
                  <div>📱 +91 {formData.whatsappNumber}</div>
                </div>
              </div>

              {errors.submit && (
                <p className="text-red-400 text-sm text-center">{errors.submit}</p>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white hover:border-white/40 transition-all font-heading text-sm font-medium"
              >
                <ArrowLeft size={16} />
                {t('back')}
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={handleNext}
                className="flex-1 btn-primary justify-center py-3 rounded-xl font-heading"
              >
                {language === 'hi' ? 'Aage Badho →' : 'Next →'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={cn(
                  'flex-1 btn-whatsapp justify-center py-3 rounded-xl font-heading',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {language === 'hi' ? 'Register ho raha hai...' : 'Registering...'}
                  </div>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {language === 'hi' ? 'ShoppIQ Join Karein! 🎉' : 'Join ShoppIQ! 🎉'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
