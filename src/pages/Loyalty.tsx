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
    if (rank === 2) return <Trophy size={18} className="text-gray-400" />;
    if (rank === 3) return <Trophy size={18} className="text-amber-600" />;
    return <span className="text-sm text-gray-400 font-mono">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      `}</style>
      <div className="p-8 rounded-3xl bg-gradient-to-r from-[#3f2b18] via-[#5c3e06] to-[#3f2b18] relative overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10 fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-gold rounded-full blur-[100px] opacity-30"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-heading font-extrabold text-white mb-2 tracking-tight flex items-center gap-3">
            {t('loyalty')} 🎁
          </h1>
          <p className="text-amber-300 text-sm font-medium tracking-widest uppercase">लॉयल्टी कार्यक्रम</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Points', value: totalPoints.toLocaleString('en-IN'), icon: Star, gradient: 'linear-gradient(135deg, #F59E0B, #B45309)' },
          { label: 'Members', value: String(memberCount), icon: Gift, gradient: 'linear-gradient(135deg, #7C3AED, #5B21B6)' },
          { label: 'Avg Points', value: memberCount > 0 ? Math.round(totalPoints / memberCount).toLocaleString('en-IN') : '0', icon: Trophy, gradient: 'linear-gradient(135deg, #10B981, #047857)' },
        ].map((s, i) => (
          <div key={s.label} className="stat-card border-none relative overflow-hidden group fade-in-up" style={{ animationDelay: `${0.2 + i * 0.1}s`, background: s.gradient }}>
            <div className="absolute -right-6 -top-6 text-white/10 transform group-hover:scale-110 transition-transform duration-500">
              <s.icon size={100} />
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-white/20 backdrop-blur-sm border border-white/20 relative z-10">
              <s.icon size={20} className="text-white" />
            </div>
            <div className="text-2xl font-bold font-heading text-white relative z-10 drop-shadow-md">{s.value}</div>
            <div className="text-sm text-white/90 font-medium relative z-10">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Program Rules */}
      <div className="glass-card card-glow p-6 fade-in-up" style={{ animationDelay: '0.6s' }}>
        <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">
          {language === 'hi' ? 'Program Niyam' : 'Program Rules'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: language === 'hi' ? 'Kamayen' : 'Earn', desc: '1 point per ₹10 spent', icon: '💰', bg: 'bg-green-50 dark:bg-green-900/20' },
            { title: language === 'hi' ? 'Istemal' : 'Redeem', desc: '1 point = ₹1 discount', icon: '🎁', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { title: language === 'hi' ? 'Nyuntam' : 'Minimum', desc: '50 points to redeem', icon: '📏', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          ].map(rule => (
            <div key={rule.title} className={cn('p-4 rounded-xl', rule.bg)}>
              <div className="text-2xl mb-2">{rule.icon}</div>
              <div className="font-heading font-semibold text-gray-900 dark:text-white text-sm">{rule.title}</div>
              <div className="text-xs text-gray-500 mt-1">{rule.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-card card-glow overflow-hidden fade-in-up" style={{ animationDelay: '0.7s' }}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-white">
            {language === 'hi' ? 'Leaderboard 🏆' : 'Leaderboard 🏆'}
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
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
              const tier = c.loyaltyPoints >= 5000 ? { label: 'Platinum', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' }
                : c.loyaltyPoints >= 2000 ? { label: 'Gold', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
                : c.loyaltyPoints >= 500 ? { label: 'Silver', class: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
                : { label: 'Bronze', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' };
              return (
              <tr key={c.id} className={cn('border-b border-gray-50 dark:border-gray-800 table-row-hover', i < 3 && 'bg-amber-50/50 dark:bg-amber-900/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.15)] relative')}>
                <td className="px-4 py-3 text-center">{getRankBadge(i + 1)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                      {c.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{c.fullName}</div>
                      <div className="text-xs text-gray-400">{c.phoneNumber}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-brand-gold font-bold font-heading">🎁 {c.loyaltyPoints}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('text-[10px] px-2 py-1 rounded-full font-semibold', tier.class)}>
                    {tier.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatINR(c.totalLifetimeValue)}</td>
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
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No loyalty members yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
