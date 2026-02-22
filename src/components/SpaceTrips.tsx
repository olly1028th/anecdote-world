import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Trip } from '../types/trip';

/* ── Vivid planet palettes (completed trips) ── */
const PLANET_PALETTES = [
  { core: '#7EC8E3', mid: '#3A8FBF', edge: '#1B5E8A', glow: 'rgba(126,200,227,0.35)' },
  { core: '#82E0AA', mid: '#2ECC71', edge: '#1A9F56', glow: 'rgba(130,224,170,0.35)' },
  { core: '#BB8FCE', mid: '#8E44AD', edge: '#6C3483', glow: 'rgba(187,143,206,0.35)' },
  { core: '#F5B041', mid: '#E67E22', edge: '#CA6F1E', glow: 'rgba(245,176,65,0.35)' },
  { core: '#85C1E9', mid: '#2E86C1', edge: '#1A5276', glow: 'rgba(133,193,233,0.35)' },
  { core: '#F1948A', mid: '#E74C3C', edge: '#B03A2E', glow: 'rgba(241,148,138,0.35)' },
  { core: '#73C6B6', mid: '#1ABC9C', edge: '#148F77', glow: 'rgba(115,198,182,0.35)' },
];

/* ── Foggy palette (planned / unvisited trips) ── */
const FOGGY = {
  core: '#8D9EAA',
  mid: '#5D6D7E',
  edge: '#34495E',
  glow: 'rgba(93,109,126,0.12)',
};

/* Deterministic pseudo-random for stable star positions */
function stableStars(count: number) {
  let s = 42;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: next() * 100,
    y: next() * 100,
    size: next() * 1.8 + 0.4,
    delay: next() * 5,
    duration: 1.5 + next() * 2.5,
  }));
}

interface Props {
  trips: Trip[];
}

export default function SpaceTrips({ trips }: Props) {
  const stars = useMemo(() => stableStars(100), []);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const orbits = useMemo(() => {
    if (trips.length === 0) return [];
    const n = trips.length;
    const minR = 20;
    const maxR = 85;
    const step = n > 1 ? (maxR - minR) / (n - 1) : 0;

    return trips.map((trip, i) => {
      const rPct = n === 1 ? 42 : minR + step * i;
      const duration = 30 + i * 12;
      const startAngle = (i * 137.508) % 360; // golden angle
      const palette =
        trip.status === 'completed'
          ? PLANET_PALETTES[i % PLANET_PALETTES.length]
          : FOGGY;
      const size = Math.max(36, 50 - i * 2);
      return { trip, rPct, duration, startAngle, palette, size };
    });
  }, [trips]);

  return (
    <section
      className="relative rounded-3xl overflow-hidden"
      style={{ background: '#050505' }}
    >
      {/* ── Twinkling stars ── */}
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animation: `space-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* ── Section title ── */}
      <div className="relative z-30 pt-6 px-6">
        <h2 className="text-lg font-bold text-white/90">My Universe</h2>
        <p className="text-xs text-white/40 mt-1">
          나의 여행 행성들이 궤도를 돌고 있어요
        </p>
      </div>

      {/* ── Orbit area (1:1 aspect) ── */}
      <div className="relative w-full" style={{ paddingBottom: '100%' }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Central sun */}
          <div
            className="absolute w-5 h-5 rounded-full z-10 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 35% 35%, #FFF8E1, #FFD54F, #FF9800)',
              boxShadow:
                '0 0 16px 5px rgba(255,213,79,0.3), 0 0 32px 10px rgba(255,152,0,0.15)',
            }}
          />

          {/* Orbit rings + rotating planets */}
          {orbits.map(({ trip, rPct, duration, startAngle, palette, size }) => {
            const isCompleted = trip.status === 'completed';
            const isHovered = hoveredId === trip.id;
            const delayS = -(startAngle / 360) * duration;

            return (
              <div
                key={trip.id}
                className="absolute inset-0 flex items-center justify-center"
              >
                {/* Static orbit ring */}
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: `${rPct * 2}%`,
                    height: `${rPct * 2}%`,
                    border: `1px solid rgba(255,255,255,${isHovered ? 0.16 : 0.06})`,
                    transition: 'border-color 0.3s',
                  }}
                />

                {/* Rotating wrapper (same size as orbit) */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: `${rPct * 2}%`,
                    height: `${rPct * 2}%`,
                    animation: `space-orbit ${duration}s linear infinite`,
                    animationDelay: `${delayS}s`,
                    willChange: 'transform',
                  }}
                >
                  {/* Planet at right edge, counter-rotating to stay upright */}
                  <Link
                    to={`/trip/${trip.id}`}
                    className="absolute no-underline z-20"
                    style={{
                      top: '50%',
                      right: -(size / 2),
                      width: size,
                      height: size,
                      marginTop: -(size / 2),
                      animation: `space-orbit-reverse ${duration}s linear infinite`,
                      animationDelay: `${delayS}s`,
                      willChange: 'transform',
                    }}
                    onMouseEnter={() => setHoveredId(trip.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Planet sphere */}
                    <div
                      className={`w-full h-full rounded-full transition-transform duration-300 ${
                        isHovered ? 'scale-125' : ''
                      }`}
                      style={{
                        background: `radial-gradient(circle at 32% 28%, ${palette.core}, ${palette.mid} 55%, ${palette.edge})`,
                        boxShadow: isCompleted
                          ? `0 0 ${size * 0.4}px ${palette.glow}, inset -${size * 0.12}px -${size * 0.08}px ${size * 0.22}px rgba(0,0,0,0.35)`
                          : `inset -${size * 0.12}px -${size * 0.08}px ${size * 0.22}px rgba(0,0,0,0.5)`,
                        opacity: isCompleted ? 1 : 0.5,
                        filter: isCompleted ? 'none' : 'blur(0.8px)',
                      }}
                    />

                    {/* Planet label (below) */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap pointer-events-none"
                      style={{ top: size + 4 }}
                    >
                      <span
                        className={`text-[10px] font-semibold ${
                          isCompleted ? 'text-white/70' : 'text-white/35'
                        }`}
                      >
                        {trip.title.length > 8
                          ? trip.title.slice(0, 8) + '…'
                          : trip.title}
                      </span>
                    </div>

                    {/* Hover tooltip (above) */}
                    {isHovered && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 rounded-xl px-3 py-2 pointer-events-none whitespace-nowrap z-50"
                        style={{
                          bottom: size + 8,
                          background: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <p className="text-xs font-bold text-white">
                          {trip.title}
                        </p>
                        {trip.destination && (
                          <p className="text-[10px] text-white/60 mt-0.5">
                            {trip.destination}
                          </p>
                        )}
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {trip.status === 'completed'
                            ? '✦ 방문 완료'
                            : '○ 계획 중'}
                        </p>
                      </div>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add planet button */}
      <div className="relative z-30 pb-6 flex justify-center -mt-4">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new Event('open-trip-modal'))
          }
          className="px-5 py-2.5 rounded-full text-sm font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          + 새 행성 만들기
        </button>
      </div>

      {/* Empty state */}
      {trips.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
          <p className="text-base font-medium text-white/50 mb-1">
            아직 행성이 없어요
          </p>
          <p className="text-xs text-white/30">
            첫 번째 여행 행성을 만들어보세요!
          </p>
        </div>
      )}
    </section>
  );
}
