import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn } from '../lib/formatters';
import { updateTenantProfile } from '../lib/firestoreService';
import { Save, Upload, Check, Crown, Star, Zap, MessageCircle, Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const indianStates = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
];

const plans = [
  {
    id: 'starter', name: 'Starter', price: 299, priceAnnual: 239, icon: Star, color: 'text-blue-500', bgColor: 'bg-blue-50',
    features: ['500 invoices/month', '100 products', '1 user', 'Basic analytics', 'WhatsApp notifications'],
  },
  {
    id: 'growth', name: 'Growth', price: 799, priceAnnual: 639, icon: Zap, color: 'text-brand-purple', bgColor: 'bg-brand-purple/10',
    features: ['Unlimited invoices', '1000 products', '3 users', 'Advanced analytics', 'WhatsApp bot', 'GST reports', 'Loyalty program'],
    popular: true,
  },
  {
    id: 'pro', name: 'Pro', price: 1499, priceAnnual: 1199, icon: Crown, color: 'text-brand-gold', bgColor: 'bg-brand-gold/10',
    features: ['Everything in Growth', 'Unlimited products', '10 users', 'CA collaboration', 'Multi-store', 'Priority support', 'Custom reports', 'API access'],
  },
];

export default function Settings() {
  const { tenantId, tenant } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'profile' | 'users' | 'subscription' | 'whatsapp' | 'preferences'>('profile');
  const [annual, setAnnual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { canInstall, promptInstall } = usePWAInstall();

  const [form, setForm] = useState({
    businessName: tenant?.businessName || '',
    ownerName: tenant?.ownerName || '',
    phoneNumber: tenant?.phoneNumber || '',
    whatsappNumber: tenant?.whatsappNumber || '',
    email: tenant?.email || '',
    address: tenant?.address || '',
    pincode: tenant?.pincode || '',
    gstin: tenant?.gstin || '',
    city: tenant?.city || '',
    state: tenant?.state || 'Rajasthan',
    businessType: tenant?.businessType || 'kirana',
  });

  const handleSaveProfile = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      await updateTenantProfile(tenantId, form);
      setSaved(true);
      showToast(' Settings save ho gaye!', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      showToast('Settings save nahi hua.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: t('businessProfile') },
    { id: 'users', label: t('users') },
    { id: 'subscription', label: t('subscription') },
    { id: 'whatsapp', label: t('whatsappConfig') },
    { id: 'preferences', label: 'Preferences' },
  ];

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        . { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      `}</style>
      <div className="p-8 rounded-lg bg-gradient-to-r from-purple-50 via-white to-purple-50 relative overflow-hidden shadow-sm border border-gray-200  mb-6" >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gray-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-heading font-extrabold text-gray-900 mb-2 tracking-tight flex items-center gap-3">
            {t('settings')} 
          </h1>
          <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">सेटिंग्स</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 bg-gray-50 rounded-md w-fit mb-6 overflow-x-auto">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            className={cn('px-5 py-2.5 rounded-md text-sm font-semibold whitespace-nowrap transition-all duration-300',
              tab === tb.id ? 'bg-gradient-to-r from-brand-purple to-purple-700 text-gray-900 shadow-[0_0_15px_rgba(124,58,237,0.4)]' : 'text-gray-500 hover:text-gray-900 ')}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl " >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-brand-purple to-purple-400 flex items-center justify-center text-gray-900 text-2xl font-bold font-heading">
              {(form.businessName || 'S').charAt(0)}
            </div>
            <div>
              <h3 className="font-heading font-bold text-gray-900 text-gray-900">{form.businessName || 'Your Business'}</h3>
              <button className="flex items-center gap-1 mt-1 text-xs text-brand-purple hover:underline">
                <Upload size={12} /> Upload Logo
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Business Name', key: 'businessName', placeholder: 'Sharma General Store' },
              { label: 'Owner Name', key: 'ownerName', placeholder: 'Rajesh Sharma' },
              { label: 'Phone Number', key: 'phoneNumber', placeholder: '+91 98765 43210' },
              { label: 'WhatsApp Number', key: 'whatsappNumber', placeholder: '+91 98765 43210' },
              { label: 'Email', key: 'email', placeholder: 'shop@example.com' },
              { label: 'Address', key: 'address', placeholder: 'Shop No. 1, Main Market' },
              { label: 'Pincode', key: 'pincode', placeholder: '302001' },
              { label: 'GSTIN', key: 'gstin', placeholder: '08ABCDE1234F1Z5' },
              { label: 'City', key: 'city', placeholder: 'Jaipur' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 font-heading mb-1">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-2.5 rounded-md border border-gray-200 border-gray-200 bg-white  text-sm outline-none focus:border-brand-purple" />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-500 font-heading mb-1">State</label>
              <select value={form.state} onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-md border border-gray-200 border-gray-200 bg-white  text-sm outline-none focus:border-brand-purple">
                {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 font-heading mb-1">Business Type</label>
              <select value={form.businessType} onChange={e => setForm(prev => ({ ...prev, businessType: e.target.value as typeof prev.businessType }))}
                className="w-full px-4 py-2.5 rounded-md border border-gray-200 border-gray-200 bg-white  text-sm outline-none focus:border-brand-purple">
                <option value="kirana">Kirana Store</option><option value="grocery">Grocery</option>
                <option value="pharmacy">Pharmacy</option><option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option><option value="restaurant">Restaurant</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button onClick={handleSaveProfile} disabled={saving}
              className={cn('btn-primary py-3 px-6', saving && 'opacity-50')}>
              {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> {t('save')}</>}
            </button>
          </div>
        </div>
      )}

      {tab === 'subscription' && (
        <div className="" >
          {/* Current Plan */}
          <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Current Plan</div>
              <div className="text-xl font-bold font-heading text-gray-900 text-gray-900 capitalize">{tenant?.subscriptionPlan || 'Free'} Plan</div>
              <div className="text-xs text-gray-500 mt-0.5">Renewal: 10/07/2026</div>
            </div>
            <span className="badge-green">Active</span>
          </div>

          {/* Annual Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={cn('text-sm font-medium', !annual ? 'text-gray-900 text-gray-900' : 'text-gray-500')}>Monthly</span>
            <button onClick={() => setAnnual(!annual)}
              className={cn('w-12 h-6 rounded-full transition-all relative', annual ? 'bg-brand-purple' : 'bg-gray-300')}>
              <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', annual ? 'right-1' : 'left-1')} />
            </button>
            <span className={cn('text-sm font-medium', annual ? 'text-gray-900 text-gray-900' : 'text-gray-500')}>
              Annual <span className="text-brand-green text-xs font-bold">Save 20%</span>
            </span>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={cn('bg-white border border-gray-200 rounded-lg p-6 relative transition-all duration-300  hover:border border-gray-200',
                plan.popular ? 'gradient-border shadow-[0_0_30px_rgba(124,58,237,0.3)] ring-0' : '')}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-purple text-gray-900 text-[10px] font-bold">
                    POPULAR 
                  </div>
                )}
                <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-4', plan.bgColor)}>
                  <plan.icon size={22} className={plan.color} />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900 text-gray-900">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-4">
                  <span className="text-2xl font-bold font-heading text-gray-900 text-gray-900">
                    {formatINR(annual ? plan.priceAnnual : plan.price)}
                  </span>
                  <span className="text-sm text-gray-500">/mo</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600 ">
                      <Check size={14} className="text-brand-green flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button className={cn('w-full py-3 rounded-md font-heading text-sm font-semibold transition-all',
                  plan.popular ? 'btn-primary justify-center' : 'border border-gray-200 border-gray-200 text-gray-700  hover:bg-brand-purple/5')}>
                  {plan.popular ? 'Upgrade Now ' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-xl text-center " >
          <div className="text-4xl mb-4"></div>
          <h3 className="font-heading font-bold text-gray-900 text-gray-900 mb-2">
            {language === 'hi' ? 'Team Management jald aa raha hai' : 'Team Management Coming Soon'}
          </h3>
          <p className="text-sm text-gray-500">Upgrade to Growth plan to add team members.</p>
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-xl " >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-brand-whatsapp/10 flex items-center justify-center">
              <MessageCircle size={22} className="text-brand-whatsapp" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-gray-900 text-gray-900">WhatsApp Configuration</h3>
              <p className="text-xs text-gray-500">Configure auto-notifications for invoices & reminders</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-md border border-gray-200 border-gray-200">
              <div><div className="text-sm font-medium text-gray-900 text-gray-900">Invoice Notifications</div><div className="text-xs text-gray-500">Auto-send invoice on creation</div></div>
              <div className="w-10 h-5 rounded-full bg-brand-green relative"><div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" /></div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-md border border-gray-200 border-gray-200">
              <div><div className="text-sm font-medium text-gray-900 text-gray-900">Payment Reminders</div><div className="text-xs text-gray-500">Send before due date</div></div>
              <div className="w-10 h-5 rounded-full bg-brand-green relative"><div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" /></div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-md border border-gray-200 border-gray-200">
              <div><div className="text-sm font-medium text-gray-900 text-gray-900">Daily Summary Report</div><div className="text-xs text-gray-500">Send sales summary at 9 PM</div></div>
              <div className="w-10 h-5 rounded-full bg-gray-300 relative"><div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white" /></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'preferences' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-xl " >
          <h3 className="font-heading font-bold text-gray-900 text-gray-900 mb-6">App Preferences</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 text-gray-900 mb-2">Language / भाषा</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    localStorage.setItem('lang', 'en');
                    if (setLanguage) setLanguage('en');
                    else window.location.reload();
                  }}
                  className={cn("px-4 py-2 rounded-md border text-sm font-medium", language === 'en' ? "border-brand-purple bg-brand-purple/10 text-brand-purple" : "border-gray-200 border-gray-200 text-gray-600 ")}
                >
                  English
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('lang', 'hi');
                    if (setLanguage) setLanguage('hi');
                    else window.location.reload();
                  }}
                  className={cn("px-4 py-2 rounded-md border text-sm font-medium", language === 'hi' ? "border-brand-purple bg-brand-purple/10 text-brand-purple" : "border-gray-200 border-gray-200 text-gray-600 ")}
                >
                  हिंदी (Hindi)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 text-gray-900 mb-2">Theme</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    document.body.classList.remove('dark');
                    localStorage.setItem('theme', 'light');
                  }}
                  className="px-4 py-2 rounded-md border border-gray-200 text-gray-600 text-sm font-medium bg-white"
                >
                  Light Mode
                </button>
                <button 
                  onClick={() => {
                    document.body.classList.add('dark');
                    localStorage.setItem('theme', 'dark');
                  }}
                  className="px-4 py-2 rounded-md border border-gray-700 text-gray-600 text-sm font-medium bg-gray-900"
                >
                  Dark Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Install App Card (shown on all tabs when PWA install is available) ── */}
      {canInstall && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-xl mt-6  /20 bg-white" >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-brand-purple to-purple-600 flex items-center justify-center flex-shrink-0">
              <Smartphone size={26} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-bold text-gray-900 mb-0.5">
                {language === 'hi' ? 'ShoppIQ App Install Karo' : 'Install ShoppIQ App'}
              </h3>
              <p className="text-xs text-gray-500">
                {language === 'hi'
                  ? 'Home screen pe add karo — fast access, offline support, aur native app jaisa feel!'
                  : 'Add to home screen for fast access, offline support, and native app experience!'}
              </p>
            </div>
            <button
              onClick={promptInstall}
              className="btn-primary py-3 px-5 flex items-center gap-2 flex-shrink-0"
            >
              <Download size={16} /> Install
            </button>
          </div>
        </div>
      )}

      <div className='made-in-india mt-8 text-center text-sm text-gray-500 font-medium py-4'>Made with ❤️ in Jabalpur, India 🇮🇳</div>
    </div>
  );
}
