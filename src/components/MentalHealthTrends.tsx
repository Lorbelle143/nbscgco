import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export default function MentalHealthTrends() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'monthly' | 'risk' | 'scores' | 'counseling'>('monthly');

  useEffect(() => {
    supabase
      .from('mental_health_assessments')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data: d }) => { setData(d || []); setLoading(false); });
  }, []);

  const trends = useMemo(() => {
    // Monthly trend (last 6 months)
    const monthly: Record<string, { total: number; flagged: number; counseled: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthly[key] = { total: 0, flagged: 0, counseled: 0 };
    }
    data.forEach(a => {
      const key = new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthly[key]) {
        monthly[key].total++;
        if (a.risk_level !== 'doing-well') monthly[key].flagged++;
        if (a.is_counseled) monthly[key].counseled++;
      }
    });

    // Risk distribution
    const riskDist = {
      'Doing Well': data.filter(a => a.risk_level === 'doing-well').length,
      'Need Support': data.filter(a => a.risk_level === 'need-support').length,
      'Immediate Support': data.filter(a => a.risk_level === 'immediate-support').length,
    };

    // Score distribution buckets
    const scoreBuckets: Record<string, number> = { '0-5': 0, '6-10': 0, '11-15': 0, '16-20': 0 };
    data.forEach(a => {
      const s = a.total_score;
      if (s <= 5) scoreBuckets['0-5']++;
      else if (s <= 10) scoreBuckets['6-10']++;
      else if (s <= 15) scoreBuckets['11-15']++;
      else scoreBuckets['16-20']++;
    });

    // Counseling follow-up rate
    const flagged = data.filter(a => a.risk_level !== 'doing-well');
    const counselingRate = {
      total: flagged.length,
      counseled: flagged.filter(a => a.is_counseled).length,
      pending: flagged.filter(a => !a.is_counseled && (!a.counseling_status || a.counseling_status === 'pending')).length,
      scheduled: flagged.filter(a => a.counseling_status === 'scheduled').length,
      inProgress: flagged.filter(a => a.counseling_status === 'in-progress').length,
    };

    return { monthly, riskDist, scoreBuckets, counselingRate };
  }, [data]);

  const BarChart = ({ items, colors }: { items: [string, number][]; colors: string[] }) => {
    const max = Math.max(...items.map(([, v]) => v), 1);
    return (
      <div className="space-y-3">
        {items.map(([label, value], i) => (
          <div key={label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{label}</span>
              <span className="text-gray-500">{value}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${colors[i % colors.length]}`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading trends...</div>;

  const totalAssessments = data.length;
  const avgScore = totalAssessments > 0
    ? (data.reduce((s, a) => s + a.total_score, 0) / totalAssessments).toFixed(1)
    : '0';
  const flaggedPct = totalAssessments > 0
    ? Math.round((data.filter(a => a.risk_level !== 'doing-well').length / totalAssessments) * 100)
    : 0;
  const counseledPct = trends.counselingRate.total > 0
    ? Math.round((trends.counselingRate.counseled / trends.counselingRate.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow border-l-4 border-blue-500">
          <p className="text-3xl font-bold text-gray-800">{totalAssessments}</p>
          <p className="text-sm text-gray-500 mt-1">Total Assessments</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow border-l-4 border-purple-500">
          <p className="text-3xl font-bold text-gray-800">{avgScore}</p>
          <p className="text-sm text-gray-500 mt-1">Average Score</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow border-l-4 border-red-500">
          <p className="text-3xl font-bold text-gray-800">{flaggedPct}%</p>
          <p className="text-sm text-gray-500 mt-1">Flagged Rate</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow border-l-4 border-green-500">
          <p className="text-3xl font-bold text-gray-800">{counseledPct}%</p>
          <p className="text-sm text-gray-500 mt-1">Counseling Rate</p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['monthly', 'risk', 'scores', 'counseling'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === v ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {v === 'monthly' ? '📅 Monthly Trend' : v === 'risk' ? '⚠️ Risk Distribution' : v === 'scores' ? '📊 Score Buckets' : '🧠 Counseling Follow-up'}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        {view === 'monthly' && (
          <>
            <h3 className="font-bold text-gray-800 mb-5">Monthly Assessment Trend (Last 6 Months)</h3>
            <div className="space-y-6">
              {Object.entries(trends.monthly).map(([month, vals]) => {
                const max = Math.max(...Object.values(trends.monthly).map(v => v.total), 1);
                return (
                  <div key={month}>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{month}</p>
                    <div className="space-y-1.5">
                      {[
                        { label: 'Total', value: vals.total, color: 'bg-blue-400', max },
                        { label: 'Flagged', value: vals.flagged, color: 'bg-red-400', max },
                        { label: 'Counseled', value: vals.counseled, color: 'bg-green-400', max },
                      ].map(({ label, value, color, max: m }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-16">{label}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${(value / m) * 100}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600 w-6 text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'risk' && (
          <>
            <h3 className="font-bold text-gray-800 mb-5">Risk Level Distribution</h3>
            <BarChart
              items={Object.entries(trends.riskDist) as [string, number][]}
              colors={['bg-green-400', 'bg-orange-400', 'bg-red-500']}
            />
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              {Object.entries(trends.riskDist).map(([label, count]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-800">{totalAssessments > 0 ? Math.round((count / totalAssessments) * 100) : 0}%</p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'scores' && (
          <>
            <h3 className="font-bold text-gray-800 mb-5">Score Distribution</h3>
            <BarChart
              items={Object.entries(trends.scoreBuckets) as [string, number][]}
              colors={['bg-green-400', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500']}
            />
            <div className="mt-4 text-xs text-gray-400 space-y-1">
              <p>0-5: Low risk (Doing Well)</p>
              <p>6-10: Moderate risk</p>
              <p>11-15: High risk (Need Support)</p>
              <p>16-20: Critical (Immediate Support)</p>
            </div>
          </>
        )}

        {view === 'counseling' && (
          <>
            <h3 className="font-bold text-gray-800 mb-5">Counseling Follow-up Status</h3>
            {trends.counselingRate.total === 0 ? (
              <p className="text-gray-400 text-center py-8">No flagged students yet</p>
            ) : (
              <>
                <BarChart
                  items={[
                    ['Counseled / Completed', trends.counselingRate.counseled],
                    ['In Progress', trends.counselingRate.inProgress],
                    ['Scheduled', trends.counselingRate.scheduled],
                    ['Pending', trends.counselingRate.pending],
                  ]}
                  colors={['bg-green-500', 'bg-blue-400', 'bg-amber-400', 'bg-gray-300']}
                />
                <div className="mt-4 bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-green-600">{trends.counselingRate.counseled}</span> of{' '}
                    <span className="font-bold">{trends.counselingRate.total}</span> flagged students have been counseled
                    ({counseledPct}% follow-up rate)
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
