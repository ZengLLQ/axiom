import React, { useRef, useEffect } from 'react';

export interface Series {
  name: string;
  data: { x: number; y: number }[];
  color: string;
  dashed?: boolean;
}

interface LineChartProps {
  series: Series[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  logScaleY?: boolean;
  referenceLineY?: number;
  referenceLineLabel?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  series,
  title,
  xLabel = 'Step',
  yLabel = 'Loss',
  logScaleY = false,
  referenceLineY,
  referenceLineLabel,
  height = 260,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const canvasHeight = canvas.height;
    ctx.clearRect(0, 0, width, canvasHeight);

    const ml = 60;
    const mr = 20;
    const mt = 25;
    const mb = 40;
    const pw = width - ml - mr;
    const ph = canvasHeight - mt - mb;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const s of series) {
      for (const pt of s.data) {
        if (!isNaN(pt.x) && isFinite(pt.x)) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
        }
        if (!isNaN(pt.y) && isFinite(pt.y)) {
          const yVal = logScaleY ? Math.log10(Math.max(1e-8, pt.y)) : pt.y;
          if (yVal < minY) minY = yVal;
          if (yVal > maxY) maxY = yVal;
        }
      }
    }

    if (referenceLineY !== undefined) {
      const refY = logScaleY ? Math.log10(Math.max(1e-8, referenceLineY)) : referenceLineY;
      if (refY < minY) minY = refY;
      if (refY > maxY) maxY = refY;
    }

    if (minX === Infinity) { minX = 0; maxX = 1; }
    if (minY === Infinity) { minY = 0; maxY = 1; }
    if (Math.abs(maxX - minX) < 1e-9) maxX = minX + 1;
    if (Math.abs(maxY - minY) < 1e-9) maxY = minY + 1;

    // Grid lines & Y ticks
    ctx.strokeStyle = '#1e2024';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8a8f98';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';

    const numTicksY = 5;
    for (let k = 0; k <= numTicksY; k++) {
      const frac = k / numTicksY;
      const py = mt + (1 - frac) * ph;
      ctx.beginPath();
      ctx.moveTo(ml, py);
      ctx.lineTo(ml + pw, py);
      ctx.stroke();

      const yVal = minY + frac * (maxY - minY);
      const label = logScaleY ? `10^${yVal.toFixed(1)}` : yVal.toFixed(yVal < 0.01 ? 4 : 2);
      ctx.fillText(label, ml - 6, py + 3);
    }

    // X ticks
    ctx.textAlign = 'center';
    const numTicksX = 5;
    for (let k = 0; k <= numTicksX; k++) {
      const frac = k / numTicksX;
      const px = ml + frac * pw;
      ctx.beginPath();
      ctx.moveTo(px, mt);
      ctx.lineTo(px, mt + ph);
      ctx.stroke();

      const xVal = minX + frac * (maxX - minX);
      ctx.fillText(xVal >= 1000 ? `${(xVal / 1000).toFixed(1)}k` : xVal.toFixed(0), px, mt + ph + 16);
    }

    // Reference Line
    if (referenceLineY !== undefined) {
      const refY = logScaleY ? Math.log10(Math.max(1e-8, referenceLineY)) : referenceLineY;
      const py = mt + (1 - (refY - minY) / (maxY - minY)) * ph;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#e4f222';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ml, py);
      ctx.lineTo(ml + pw, py);
      ctx.stroke();

      if (referenceLineLabel) {
        ctx.fillStyle = '#e4f222';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(referenceLineLabel, ml + 8, py - 4);
      }
      ctx.restore();
    }

    // Plot Series Lines
    for (const s of series) {
      if (s.data.length < 2) continue;

      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      if (s.dashed) ctx.setLineDash([5, 5]);

      ctx.beginPath();
      let first = true;
      for (const pt of s.data) {
        if (isNaN(pt.x) || isNaN(pt.y) || !isFinite(pt.x) || !isFinite(pt.y)) continue;
        const yVal = logScaleY ? Math.log10(Math.max(1e-8, pt.y)) : pt.y;
        const px = ml + ((pt.x - minX) / (maxX - minX)) * pw;
        const py = mt + (1 - (yVal - minY) / (maxY - minY)) * ph;

        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // Outer border
    ctx.strokeStyle = '#23252a';
    ctx.strokeRect(ml, mt, pw, ph);

    // Axis titles
    ctx.fillStyle = '#62666d';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, ml + pw / 2, canvasHeight - 6);

    ctx.save();
    ctx.translate(14, mt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

  }, [series, logScaleY, referenceLineY, referenceLineLabel]);

  return (
    <div className="flex flex-col bg-[#0f1011] rounded-[12px] p-4 shadow-[inset_0_0_0_1px_#23252a]">
      <div className="flex items-center justify-between mb-2">
        {title && <span className="text-xs font-medium text-[#d0d6e0] tracking-tight">{title}</span>}
        <div className="flex items-center gap-3">
          {series.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-[#8a8f98] font-mono">{s.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="w-full" style={{ height: `${height}px` }}>
        <canvas ref={canvasRef} width={640} height={height} className="w-full h-full block" />
      </div>
    </div>
  );
};
