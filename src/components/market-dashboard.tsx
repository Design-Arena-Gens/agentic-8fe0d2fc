'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { MarketChart } from './market-chart';
import type { MarketResponse } from '@/lib/types';

const fetcher = async (url: string): Promise<MarketResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? 'تعذر تحميل البيانات من الخادم');
  }
  return response.json();
};

const MARKET_GROUPS = [
  {
    id: 'indices',
    label: 'المؤشرات العالمية',
    symbols: [
      { symbol: '^GSPC', label: 'S&P 500' },
      { symbol: '^NDX', label: 'ناسداك 100' },
      { symbol: '^DJI', label: 'داو جونز' },
      { symbol: 'TADAWUL.TASI', label: 'تاسي' },
      { symbol: 'DFMGI', label: 'سوق دبي' }
    ]
  },
  {
    id: 'stocks',
    label: 'أسهم التكنولوجيا',
    symbols: [
      { symbol: 'AAPL', label: 'Apple' },
      { symbol: 'MSFT', label: 'Microsoft' },
      { symbol: 'TSLA', label: 'Tesla' },
      { symbol: 'NVDA', label: 'NVIDIA' }
    ]
  },
  {
    id: 'forex',
    label: 'سوق الفوركس',
    symbols: [
      { symbol: 'EURUSD=X', label: 'EUR/USD' },
      { symbol: 'GBPUSD=X', label: 'GBP/USD' },
      { symbol: 'USDJPY=X', label: 'USD/JPY' }
    ]
  },
  {
    id: 'crypto',
    label: 'العملات الرقمية',
    symbols: [
      { symbol: 'BTC-USD', label: 'Bitcoin' },
      { symbol: 'ETH-USD', label: 'Ethereum' },
      { symbol: 'SOL-USD', label: 'Solana' }
    ]
  },
  {
    id: 'commodities',
    label: 'السلع',
    symbols: [
      { symbol: 'GC=F', label: 'Gold' },
      { symbol: 'SI=F', label: 'Silver' },
      { symbol: 'CL=F', label: 'WTI Oil' }
    ]
  }
];

const TIMEFRAMES = [
  { id: '1d', label: 'يومي', interval: '5m', range: '1d' },
  { id: '5d', label: '5 أيام', interval: '30m', range: '5d' },
  { id: '1mo', label: 'شهر', interval: '90m', range: '1mo' },
  { id: '6mo', label: '6 أشهر', interval: '1d', range: '6mo' },
  { id: '1y', label: 'سنة', interval: '1d', range: '1y' }
];

const formatNumber = (value: number) =>
  new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 4 }).format(value);

