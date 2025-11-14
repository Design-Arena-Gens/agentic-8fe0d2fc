import { NextResponse } from 'next/server';
import {
  calculateATR,
  calculateConfidence,
  calculateEMA,
  calculateRSI,
  calculateStochastic,
  deriveSentiment
} from '@/lib/indicators';
import type { Candle, MarketResponse } from '@/lib/types';

const DEFAULT_INTERVAL = '30m';
const DEFAULT_RANGE = '5d';

const SYMBOL_TITLES: Record<string, string> = {
  AAPL: 'آبل',
  MSFT: 'مايكروسوفت',
  TSLA: 'تسلا',
  NVDA: 'إنفيديا',
  'EURUSD=X': 'اليورو مقابل الدولار',
  'GBPUSD=X': 'الجنيه مقابل الدولار',
  'USDJPY=X': 'الدولار مقابل الين',
  'BTC-USD': 'بيتكوين',
  'ETH-USD': 'إيثيريوم',
  'SOL-USD': 'سولانا',
  'GC=F': 'الذهب',
  'SI=F': 'الفضة',
  'CL=F': 'النفط الخام',
  '^GSPC': 'مؤشر S&P 500',
  '^NDX': 'مؤشر ناسداك 100',
  '^DJI': 'مؤشر داو جونز',
  'TADAWUL.TASI': 'مؤشر السوق السعودي',
  'DFMGI': 'مؤشر سوق دبي المالي'
};

