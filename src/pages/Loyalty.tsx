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
      
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">
          {t('loyalty')} 
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">लॉयल्टी कार्यक्रम</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Points', value: totalPoints.toLocaleString('en-IN'), icon: Star, borderColor: 'border-l-amber-500' },
          { label: 'Members', value: String(memberCount), icon: Gift, borderColor: 'border-l-purple-600' },
          { label: 'Avg Points', value: memberCount > 0 ? Math.round(totalPoints / memberCount).toLocaleString('en-IN') : '0', icon: Trophy, borderColor: 'border-l-emerald-500' },
        ].map((s) => (
          <div key={s.label} className="p-3 border border-gray-200 rounded-md">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <s.icon size={16} />
              {s.label}
            </div>
            <div className="text-xl font-semibold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Program Rules */}
      <div className="bg-white border border-gray-200 rounded-md p-3 " >
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          {language === 'hi' ? 'Program Niyam' : 'Program Rules'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: language === 'hi' ? 'Kamayen' : 'Earn', desc: '1 point per ₹10 spent', icon: '', bg: 'bg-green-50 ' },
            { title: language === 'hi' ? 'Istemal' : 'Redeem', desc: '1 point = ₹1 discount', icon: '', bg: 'bg-purple-50 ' },
            { title: language === 'hi' ? 'Nyuntam' : 'Minimum', desc: '50 points to redeem', icon: '', bg: 'bg-amber-50 ' },
          ].map(rule => (
            <div key={rule.title} className={cn('p-4 rounded-md', rule.bg)}>
              <div className="text-2xl mb-2">{rule.icon}</div>
              <div className="font-heading font-semibold text-gray-900 text-gray-900 text-sm">{rule.title}</div>
              <div className="text-xs text-gray-500 mt-1">{rule.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden " >
        <div className="px-6 py-4 border-b border-gray-100 border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            {language === 'hi' ? 'Leaderboard ' : 'Leaderboard '}
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Rank</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Customer</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Points</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Tier</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Total Spent</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Segment</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((c, i) => {
              const tier = c.loyaltyPoints >= 5000 ? { label: 'Platinum', class: 'bg-purple-100 text-purple-700  ' }
                : c.loyaltyPoints >= 2000 ? { label: 'Gold', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 ' }
                : c.loyaltyPoints >= 500 ? { label: 'Silver', class: 'bg-gray-100 text-gray-600  ' }
                : { label: 'Bronze', class: 'bg-orange-100 text-orange-700  ' };
              return (
              <tr key={c.id} className={cn('border-b border-gray-100 hover:bg-gray-50', i < 3 && 'bg-amber-50/50  shadow-[inset_0_0_15px_rgba(245,158,11,0.15)] relative')}>
                <td className="px-3 py-2 text-center">{getRankBadge(i + 1)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full  flex items-center justify-center text-gray-900 text-xs font-bold">
                      {c.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-gray-900">{c.fullName}</div>
                      <div className="text-xs text-gray-500">{c.phoneNumber}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-brand-gold font-bold font-heading"> {c.loyaltyPoints}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={cn('text-[10px] px-2 py-1 rounded-full font-semibold', tier.class)}>
                    {tier.label}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-900 text-gray-900">{formatINR(c.totalLifetimeValue)}</td>
                <td className="px-3 py-2 text-center">
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
      
      <div className='made-in-india mt-8 text-center text-sm text-gray-500 font-medium py-4'>Made with  in Jabalpur, India </div>
    </div>
  );
}
