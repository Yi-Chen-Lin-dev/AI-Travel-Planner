'use client';

import { useMemo } from 'react';

type Place = {
  poi_id: string; latitude: number; longitude: number;
  name: string; visit_order: number;
};
type Props = { stops: Place[]; selectedIndex?: number };

const WIDTH = 600;
const HEIGHT = 380;
const TILE = 256;

function mercator(lat: number, lon: number, zoom: number) {
  const limited = Math.max(-85, Math.min(85, lat));
  const rad = limited * Math.PI / 180;
  const world = Math.pow(2, zoom) * TILE;
  return {
    x: (lon + 180) / 360 * world,
    y: (0.5 - Math.log((1 + Math.sin(rad)) / (1 - Math.sin(rad))) / (4 * Math.PI)) * world,
  };
}

export default function RouteMap({ stops, selectedIndex = 0 }: Props) {
  const scene = useMemo(() => {
    const valid = stops.filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    if (!valid.length) return null;
    let zoom = 10;
    for (let candidate = 15; candidate >= 7; candidate--) {
      const projected = valid.map((p) => mercator(p.latitude, p.longitude, candidate));
      const x = projected.map((p) => p.x);
      const y = projected.map((p) => p.y);
      if (Math.max(...x) - Math.min(...x) <= WIDTH - 120 &&
          Math.max(...y) - Math.min(...y) <= HEIGHT - 110) {
        zoom = candidate;
        break;
      }
    }
    const worldPoints = valid.map((p) => mercator(p.latitude, p.longitude, zoom));
    const centerX = (Math.min(...worldPoints.map((p) => p.x)) + Math.max(...worldPoints.map((p) => p.x))) / 2;
    const centerY = (Math.min(...worldPoints.map((p) => p.y)) + Math.max(...worldPoints.map((p) => p.y))) / 2;
    const topLeftX = centerX - WIDTH / 2;
    const topLeftY = centerY - HEIGHT / 2;
    const tiles = [];
    const bound = Math.pow(2, zoom);
    for (let y = Math.floor(topLeftY / TILE); y <= Math.floor((topLeftY + HEIGHT) / TILE); y++) {
      for (let x = Math.floor(topLeftX / TILE); x <= Math.floor((topLeftX + WIDTH) / TILE); x++) {
        if (x < 0 || y < 0 || x >= bound || y >= bound) continue;
        tiles.push({
          key: String(zoom) + '/' + x + '/' + y,
          url: 'https://tile.openstreetmap.org/' + zoom + '/' + x + '/' + y + '.png',
          x: x * TILE - topLeftX,
          y: y * TILE - topLeftY,
        });
      }
    }
    const points = stops.map((p) => {
      const projected = mercator(p.latitude, p.longitude, zoom);
      return { ...p, x: projected.x - topLeftX, y: projected.y - topLeftY };
    });
    return { tiles, points };
  }, [stops]);

  if (!scene) {
    return <div className="flex h-[350px] items-center justify-center bg-stone-100">No map coordinates</div>;
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-stone-300 bg-stone-100">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" role="img"
        aria-label="Geographic POI positions and numbered visit order; dashed connections are not travel routes"
        className="block w-full">
        <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="#e8ebdd"/>
        {scene.tiles.map((tile) => (
          <image key={tile.key} href={tile.url} x={tile.x} y={tile.y} width={TILE} height={TILE} />
        ))}
        {scene.points.length > 1 && (
          <polyline
            points={scene.points.map((p) => String(p.x) + ',' + String(p.y)).join(' ')}
            fill="none" stroke="#245E51" strokeWidth="4" strokeDasharray="7 6"
            strokeLinecap="round" strokeLinejoin="round" opacity="0.85"
          />
        )}
        {scene.points.map((p, i) => (
          <g key={p.poi_id}>
            <title>{String(p.visit_order) + '. ' + p.name}</title>
            <circle cx={p.x} cy={p.y} r={selectedIndex === i ? 18 : 15}
              fill={selectedIndex === i ? '#183d36' : '#245E51'} stroke="white" strokeWidth="3"/>
            <text x={p.x} y={p.y + 5} fontSize="14" textAnchor="middle" fontWeight="700" fill="white">
              {p.visit_order}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="px-3 py-2 text-xs text-stone-700">
        POI positions on OpenStreetMap tiles · Numbered order · Dashed lines indicate sequence only,
        <strong> not navigable routes</strong> · ©{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
          className="underline">OpenStreetMap contributors</a>
      </figcaption>
    </figure>
  );
}
