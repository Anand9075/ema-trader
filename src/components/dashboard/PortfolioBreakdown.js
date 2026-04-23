import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { SECTOR_COLORS, fmt, fmtN } from '../../utils/helpers';
Chart.register(...registerables);

export default function PortfolioBreakdown({ sectorAllocation = {}, total = 0 }) {
  const ref = useRef(null);
  const ch  = useRef(null);
  const entries = Object.entries(sectorAllocation).sort((a,b)=>b[1]-a[1]);

  useEffect(() => {
    if (!ref.current || entries.length === 0) return;
    if (ch.current) ch.current.destroy();
    ch.current = new Chart(ref.current, {
      type: 'doughnut',
      data: { labels: entries.map(([s])=>s),
        datasets:[{ data: entries.map(([,v])=>v), backgroundColor: entries.map(([s])=>SECTOR_COLORS[s]||'#475569'), borderWidth:2, borderColor:'#101828', hoverBorderWidth:2 }] },
      options: { responsive:true, maintainAspectRatio:false, cutout:'72%',
        plugins:{ legend:{display:false}, tooltip:{ backgroundColor:'#131f33', borderColor:'rgba(255,255,255,0.07)', borderWidth:1, bodyColor:'#e2e8f0',
          callbacks:{ label: ctx => ` ${ctx.label}: ${fmtN(ctx.parsed/total*100)}%` } } } },
    });
    return () => { if (ch.current) ch.current.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sectorAllocation), total]);

  if (entries.length === 0) return (
    <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:11 }}>Add positions to see sector breakdown</div>
  );

  return (
    <div style={{ display:'flex', gap:16, alignItems:'center' }}>
      <div style={{ width:120, height:120, position:'relative', flexShrink:0 }}>
        <canvas ref={ref} width={120} height={120}/>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono', color:'var(--text)' }}>{fmt(Math.round(total))}</div>
          <div style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Total</div>
        </div>
      </div>
      <div style={{ flex:1 }}>
        {entries.map(([name, val]) => {
          const p   = total > 0 ? val / total * 100 : 0;
          const col = SECTOR_COLORS[name] || '#475569';
          return (
            <div key={name} style={{ marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:col, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:'var(--text2)' }}>{name}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:600, color:col }}>{fmtN(p)}%</span>
              </div>
              <div style={{ height:2, background:'rgba(255,255,255,0.06)', borderRadius:1 }}>
                <div style={{ width:`${p}%`, height:'100%', background:col, borderRadius:1 }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}