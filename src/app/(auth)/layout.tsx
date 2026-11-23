import type { ReactNode } from 'react';

function WaveMeshBackground() {
  const lines = Array.from({ length: 24 }, (_, idx) => {
    const t = idx / 23;
    const yShift = (t - 0.5) * 190;
    const amp1 = 150 - t * 65;
    const amp2 = 135 - Math.abs(t - 0.5) * 140;
    const opacity = (0.09 + (1 - Math.abs(t - 0.5) * 1.7) * 0.24).toFixed(3);
    return {
      key: idx,
      opacity,
      d: `M -120 ${410 + yShift * 0.7} C 160 ${240 - amp1 + yShift}, 340 ${590 + amp2 + yShift * 0.4}, 640 ${400 + yShift * 0.35} C 820 ${290 - amp2 + yShift * 0.5}, 920 ${130 + yShift * 0.8}, 1050 ${410 + yShift * 0.4} C 1180 ${640 - yShift * 0.6}, 1360 ${250 + amp1 * 0.6}, 1620 ${405 + yShift * 0.5}`,
    };
  });

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Subtle Sea Green ambient radial glows */}
      <div className="absolute top-1/2 left-[24%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2E8B57]/12 blur-[140px]" />
      <div className="absolute top-1/2 right-[8%] h-[360px] w-[360px] -translate-y-1/2 rounded-full bg-[#4CAF7D]/10 blur-[130px]" />

      {/* Flowing Sea Green Mesh Wave */}
      <svg
        viewBox="0 0 1500 800"
        preserveAspectRatio="none"
        className="h-full w-full opacity-95"
      >
        <defs>
          <linearGradient id="bistech-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1F5C3A" stopOpacity="0.55" />
            <stop offset="32%" stopColor="#4CAF7D" stopOpacity="0.9" />
            <stop offset="56%" stopColor="#6EE7B7" stopOpacity="0.95" />
            <stop offset="80%" stopColor="#2E8B57" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#4CAF7D" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#bistech-wave-grad)" strokeWidth="1.15">
          {lines.map((line) => (
            <path key={line.key} d={line.d} opacity={line.opacity} />
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080C0A] px-6 py-10 text-[#F0F5F2] md:px-12">
      <WaveMeshBackground />

      <main className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-12 lg:gap-8">
        {/* Left Brand Showcase */}
        <section className="flex flex-col items-center justify-center text-center lg:col-span-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bistech-logo.png"
            alt="BisTech Logo"
            className="h-28 w-28 object-contain drop-shadow-[0_14px_34px_rgba(76,175,125,0.35)] sm:h-32 sm:w-32"
          />

          <h1 className="mt-7 font-heading text-4xl font-bold tracking-[-0.03em] text-[#F0F5F2] sm:text-5xl">
            Build. Grow.{' '}
            <span className="text-[#4CAF7D]">Scale.</span>
          </h1>
        </section>

        {/* Right Sign-In Card */}
        <section className="flex justify-center lg:col-span-6 lg:justify-end">
          <div className="w-full max-w-[440px] rounded-[2rem] border border-[#23302B]/90 bg-[#131A17]/92 p-7 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.85)] backdrop-blur-md sm:p-9">
            <h2 className="mb-6 font-heading text-2xl font-medium tracking-[-0.02em] text-[#D8E5DF]">
              Sign in to your account
            </h2>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
