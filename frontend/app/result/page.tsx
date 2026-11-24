'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RouteMap from '../../components/RouteMap';

type Stop = {
  poi_id: string; name: string; visit_order: number;
  start_time: string; end_time: string;
  latitude: number; longitude: number;
  category?: string | null;
  recommendation_reason?: string | null;
  travel_time_from_previous_minutes?: number | null;
};
type Day = { day: number; date: string; items: Stop[] };
type Itinerary = {
  itinerary_id: string; destination?: string; status: string;
  days: Day[]; warnings?: string[];
  unscheduled_pois?: { poi_id: string; name: string; reason: string }[];
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function routeLink(stops: Stop[]): string | null {
  if (!stops.length) return null;
  const point = (s: Stop) => String(s.latitude) + ',' + String(s.longitude);
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  if (stops.length > 1) {
    url.searchParams.set('origin', point(stops[0]));
    url.searchParams.set('destination', point(stops[stops.length - 1]));
    if (stops.length > 2) {
      url.searchParams.set('waypoints', stops.slice(1, -1).map(point).join('|'));
    }
  } else {
    url.searchParams.set('destination', point(stops[0]));
  }
  url.searchParams.set('travelmode', 'walking');
  return url.toString();
}

export default function GeneratedTripResult() {
  const [tripId, setTripId] = useState('');
  const [result, setResult] = useState<Itinerary | null>(null);
  const [state, setState] = useState<'loading' | 'empty' | 'ready' | 'error' | 'generating'>('loading');
  const [error, setError] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [stopIndex, setStopIndex] = useState(0);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('trip_id');
    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      setError('Missing or invalid trip_id. Create a trip first.');
      setState('error');
      return;
    }
    setTripId(id);
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(API + '/itineraries/' + encodeURIComponent(id), { cache: 'no-store' });
        if (cancelled) return;
        if (response.status === 404) {
          setState('empty');
          return;
        }
        const json = await response.json();
        if (!response.ok) throw new Error(String(json.detail || 'Backend error ' + response.status));
        setResult(json as Itinerary);
        setState('ready');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load itinerary');
          setState('error');
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function generate() {
    if (!tripId) return;
    setState('generating');
    setError('');
    let dailyStart = '09:00';
    let dailyEnd = '18:00';
    try {
      const cached = localStorage.getItem('trip_preferences');
      if (cached) {
        const p = JSON.parse(cached);
        if (p.trip_id === tripId) {
          if (typeof p.daily_start_time === 'string') dailyStart = p.daily_start_time;
          if (typeof p.daily_end_time === 'string') dailyEnd = p.daily_end_time;
        }
      }
    } catch {
      // Fall back to documented preview times.
    }
    try {
      const response = await fetch(API + '/itineraries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: tripId, allow_estimated_travel: true,
          daily_start_time: dailyStart, daily_end_time: dailyEnd,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(String(json.detail || 'Backend error ' + response.status));
      setResult(json as Itinerary);
      setDayIndex(0);
      setStopIndex(0);
      setState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setState('error');
    }
  }

  const day = result?.days[dayIndex];
  const stops = useMemo(() => day?.items || [], [day]);

  return (
    <main className="min-h-screen bg-[#F4F1EA] p-6 text-[#23272F]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AI Travel Planner — Local Preview</h1>
            <p className="mt-1 text-sm text-stone-600">Real database POIs, rule-based ranking and estimated travel</p>
          </div>
          <Link href="/" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm">New trip</Link>
        </header>

        {state === 'loading' && <p role="status">Loading saved itinerary…</p>}
        {state === 'generating' && <p role="status">Generating itinerary and saving to PostgreSQL…</p>}
        {state === 'empty' && (
          <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Generate your trip</h2>
            <p className="my-4 text-sm leading-7">
              This uses real POI records in PostgreSQL, the preliminary recommendation rules and the
              existing Optimizer. Travel time is based on scaled straight-line distance, NOT real road,
              traffic, walking or public-transport routing. Opening hours may be outdated.
            </p>
            <button type="button" onClick={generate} className="rounded-lg bg-[#245E51] px-5 py-3 font-medium text-white">
              I understand — generate estimated itinerary
            </button>
          </section>
        )}
        {state === 'error' && (
          <section role="alert" className="max-w-2xl rounded-xl border border-red-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Cannot generate or reopen itinerary</h2>
            <p className="my-3 whitespace-pre-wrap text-sm text-red-800">{error}</p>
            <p className="my-3 text-sm">Check the local preview flags, PostgreSQL connection, available destination POIs and their opening hours.</p>
            <button type="button" onClick={generate} className="rounded-lg bg-[#245E51] px-5 py-2 text-white">Retry</button>
          </section>
        )}
        {state === 'ready' && result && (
          <>
            <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
              <strong>Unverified preview.</strong> Travel durations are rough estimates, not mapped routes.
              Visit times rely on historical POI data. Please verify before traveling.
            </div>
            <h2 className="mb-4 text-xl font-semibold">{result.destination || 'Travel'} itinerary</h2>
            <div className="mb-5 flex flex-wrap gap-2">
              {result.days.map((d, i) => (
                <button type="button" key={d.day}
                  className={dayIndex === i ? 'rounded-lg bg-[#245E51] px-4 py-2 text-white' : 'rounded-lg bg-white px-4 py-2'}
                  onClick={() => { setDayIndex(i); setStopIndex(0); }}>
                  Day {d.day} — {d.date}
                </button>
              ))}
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <section aria-label="Ordered itinerary" className="space-y-3">
                {!stops.length && <p className="rounded-xl bg-white p-5">No feasible stops on this date.</p>}
                {stops.map((stop, i) => (
                  <button type="button" key={stop.poi_id}
                    onClick={() => setStopIndex(i)}
                    className={stopIndex === i
                      ? 'block w-full rounded-xl border-2 border-[#245E51] bg-white p-4 text-left'
                      : 'block w-full rounded-xl border border-stone-200 bg-white p-4 text-left'}>
                    <p className="text-xs font-bold text-[#245E51]">Stop {stop.visit_order}</p>
                    <h3 className="mt-1 text-lg font-semibold">{stop.name}</h3>
                    <p className="text-sm text-stone-600">{stop.start_time}–{stop.end_time}</p>
                    {i > 0 && stop.travel_time_from_previous_minutes != null && (
                      <p className="text-sm text-stone-600">Estimated travel: {stop.travel_time_from_previous_minutes} min</p>
                    )}
                    <p className="mt-2 text-sm text-stone-600">{stop.recommendation_reason || ''}</p>
                  </button>
                ))}
              </section>
              <section className="rounded-xl bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold">POI map — numbered stop order</h3>
                <p className="mb-3 text-sm">The map shows actual POI coordinates. Dashed lines only connect visit order, not travel routes.</p>
                <RouteMap stops={stops} selectedIndex={stopIndex} />
                {routeLink(stops) && (
                  <a href={routeLink(stops) || '#'} target="_blank" rel="noreferrer"
                    className="mt-4 inline-block rounded-lg bg-[#245E51] px-4 py-2 text-sm font-medium text-white">
                    Open ordered stops in Google Maps
                  </a>
                )}
                <p className="mt-2 text-xs text-stone-500">Google Maps calculates actual directions separately from this preview.</p>
              </section>
            </div>
            {!!result.unscheduled_pois?.length && (
              <section className="mt-5 rounded-xl bg-white p-5">
                <h3 className="font-semibold">Unscheduled places</h3>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {result.unscheduled_pois.map(poi => (
                    <li key={poi.poi_id}>{poi.name} — {poi.reason}</li>
                  ))}
                </ul>
              </section>
            )}
            {!!result.warnings?.length && (
              <section className="mt-5 rounded-xl bg-white p-5">
                <h3 className="font-semibold">Limitations</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
