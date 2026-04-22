import React, { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

export default function PortfolioChart({ snapshots = [], currentValue = 0 }) {
  const ref = useRef(null);
  const ch  = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ch.current) ch.current.destroy();

    // Build data: use snapshots + current value
    let labels = [], data = [];
    if (snapshots.length > 0) {
      // Last 30 snapshots
      const recent = snapshots.slice(-30);
      labels = recent.map(s => {
        const d = new Date(s.date);
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      });
      data = recent.map(s => s.value);
    } else {
      // Placeholder data
      const days = 7;
      const base = currentValue * 0.94;
      for (let i = days; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-IN', { weekday: 'short' }));
        const noise = (Math.random() - 0.4) * base * 0.015;
        data.push(Math.round(base + (currentValue - base) * (1 - i / days) + noise));
      }
    }
    if (currentValue > 0 && data.at(-1) !== currentValue) {
      data[data.length - 1] = currentValue;
    }

    const isUp = data.length < 2 || data.at(-1) >= data[0];
    const col  = isUp ? '#22c55e' : '#ef4444';

    ch.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: col,
          backgroundColor: (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 160);
            gradient.addColorStop(0, isUp ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            return gradient;
          },
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: col,
          fill: true,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#131f33',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            callbacks: {
              label: (ctx) => ` ₹${ctx.raw?.toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: { color: '#475569', font: { size: 10 }, maxTicksLimit: 7 },
            border: { display: false },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
            ticks: {
              color: '#475569',
              font: { size: 10 },
              callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
            },
            border: { display: false },
          },
        },
      },
    });

    return () => { if (ch.current) ch.current.destroy(); };
  }, [snapshots, currentValue]);

  return <div style={{ height: 160, position: 'relative' }}><canvas ref={ref}/></div>;
}