export const MarketDashboard = () => {
  const [groupId, setGroupId] = useState(MARKET_GROUPS[0].id);
  const [symbol, setSymbol] = useState(MARKET_GROUPS[0].symbols[0].symbol);
  const [timeframeId, setTimeframeId] = useState(TIMEFRAMES[1].id);

  const activeGroup = useMemo(
    () => MARKET_GROUPS.find((group) => group.id === groupId) ?? MARKET_GROUPS[0],
    [groupId]
  );

  const activeTimeframe = useMemo(
    () => TIMEFRAMES.find((frame) => frame.id === timeframeId) ?? TIMEFRAMES[1],
    [timeframeId]
  );

  useEffect(() => {
    if (!activeGroup.symbols.some((item) => item.symbol === symbol)) {
      setSymbol(activeGroup.symbols[0].symbol);
    }
  }, [activeGroup, symbol]);

  const query = useMemo(
    () =>
      `/api/market?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(
        activeTimeframe.interval
      )}&range=${encodeURIComponent(activeTimeframe.range)}`,
    [symbol, activeTimeframe]
  );

  const { data, isLoading, error, mutate } = useSWR(query, fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true
  });

  return (
    <div className="app-shell">
      <header className="header">
        <div className="tagline">ذكاء اصطناعي • بيانات مباشرة • استراتيجيات دقيقة</div>
        <h1 className="header-title">منصة التحليل الذكي للأسواق العالمية</h1>
        <p className="header-subtitle">
          تحليل لحظي لأسواق الأسهم، الفوركس، السلع والعملات الرقمية مع توصيات آلية للدخول والخروج.
        </p>
      </header>

      <main className="content">
        <section className="toolbar">
          <div className="market-tabs">
            {MARKET_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`market-tab ${group.id === groupId ? 'active' : ''}`}
                onClick={() => setGroupId(group.id)}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className="symbol-scroller">
            {activeGroup.symbols.map((item) => (
              <button
                key={item.symbol}
                type="button"
                className={`symbol-chip ${item.symbol === symbol ? 'active' : ''}`}
                onClick={() => setSymbol(item.symbol)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="chart-card">
          <div className="chart-panel">
            <div className="chart-header">
              <div className="chart-title">
                {data?.displayName ?? symbol}{' '}
                <span style={{ color: 'rgba(226, 232, 240, 0.7)', fontSize: '0.85rem' }}>
                  • {formatNumber(data?.price.last ?? 0)} {data?.currency ?? ''}
                </span>
              </div>

              <div className="interval-select">
                {TIMEFRAMES.map((frame) => (
                  <button
                    key={frame.id}
                    type="button"
                    className={`interval-button ${frame.id === timeframeId ? 'active' : ''}`}
                    onClick={() => setTimeframeId(frame.id)}
                  >
                    {frame.label}
                  </button>
                ))}
              </div>
            </div>

            {isLoading || !data ? (
              <div className="loading-state">{error?.message ?? 'جاري تحميل البيانات...'}</div>
            ) : error ? (
              <div className="error-state">
                {error.message}
                <button
                  type="button"
                  style={{
                    background: 'rgba(34, 211, 238, 0.18)',
                    border: '1px solid rgba(34, 211, 238, 0.35)',
                    color: '#e0f2fe',
                    borderRadius: '10px',
                    padding: '0.4rem 0.9rem',
                    marginRight: '0.75rem'
                  }}
                  onClick={() => mutate()}
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(30, 64, 175, 0.22)',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      border: '1px solid rgba(129, 140, 248, 0.25)'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.75)' }}>
                      آخر سعر
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                      {formatNumber(data.price.last)} {data.currency}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(15, 118, 110, 0.18)',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      border: '1px solid rgba(45, 212, 191, 0.25)'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.75)' }}>
                      التغير اللحظي
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '1.05rem',
                        color: data.price.change >= 0 ? '#22d3ee' : '#f43f5e'
                      }}
                    >
                      {`${data.price.change >= 0 ? '+' : ''}${formatNumber(data.price.change)} (${data.price.changePercent}%)`}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(67, 56, 202, 0.18)',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      border: '1px solid rgba(165, 180, 252, 0.25)'
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.75)' }}>
                      نطاق اليوم
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                      {formatNumber(data.price.low)} ↗ {formatNumber(data.price.high)}
                    </div>
                  </div>
                </div>
                <MarketChart candles={data.candles} symbol={data.displayName} />
              </>
            )}
          </div>

          {data ? (
            <div className="analysis-section">
              <div className="analysis-card">
                <div className="analysis-title">ملخص الذكاء الاصطناعي</div>
                <div className="analysis-grid">
                  <div
                    className={`analysis-item ${
                      data.recommendation.sentiment === 'هابط' ? 'negative' : ''
                    }`}
                  >
                    <div className="analysis-label">التوجه العام</div>
                    <div className="analysis-value">{data.recommendation.sentiment}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">درجة الثقة</div>
                    <div className="analysis-value">{data.recommendation.confidence}%</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">أفضل جلسات الدخول</div>
                    <div className="analysis-value">
                      {data.recommendation.bestSessions.join(' • ')}
                    </div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">الفريم المفضل</div>
                    <div className="analysis-value">{data.recommendation.preferredTimeframe}</div>
                  </div>
                </div>
                <p className="analysis-insight">{data.recommendation.rationale}</p>
                <div className="analysis-grid">
                  <div className="analysis-item">
                    <div className="analysis-label">سعر الدخول المقترح</div>
                    <div className="analysis-value">
                      {formatNumber(data.recommendation.entryPrice)} {data.currency}
                    </div>
                  </div>
                  <div className="analysis-item negative">
                    <div className="analysis-label">وقف الخسارة</div>
                    <div className="analysis-value">
                      {formatNumber(data.recommendation.stopLoss)} {data.currency}
                    </div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">جني الأرباح</div>
                    <div className="analysis-value">
                      {formatNumber(data.recommendation.takeProfit)} {data.currency}
                    </div>
                  </div>
                </div>
              </div>

              <div className="analysis-card">
                <div className="analysis-title">تفاصيل المؤشرات الفنية</div>
                <div className="analysis-grid">
                  <div className="analysis-item">
                    <div className="analysis-label">EMA 20</div>
                    <div className="analysis-value">{formatNumber(data.indicators.ema20)}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">EMA 50</div>
                    <div className="analysis-value">{formatNumber(data.indicators.ema50)}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">EMA 100</div>
                    <div className="analysis-value">{formatNumber(data.indicators.ema100)}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">RSI 14</div>
                    <div className="analysis-value">{data.indicators.rsi14}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">Stochastic K</div>
                    <div className="analysis-value">{data.indicators.stochasticK}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">Stochastic D</div>
                    <div className="analysis-value">{data.indicators.stochasticD}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">ATR 14</div>
                    <div className="analysis-value">{formatNumber(data.indicators.atr14)}</div>
                  </div>
                  <div className="analysis-item">
                    <div className="analysis-label">التقلب (نقاط)</div>
                    <div className="analysis-value">{formatNumber(data.riskScore)}</div>
                  </div>
                </div>
                <div className="analysis-insight">
                  {data.insights.map((item) => (
                    <div key={item.label} style={{ marginBottom: '0.35rem' }}>
                      • {item.label}: {item.value}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: 'rgba(148, 163, 184, 0.7)',
                    fontSize: '0.8rem'
                  }}
                >
                  <span>آخر تحديث: {data.lastUpdated}</span>
                  <span>
                    المصدر: {data.meta.exchange} • {data.currency}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="footer">
        <div>⚠️ التداول ينطوي على مخاطر عالية. التحليلات المقدمة تعليمية وليست توصية مباشرة.</div>
      </footer>
    </div>
  );
};
