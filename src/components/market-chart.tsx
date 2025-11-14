/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  type IChartApi,
  type CandlestickData,
  type ISeriesApi,
  type CandlestickSeriesPartialOptions
} from 'lightweight-charts';
import type { Candle } from '@/lib/types';

type MarketChartProps = {
  candles: Candle[];
  symbol: string;
};

const formatCandles = (candles: Candle[]): CandlestickData[] =>
  candles.map((candle) => ({
    time: Math.floor(candle.time) as CandlestickData['time'],
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close)
  }));

export const MarketChart = ({ candles, symbol }: MarketChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      autoSize: true,
      layout: {
        background: { color: 'rgba(15, 23, 42, 0)' },
        textColor: '#e2e8f0'
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.1)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.1)' }
      },
      rightPriceScale: {
        visible: true,
        borderColor: 'rgba(148, 163, 184, 0.2)'
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.2)',
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        mode: 0
      }
    });

    const seriesOptions: CandlestickSeriesPartialOptions = {
      upColor: '#22d3ee',
      borderUpColor: '#22d3ee',
      wickUpColor: '#22d3ee',
      downColor: '#f43f5e',
      borderDownColor: '#f43f5e',
      wickDownColor: '#f43f5e'
    };

    const series = chart.addCandlestickSeries(seriesOptions);

    series.setData(formatCandles(candles));
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current?.clientWidth ?? 0 });
      chart.timeScale().fitContent();
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;
    seriesRef.current.setData(formatCandles(candles));
    chartRef.current.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={containerRef}
      aria-label={`الرسم البياني للشموع لـ ${symbol}`}
      style={{ width: '100%', height: '360px' }}
    />
  );
};
