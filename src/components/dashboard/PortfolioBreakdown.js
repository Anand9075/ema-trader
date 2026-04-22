import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { SECTOR_COLORS, fmt, fmtN } from '../../utils/helpers';
Chart.register(...registerables);

export default function PortfolioBreakdown({ sectorAllocation = {}, total = 0 }) {
  const ref = useRef(null);
  const ch  = useRef(null);

  const sectors = Object.entries(sectorAllocation).sort((a, b) => b[1] - a[1]);
  const colors  = sectors.map(([s]) => SECTOR_COLORS[s] || '#475569');
  const values  = sectors.map(([, v]) => v);

  useEffect(() => {
    if (!ref.current || sectors.length === 0) return;
    if (ch.current) ch.current.destroy();

    ch.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels: sectors.map(([s]) => s), datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#101828', hoverBorderWidth: 2 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#131f33',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            bodyColor: '#e2e8f0',
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${fmtN(ctx.parsed / total * 100)}%`,
            },
          },
        },
      },
    });

    return () => { if (ch.current) ch.current.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sectorAllocation), total]);

  if (sectors.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 11 }}>
        Add positions to see breakdown
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {/* Donut */}
      <div className="donut-wrap" style={{ width: 120, height: 120, flexShrink: 0 }}>
        <canvas ref={ref} width={120} height={120}/>
        <div className="donut-center">
          <div className="donut-value" style={{ fontSize: 13 }}>{fmt(Math.round(total))}</div>
          <div className="donut-label">Total</div>
        </div>
      </div>

      {/* Sector list */}
      <div style={{ flex: 1 }}>
        {sectors.map(([name, val]) => {
          const pctVal = total > 0 ? (val / total * 100) : 0;
          const col    = SECTOR_COLORS[name] || '#475569';
          return (
            <div key={name} style={{ marginBottom: 8 }}>
              <div className="sector-row" style={{ paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <div className="sector-dot" style={{ background: col }}/>
                  <span className="sector-name">{name}</span>
                </div>
                <span className="sector-pct" style={{ color: col }}>{fmtN(pctVal)}%</span>
              </div>
              <div className="sector-bar-wrap">
                <div className="sector-bar" style={{ width: `${pctVal}%`, background: col }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}