import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { SECTOR_COLORS, fmt, fmtN } from '../../utils/helpers';
Chart.register(...registerables);

export default function PortfolioBreakdown({ sectorAllocation = {}, total = 0 }) {
  const ref = useRef(null);
  const ch  = useRef(null);
  const entries = Object.entries(sectorAllocation).sort((a,b) => b[1]-a[1]);

  useEffect(() => {
    if (!ref.current || entries.length === 0) return;
    if (ch.current) ch.current.destroy();

    const colors = entries.map(([s]) => SECTOR_COLORS[s] || '#475569');

    ch.current = new Chart(ref.current, {
      type: 'doughnut',
      data: {
        labels: entries.map(([s]) => s),
        datasets: [{
          data: entries.map(([,v]) => v),
          backgroundColor: colors.map(c => c + 'dd'),
          borderWidth: 2.5,
          borderColor: '#070b14',
          hoverBorderWidth: 2.5,
          hoverBorderColor: '#070b14',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '73%',
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor: 'rgba(6,10,22,0.98)',
            borderColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            bodyColor: '#dde6f5',
            padding: 10,
            cornerRadius: 10,
            callbacks: { label: ctx => ` ${ctx.label}: ${fmtN(ctx.parsed/total*100)}%` },
          },
        },
      },
    });

    return () => { if (ch.current) ch.current.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sectorAllocation), total]);

  if (entries.length === 0) return (
    <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text3)', fontSize:11 }}>
      Add positions to see sector breakdown
    </div>
  );

  return (
    <div style={{ display:'flex', gap:16, alignItems:'center' }}>
      {/* Donut */}
      <div style={{ width:118, height:118, position:'relative', flexShrink:0 }}>
        <canvas ref={ref} width={118} height={118}/>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ fontSize:12, fontWeight:800, fontFamily:'JetBrains Mono', color:'var(--white)', letterSpacing:'-0.02em' }}>
            {fmt(Math.round(total))}
          </div>
          <div style={{ fontSize:8, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:2 }}>Portfolio</div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ flex:1 }}>
        {entries.map(([name, val]) => {
          const p   = total > 0 ? val / total * 100 : 0;
          const col = SECTOR_COLORS[name] || '#475569';
          return (
            <div key={name} style={{ marginBottom:9 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:col, flexShrink:0, boxShadow:`0 0 6px ${col}88` }}/>
                  <span style={{ fontSize:11, color:'var(--text2)', fontWeight:500 }}>{name}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:col }}>{fmtN(p)}%</span>
              </div>
              <div style={{ height:2.5, background:'rgba(255,255,255,0.055)', borderRadius:2 }}>
                <div style={{ width:`${p}%`, height:'100%', background:col, borderRadius:2, boxShadow:`0 0 6px ${col}55`, transition:'width 0.5s ease' }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}