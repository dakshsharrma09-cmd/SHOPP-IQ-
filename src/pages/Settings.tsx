import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn } from '../lib/formatters';
import { updateTenantProfile } from '../lib/firestoreService';
import { Save, Upload, Check, Crown, Star, Zap, Download, Smartphone } from 'lucide-react';
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
    id: 'starter', name: 'Starter', price: 299, priceAnnual: 239, icon: Star,
    features: ['500 invoices/month', '100 products', '1 user', 'Basic analytics', 'WhatsApp notifications'],
  },
  {
    id: 'growth', name: 'Growth', price: 799, priceAnnual: 639, icon: Zap,
    features: ['Unlimited invoices', '1000 products', '3 users', 'Advanced analytics', 'WhatsApp bot', 'GST reports', 'Loyalty program'],
    popular: true,
  },
  {
    id: 'pro', name: 'Pro', price: 1499, priceAnnual: 1199, icon: Crown,
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
      showToast('Settings saved!', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      showToast('Failed to save settings.', 'error');
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
    <div className="space-y-6 max-w-4xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">{t('settings')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">सेटिंग्स</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id as any)}
            className={cn('px-1 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              tab === tb.id ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-500 hover:text-gray-900')}>
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
            <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded-md flex items-center justify-center text-gray-600 text-xl font-semibold">
              {(form.businessName || 'S').charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{form.businessName || 'Your Business'}</h3>
              <button className="flex items-center gap-1 mt-1 text-xs text-gray-500 hover:text-gray-900">
                <Upload size={12} /> Upload Logo
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 pb-6 border-b border-gray-200">
            {[
              { label: 'Business Name', key: 'businessName', placeholder: 'Sharma General Store' },
              { label: 'Owner Name', key: 'ownerName', placeholder: 'Rajesh Sharma' },
              { label: 'Phone Number', key: 'phoneNumber', placeholder: '+91 98765 43210' },
              { label: 'WhatsApp Number', key: 'whatsappNumber', placeholder: '+91 98765 43210' },
              { label: 'Email', key: 'email', placeholder: 'shop@example.com' },
              { label: 'GSTIN', key: 'gstin', placeholder: '08ABCDE1234F1Z5' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-300 text-sm outline-none focus:border-brand-purple bg-white" />
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 pb-6 border-b border-gray-200">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Address</label>
              <input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Shop No. 1, Main Market"
                  className="w-full px-3 py-1.5 rounded-md border border-gray-300 text-sm outline-none focus:border-brand-purple bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <input value={form.city} onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Jaipur"
                  className="w-full px-3 py-1.5 rounded-md border border-gray-300 text-sm outline-none focus:border-brand-purple bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Pincode</label>
              <input value={form.pincode} onChange={e => setForm(prev => ({ ...prev, pincode: e.target.value }))}
                  placeholder="302001"
                  className="w-full px-3 py-1.5 rounded-md border border-gray-300 text-sm outline-none focus:border-brand-purple bg-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">State</label>
              <select value={form.state} onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-md border border-gray-300 text-sm outline-none focus:border-brand-purple bg-white">
                {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Business Type</label>
              <select value={form.businessType} onChange={e => setForm(prev => ({ ...prev, businessType: e.target.value as typeof prev.businessType }))}
                className="w-full px-3 py-1.5 rounded-md border border-gray-300 text-sm outline-none focus:border-brand-purple bg-white">
                <option value="kirana">Kirana Store</option><option value="grocery">Grocery</option>
                <option value="pharmacy">Pharmacy</option><option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option><option value="restaurant">Restaurant</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div>
            <button onClick={handleSaveProfile} disabled={saving}
              className={cn('px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition-colors', saving && 'opacity-50')}>
              {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}

      {tab === 'subscription' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200">
            <div>
              <div className="text-sm text-gray-500">Current Plan</div>
              <div className="text-xl font-semibold text-gray-900 capitalize">{tenant?.subscriptionPlan || 'Free'} Plan</div>
              <div className="text-xs text-gray-500 mt-0.5">Renewal: 10/07/2026</div>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-md mt-2 md:mt-0">Active</span>
          </div>

          <div className="flex items-center gap-3">
            <span className={cn('text-sm font-medium', !annual ? 'text-gray-900' : 'text-gray-500')}>Monthly</span>
            <button onClick={() => setAnnual(!annual)}
              className={cn('w-10 h-5 rounded-full transition-all relative border border-gray-300', annual ? 'bg-gray-900' : 'bg-gray-100')}>
              <div className={cn('absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all', annual ? 'right-0.5' : 'left-0.5')} />
            </button>
            <span className={cn('text-sm font-medium', annual ? 'text-gray-900' : 'text-gray-500')}>
              Annual <span className="text-gray-500 text-xs ml-1">(Save 20%)</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className={cn('border rounded-md p-4 bg-white relative', plan.popular ? 'border-gray-900 shadow-sm' : 'border-gray-200')}>
                {plan.popular && (
                  <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-gray-900 text-white text-[10px] font-bold rounded-sm uppercase">
                    Popular
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 mt-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-4">
                  <span className="text-xl font-bold text-gray-900">
                    {formatINR(annual ? plan.priceAnnual : plan.price)}
                  </span>
                  <span className="text-sm text-gray-500">/mo</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-gray-400 mt-0.5 flex-shrink-0" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button className={cn('w-full py-2 rounded-md text-sm font-medium transition-colors border',
                  plan.popular ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800' : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50')}>
                  {plan.popular ? 'Upgrade' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="text-center py-12 border border-gray-200 rounded-md bg-white">
          <h3 className="font-semibold text-gray-900 mb-2">Team Management</h3>
          <p className="text-sm text-gray-500">Upgrade to Growth plan to add team members.</p>
        </div>
      )}

      {tab === 'whatsapp' && (
        <div className="space-y-4 max-w-lg">
          <div className="pb-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">WhatsApp Configuration</h3>
            <p className="text-xs text-gray-500 mt-0.5">Configure auto-notifications for invoices & reminders</p>
          </div>
          
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div><div className="text-sm font-medium text-gray-900">Invoice Notifications</div><div className="text-xs text-gray-500">Auto-send invoice on creation</div></div>
            <div className="w-9 h-5 rounded-full bg-gray-900 relative"><div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" /></div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div><div className="text-sm font-medium text-gray-900">Payment Reminders</div><div className="text-xs text-gray-500">Send before due date</div></div>
            <div className="w-9 h-5 rounded-full bg-gray-900 relative"><div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white" /></div>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div><div className="text-sm font-medium text-gray-900">Daily Summary Report</div><div className="text-xs text-gray-500">Send sales summary at 9 PM</div></div>
            <div className="w-9 h-5 rounded-full bg-gray-200 relative border border-gray-300"><div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm" /></div>
          </div>
        </div>
      )}

      {tab === 'preferences' && (
        <div className="space-y-6 max-w-lg">
          <div className="pb-4 border-b border-gray-200">
             <h3 className="font-semibold text-gray-900">App Preferences</h3>
          </div>
          
          <div className="pb-4 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-2">Language / भाषा</label>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  localStorage.setItem('lang', 'en');
                  if (setLanguage) setLanguage('en');
                  else window.location.reload();
                }}
                className={cn("px-3 py-1.5 rounded-md border text-sm font-medium", language === 'en' ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50")}
              >
                English
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('lang', 'hi');
                  if (setLanguage) setLanguage('hi');
                  else window.location.reload();
                }}
                className={cn("px-3 py-1.5 rounded-md border text-sm font-medium", language === 'hi' ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50")}
              >
                हिंदी (Hindi)
              </button>
            </div>
          </div>

          <div className="pb-4 border-b border-gray-100">
            <label className="block text-sm font-medium text-gray-900 mb-2">Theme</label>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  document.body.classList.remove('dark');
                  localStorage.setItem('theme', 'light');
                }}
                className="px-3 py-1.5 rounded-md border border-gray-900 bg-gray-900 text-white text-sm font-medium"
              >
                Light Mode
              </button>
              <button 
                onClick={() => {
                  document.body.classList.add('dark');
                  localStorage.setItem('theme', 'dark');
                }}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Dark Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {canInstall && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-gray-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {language === 'hi' ? 'ShoppIQ App Install Karo' : 'Install App'}
                </h3>
                <p className="text-xs text-gray-500">
                  {language === 'hi'
                    ? 'Home screen pe add karo — fast access, offline support!'
                    : 'Add to home screen for fast access and offline support.'}
                </p>
              </div>
            </div>
            <button
              onClick={promptInstall}
              className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md flex items-center gap-2 hover:bg-gray-800"
            >
              <Download size={14} /> Install
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
