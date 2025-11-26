import { NewsEvent, NewsImpactLevel } from '../types';
import { getWatchlist } from './storage';

const NEWS_KEY = 'trademind_news_events';

const HOURS_24 = 24 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;

const impactColor: Record<NewsImpactLevel, string> = {
  high: '#f97373',
  medium: '#fb923c',
  low: '#fde047',
};

export const getImpactColor = (impact: NewsImpactLevel) => impactColor[impact];

// Simple mock seed to keep the UI populated.
const seedMockNews = (): NewsEvent[] => {
  const now = new Date();
  const baseDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours()
  );

  const events: Omit<NewsEvent, 'fetched_at' | 'notified'>[] = [
    {
      news_id: 'nfp',
      title: 'US Non-Farm Payrolls',
      description: 'Major US employment data impacting USD and risk assets.',
      timestamp: new Date(baseDate.getTime() + 3 * 60 * 60 * 1000).toISOString(),
      impact_level: 'high',
      affected_assets: ['EURUSD', 'DXY', 'SPX'],
      source: 'ForexFactory',
    },
    {
      news_id: 'ecb-rate',
      title: 'ECB Rate Decision',
      description: 'ECB interest rate and monetary policy statement.',
      timestamp: new Date(baseDate.getTime() + 20 * 60 * 60 * 1000).toISOString(),
      impact_level: 'high',
      affected_assets: ['EURUSD', 'EURJPY'],
      source: 'ECB',
    },
    {
      news_id: 'oil-inv',
      title: 'Crude Oil Inventories',
      description: 'Weekly crude oil stockpiles impacting energy markets.',
      timestamp: new Date(baseDate.getTime() + 10 * 60 * 60 * 1000).toISOString(),
      impact_level: 'medium',
      affected_assets: ['USOIL', 'XOM'],
      source: 'EIA',
    },
    {
      news_id: 'asia-gdp',
      title: 'Asian GDP Print',
      description: 'Quarterly GDP affecting Asian indices and JPY, AUD.',
      timestamp: new Date(baseDate.getTime() + 30 * 60 * 60 * 1000).toISOString(),
      impact_level: 'low',
      affected_assets: ['USDJPY', 'AUDUSD'],
      source: 'Bloomberg',
    },
  ];

  const fetchedAt = new Date().toISOString();
  return events.map((e) => ({ ...e, fetched_at: fetchedAt, notified: false }));
};

const loadAllNews = (): NewsEvent[] => {
  const raw = localStorage.getItem(NEWS_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as NewsEvent[];
    } catch {
      // fall through
    }
  }
  const seeded = seedMockNews();
  localStorage.setItem(NEWS_KEY, JSON.stringify(seeded));
  return seeded;
};

export const saveNews = (events: NewsEvent[]) => {
  localStorage.setItem(NEWS_KEY, JSON.stringify(events));
};

export const getUpcomingNews = (hoursAhead: number = 48): NewsEvent[] => {
  const all = loadAllNews();
  const now = Date.now();
  const horizon = now + Math.min(Math.max(hoursAhead * 60 * 60 * 1000, HOURS_24), HOURS_48);
  return all
    .filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= now && t <= horizon;
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const markNewsNotified = (ids: string[]) => {
  const all = loadAllNews();
  const set = new Set(ids);
  const updated = all.map((e) => (set.has(e.news_id) ? { ...e, notified: true } : e));
  saveNews(updated);
};

export const getNewsRelevantToWatchlist = (): NewsEvent[] => {
  const watchlist = getWatchlist();
  if (!watchlist.length) return [];
  const pairs = watchlist.map((w) => w.pair.toUpperCase());
  const upcoming = getUpcomingNews(48);
  return upcoming.filter((e) =>
    e.affected_assets.some((asset) =>
      pairs.some((p) => asset.toUpperCase().includes(p.replace('/', '').toUpperCase()))
    )
  );
};

// Helper for tagging trades as news-affected based on time & pair.
export const findNewsForTrade = (pair: string, isoTime: string): NewsEvent[] => {
  const allUpcoming = getUpcomingNews(48);
  const tradeTime = new Date(isoTime).getTime();
  const windowMs = 60 * 60 * 1000; // +/- 1h
  const normalizedPair = pair.replace('/', '').toUpperCase();

  return allUpcoming.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    const timeClose = Math.abs(t - tradeTime) <= windowMs;
    const assetMatches = e.affected_assets.some((asset) =>
      asset.toUpperCase().includes(normalizedPair)
    );
    return timeClose && assetMatches;
  });
};



