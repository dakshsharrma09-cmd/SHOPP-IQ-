import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn } from '../lib/formatters';
import { subscribeCustomers } from '../lib/firestoreService';
import type { Customer } from '../types/firestore';
import { Gift, Crown, Star, Trophy } from 'lucide-react';

export default function Loyalty() {
  const { tenantId } = useAuth();
  const { t, language } = useLanguage();

  // Firestore state
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = subscribeCustomers(tenantId, setCustomers);
    return unsub;
  }, [tenantId]);

  const leaderboard = useMemo(() =>
    [...customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 15)
  , [customers]);

  const totalPoints = customers.reduce((s, c) => s + c.loyaltyPoints, 0);
  const memberCount = customers.filter(c => c.loyaltyPoints > 0).length;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown size={18} className="text-yellow-400" />;
    if (rank === 2) return <Trophy size={18} className="text-gray-500" />;
    if (rank === 3) return <Trophy size={18} className="text-amber-600" />;
    return <span className="text-sm text-gray-500 font-mono">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          {t('loyalty')} 
        </h1>
        <p className="text-gray-500 text-sm uppercase">लॉयल्टी कार्यक्रम</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Points', value: totalPoints.toLocaleString('en-IN'), icon: Star, borderColor: 'border-l-amber-500' },
          { label: 'Members', value: String(memberCount), icon: Gift, borderColor: 'border-l-purple-600' },
          { label: 'Avg Points', value: memberCount > 0 ? Math.round(totalPoints / memberCount).toLocaleString('en-IN') : '0', icon: Trophy, borderColor: 'border-l-emerald-500' },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-lg bg-white border border-gray-200 border-l-[3px] ${s.borderColor}`}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center mb-2 bg-gray-50">
              <s.icon size={16} className="text-gray-500" />
            </div>
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Program Rules */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 " >
        <h2 className="font-heading font-semibold text-gray-900 text-gray-900 mb-4">
          {language === 'hi' ? 'Program Niyam' : 'Program Rules'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: language === 'hi' ? 'Kamayen' : 'Earn', desc: '1 point per ₹10 spent', icon: '', bg: 'bg-green-50 ' },
            { title: language === 'hi' ? 'Istemal' : 'Redeem', desc: '1 point = ₹1 discount', icon: '', bg: 'bg-purple-50 ' },
            { title: language === 'hi' ? 'Nyuntam' : 'Minimum', desc: '50 points to redeem', icon: '', bg: 'bg-amber-50 ' },
          ].map(rule => (
            <div key={rule.title} className={cn('p-4 rounded-xl', rule.bg)}>
              <div className="text-2xl mb-2">{rule.icon}</div>
              <div className="font-heading font-semibold text-gray-900 text-gray-900 text-sm">{rule.title}</div>
              <div className="text-xs text-gray-500 mt-1">{rule.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden " >
        <div className="px-6 py-4 border-b border-gray-100 border-gray-200">
          <h2 className="font-heading font-semibold text-gray-900 text-gray-900">
            {language === 'hi' ? 'Leaderboard ' : 'Leaderboard '}
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 bg-gray-50/50">
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 w-16">Rank</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Points</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Tier</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total Spent</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Segment</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((c, i) => {
              const tier = c.loyaltyPoints >= 5000 ? { label: 'Platinum', class: 'bg-purple-100 text-purple-700  ' }
                : c.loyaltyPoints >= 2000 ? { label: 'Gold', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 ' }
                : c.loyaltyPoints >= 500 ? { label: 'Silver', class: 'bg-gray-100 text-gray-600  ' }
                : { label: 'Bronze', class: 'bg-orange-100 text-orange-700  ' };
              return (
              <tr key={c.id} className={cn('border-b border-gray-50 border-gray-200 table-row-hover', i < 3 && 'bg-amber-50/50  shadow-[inset_0_0_15px_rgba(245,158,11,0.15)] relative')}>
                <td className="px-4 py-3 text-center">{getRankBadge(i + 1)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-purple-400 flex items-center justify-center text-gray-900 text-xs font-bold">
                      {c.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-gray-900">{c.fullName}</div>
                      <div className="text-xs text-gray-500">{c.phoneNumber}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-brand-gold font-bold font-heading"> {c.loyaltyPoints}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('text-[10px] px-2 py-1 rounded-full font-semibold', tier.class)}>
                    {tier.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 text-gray-900">{formatINR(c.totalLifetimeValue)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium',
                    c.customerSegment === 'vip' ? 'badge-purple' :
                    c.customerSegment === 'regular' ? 'badge-blue' :
                    c.customerSegment === 'at_risk' ? 'badge-red' : 'badge-green')}>
                    {c.customerSegment.replace('_', ' ')}
                  </span>
                </td>
              </tr>
              );
            })}
            {leaderboard.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No loyalty members yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className='made-in-india mt-8 text-center text-sm text-gray-500 font-medium py-4'>Made with ❤️ in Jabalpur, India 🇮🇳</div>
    </div>
  );
}