const fetchMarketData = async (symbol: string, interval: string, range: string) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}&events=div%2Csplit`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MarketAI/1.0; +https://agentic.app)',
      Accept: 'application/json'
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`فشل في جلب البيانات (${response.status})`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];

  if (!result) {
    throw new Error('البيانات غير متوفرة حالياً، حاول مرة أخرى لاحقاً');
  }

  const timestamps: number[] = result.timestamp ?? [];
  const quotes = result.indicators?.quote?.[0];

  if (!quotes || timestamps.length === 0) {
    throw new Error('لا توجد بيانات سعرية متاحة لهذا الرمز حالياً');
  }

  const candles: Candle[] = timestamps
    .map((epoch: number, index: number) => ({
      time: epoch,
      open: Number(quotes.open?.[index] ?? 0),
      high: Number(quotes.high?.[index] ?? 0),
      low: Number(quotes.low?.[index] ?? 0),
      close: Number(quotes.close?.[index] ?? 0),
      volume: Number(quotes.volume?.[index] ?? 0)
    }))
    .filter((candle) => Number.isFinite(candle.open) && Number.isFinite(candle.close));

  return { result, candles };
};

const buildResponse = (
  symbol: string,
  interval: string,
  range: string,
  rawCandles: Candle[],
  meta: any
): MarketResponse => {
  const candles = rawCandles.slice(-300);
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2] ?? latest;

  const ema20 = calculateEMA(candles, 20);
  const ema50 = calculateEMA(candles, 50);
  const ema100 = calculateEMA(candles, 100);
  const rsi14 = calculateRSI(candles, 14);
  const { k: stochasticK, d: stochasticD } = calculateStochastic(candles, 14, 3);
  const atr14 = calculateATR(candles, 14);

  const sentiment = deriveSentiment({ ema20, ema50, ema100, rsi14, stochasticK });
  const confidence = calculateConfidence({ ema20, ema50, ema100, rsi14, stochasticK });

  const priceChange = latest.close - previous.close;
  const changePercent = (priceChange / (previous.close || latest.close)) * 100;

  const entryPrice = latest.close;
  const rawTakeProfit =
    sentiment === 'هابط'
      ? entryPrice - atr14 * 2.2
      : entryPrice + atr14 * 2.2;
  const rawStopLoss =
    sentiment === 'هابط'
      ? entryPrice + atr14 * 1.4
      : Math.max(entryPrice - atr14 * 1.4, 0.0001);
  const takeProfit = Math.max(rawTakeProfit, 0.0001);
  const stopLoss = Math.max(rawStopLoss, 0.0001);

  const insightLines = [
    sentiment === 'صاعد'
      ? 'السوق يظهر زخماً إيجابياً مع تحسن في المتوسطات المتحركة القصيرة.'
      : sentiment === 'هابط'
        ? 'السوق تحت ضغط بيعي ويجب التعامل بحذر شديد في هذه المرحلة.'
        : 'السوق يتحرك جانبياً، الانتظار لاختراق واضح قد يكون الخيار الأمثل.',
    rsi14 > 70
      ? 'مؤشر القوة النسبية يشير إلى منطقة تشبع شرائي، احتمال حدوث تصحيح قائم.'
      : rsi14 < 30
        ? 'مؤشر القوة النسبية في منطقة تشبع بيعي، فرص الارتداد مرجحة.'
        : 'مؤشر القوة النسبية في المنطقة المحايدة، مما يدعم صفقات قصيرة المدى.',
    `متوسط المدى الحقيقي (ATR) يبلغ ${atr14} مما يدل على مستوى ${atr14 > entryPrice * 0.02 ? 'مرتفع' : 'منخفض'} للتذبذب.`
  ];

  const sessions =
    sentiment === 'صاعد'
      ? ['بداية الجلسة الرئيسية', 'قبل إغلاق السوق بساعة', 'خلال لحظات الاختراق']
      : ['نهاية الجلسة الأوروبية', 'بداية الأمريكية', 'الفترات ذات السيولة العالية'];

  return {
    symbol,
    displayName: SYMBOL_TITLES[symbol] ?? symbol,
    exchangeName: meta?.exchangeName ?? 'غير محدد',
    currency: meta?.currency ?? 'USD',
    marketState: meta?.marketState ?? 'UNKNOWN',
    price: {
      last: Number(latest.close.toFixed(4)),
      change: Number(priceChange.toFixed(4)),
      changePercent: Number(changePercent.toFixed(2)),
      high: Number(Math.max(...candles.map((c) => c.high)).toFixed(4)),
      low: Number(Math.min(...candles.map((c) => c.low)).toFixed(4)),
      open: Number((candles[0]?.open ?? latest.open).toFixed(4)),
      previousClose: Number(previous.close.toFixed(4))
    },
    candles,
    indicators: {
      ema20,
      ema50,
      ema100,
      rsi14,
      stochasticK,
      stochasticD,
      atr14
    },
    recommendation: {
      sentiment,
      confidence,
      entryPrice: Number(entryPrice.toFixed(4)),
      stopLoss: Number(stopLoss.toFixed(4)),
      takeProfit: Number(takeProfit.toFixed(4)),
      preferredTimeframe:
        sentiment === 'محايد'
          ? 'فريم ساعة لاستغلال الحركات القصيرة'
          : sentiment === 'صاعد'
            ? 'فريم 4 ساعات لتأكيد الاتجاه'
            : 'فريم يومي لتفادي الضوضاء',
      rationale:
        sentiment === 'صاعد'
          ? 'تقاطعات إيجابية بين المتوسطات واستمرار الزخم الصاعد.'
          : sentiment === 'هابط'
            ? 'المتوسطات تتحرك للأسفل ومؤشرات العزم تؤكد تراجع القوة الشرائية.'
            : 'التذبذب المتقارب للمتوسطات وحياد مؤشرات العزم يشير إلى حركة جانبية.',
      bestSessions: sessions
    },
    insights: [
      { label: 'حالة الاتجاه', value: sentiment, tone: sentiment === 'هابط' ? 'negative' : 'positive' },
      {
        label: 'قوة الزخم',
        value: `${confidence}%`,
        tone: confidence > 60 ? 'positive' : confidence < 45 ? 'negative' : undefined
      },
      {
        label: 'توصية الدخول',
        value: `السعر المثالي: ${entryPrice.toFixed(4)} - وقف الخسارة: ${stopLoss.toFixed(
          4
        )} - جني الأرباح: ${takeProfit.toFixed(4)}`
      }
    ],
    riskScore: Number(
      Math.min(
        95,
        Math.max(
          20,
          Math.round(confidence + (entryPrice > 0 ? (atr14 / entryPrice) * 120 : 0) - 10)
        )
      )
    ),
    timeframe: { interval, range },
    lastUpdated: new Date().toLocaleString('ar-EG', {
      hour12: false,
      timeZone: meta?.exchangeTimezoneName ?? 'UTC'
    }),
    meta: {
      timezone: meta?.exchangeTimezoneName ?? 'UTC',
      exchange: meta?.exchangeName ?? 'غير محدد',
      instrumentType: meta?.instrumentType
    }
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') ?? '^GSPC';
  const interval = searchParams.get('interval') ?? DEFAULT_INTERVAL;
  const range = searchParams.get('range') ?? DEFAULT_RANGE;

  try {
    const { result, candles } = await fetchMarketData(symbol, interval, range);
    const payload = buildResponse(symbol, interval, range, candles, result.meta);
    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error?.message ?? 'حدث خلل غير متوقع أثناء جلب البيانات'
      },
      { status: 500 }
    );
  }
}
