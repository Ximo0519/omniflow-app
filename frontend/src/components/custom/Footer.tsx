const GENRES = ['JAZZ', 'SYNTHWAVE', 'LO-FI', 'AMBIENT', 'FOLK', 'CITY POP'];

export default function Footer() {
  return (
    <footer className="line-warm border-t" style={{ background: 'var(--sp-bg)' }}>
      <div className="overflow-hidden line-subtle border-b py-3" aria-hidden>
        <div className="marquee-track flex w-max items-center">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center whitespace-nowrap">
              {GENRES.map((genre, i) => (
                <span key={genre} className="flex items-center">
                  <span className="index-no mx-3">{String(i + 1).padStart(2, '0')}</span>
                  <span
                    className="font-mono text-xs uppercase"
                    style={{ color: 'var(--sp-ink-dim)', letterSpacing: '0.14em' }}
                  >
                    {genre}
                  </span>
                  <span className="mx-6" style={{ color: 'var(--sp-ink-ghost)' }}>~</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'var(--sp-accent)' }}>
              <svg className="w-4 h-4" fill="none" stroke="#14120E" strokeWidth={2.2} strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
              </svg>
            </div>
            <span className="font-display text-xl leading-none" style={{ color: 'var(--sp-ink)' }}>拾音社</span>
            <span className="index-no">SoundPick</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--sp-ink-dim)' }}>拾取灵感，谱成声音。</p>
        </div>
        <div className="md:text-right">
          <p className="text-xs" style={{ color: 'var(--sp-ink-ghost)' }}>AI 生成 · 仅供学习交流</p>
          <p className="text-xs mt-1" style={{ color: 'var(--sp-ink-ghost)' }}>© 2026 拾音社 SoundPick</p>
        </div>
      </div>
    </footer>
  );
}
