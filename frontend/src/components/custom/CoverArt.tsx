import { useMemo } from 'react';

interface CoverArtProps {
  /** 用于生成图案的锚点文本（通常是歌曲标题） */
  seed: string;
  /** 正方形边长 */
  size?: number;
  className?: string;
  /** 生成中状态的脉冲动画 */
  pulsing?: boolean;
}

/** 简单字符串 hash（确定性） */
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 暖调模拟色盘：黑胶、磁带、旧海报的配色 */
const PALETTES: [string, string][] = [
  ['#FF4D2E', '#1D1A15'], // 信号橙红 on 深棕黑
  ['#E8A33D', '#26221B'], // 暖琥珀 on 深棕
  ['#F0EAD9', '#14120E'], // 米白 on 近黑
  ['#3FBF80', '#1D1A15'], // 磁带绿 on 深棕黑
  ['#6B8DFF', '#14120E'], // 深夜蓝 on 近黑
  ['#D97B52', '#26221B'], // 赭石 on 深棕
];

/**
 * 生成式封面：根据标题确定性地生成几何图案。
 * 五种图案：同心弧 / 半调圆点 / 条形码 / 波形 / 对角线
 */
export default function CoverArt({ seed, size = 96, className = '', pulsing = false }: CoverArtProps) {
  const art = useMemo(() => {
    const h = hashString(seed || 'untitled');
    const [fg, bg] = PALETTES[h % PALETTES.length];
    const variant = h % 5;
    const r = (n: number) => ((h >> n) & 0xff) / 255; // 0..1 伪随机序列
    return { fg, bg, variant, r };
  }, [seed]);

  const { fg, bg, variant, r } = art;
  const uid = useMemo(() => `ca-${hashString(seed).toString(36)}`, [seed]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${className}${pulsing ? ' animate-pulse' : ''}`}
      role="img"
      aria-label={`封面：${seed}`}
    >
      <defs>
        <clipPath id={uid}>
          <rect width="100" height="100" rx="4" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid})`}>
        <rect width="100" height="100" fill={bg} />

        {variant === 0 && (
          // 同心弧 —— 黑胶纹
          <g fill="none" stroke={fg} strokeWidth="1.6">
            {[46, 38, 30, 22, 14].map((rad, i) => (
              <circle key={rad} cx={30 + r(i) * 40} cy={30 + r(i + 3) * 40} r={rad} opacity={0.9 - i * 0.15} />
            ))}
            <circle cx={30 + r(0) * 40} cy={30 + r(3) * 40} r="4" fill={fg} stroke="none" />
          </g>
        )}

        {variant === 1 && (
          // 半调圆点 —— 印刷网点
          <g fill={fg}>
            {Array.from({ length: 5 }, (_, row) =>
              Array.from({ length: 5 }, (_, col) => (
                <circle
                  key={`${row}-${col}`}
                  cx={14 + col * 18}
                  cy={14 + row * 18}
                  r={1.5 + r(row * 5 + col) * 5.5}
                  opacity={0.35 + r(col * 5 + row) * 0.6}
                />
              )),
            )}
          </g>
        )}

        {variant === 2 && (
          // 条形码 —— 专辑封底
          <g fill={fg}>
            {Array.from({ length: 14 }, (_, i) => {
              const w = 1.5 + r(i) * 4.5;
              return <rect key={i} x={6 + i * 6.4} y={18 + r(i + 7) * 12} width={w} height={52 + r(i + 2) * 14} opacity={0.5 + r(i + 5) * 0.5} />;
            })}
          </g>
        )}

        {variant === 3 && (
          // 波形 —— 音轨
          <g fill={fg}>
            {Array.from({ length: 12 }, (_, i) => {
              const hgt = 8 + Math.abs(Math.sin(i * 1.7 + r(0) * 6)) * 60;
              return <rect key={i} x={6 + i * 7.4} y={50 - hgt / 2} width="3.2" height={hgt} rx="1.6" opacity={0.55 + r(i) * 0.45} />;
            })}
          </g>
        )}

        {variant === 4 && (
          // 对角线 —— 磁带斜纹
          <g stroke={fg} strokeWidth="5" opacity="0.85">
            {Array.from({ length: 6 }, (_, i) => (
              <line key={i} x1={-20 + i * 24} y1="120" x2={20 + i * 24} y2="-20" opacity={0.3 + r(i) * 0.6} />
            ))}
            <circle cx={72 + r(1) * 12} cy={24 + r(2) * 12} r="7" fill={fg} stroke="none" />
          </g>
        )}

        {/* 底部压条：模拟唱片封套编号 */}
        <rect x="0" y="88" width="100" height="12" fill={bg} opacity="0.6" />
        <text x="6" y="96.5" fontSize="6.5" fill={fg} opacity="0.8" fontFamily="'Instrument Sans', monospace" letterSpacing="0.8">
          SP·{String(hashString(seed) % 1000).padStart(3, '0')}
        </text>
      </g>
    </svg>
  );
}
