import React, { useRef, useEffect, useState } from 'react';

interface HeatmapProps {
  data: number[][]; // [t_idx][x_idx]
  xGrid: number[];
  tGrid: number[];
  title?: string;
  xLabel?: string;
  tLabel?: string;
  colormap?: 'viridis' | 'plasma' | 'coolwarm' | 'magma';
  valueUnit?: string;
}

// Colormap interpolation functions
function getColormapColor(val: number, min: number, max: number, map: string): [number, number, number] {
  const norm = max > min ? Math.max(0, Math.min(1, (val - min) / (max - min))) : 0.5;
  
  if (map === 'coolwarm') {
    // Blue to white to red
    if (norm < 0.5) {
      const t = norm * 2;
      return [Math.round(59 + t * 196), Math.round(76 + t * 179), Math.round(192 + t * 63)];
    } else {
      const t = (norm - 0.5) * 2;
      return [Math.round(255 - t * 75), Math.round(255 - t * 217), Math.round(255 - t * 217)];
    }
  } else if (map === 'plasma') {
    // Purple to orange to yellow
    const r = Math.round(13 + norm * 242);
    const g = Math.round(8 + Math.sin(norm * Math.PI) * 160 + norm * 80);
    const b = Math.round(135 - norm * 100);
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
  } else {
    // Viridis: deep purple -> blue -> teal -> green -> yellow
    const r = Math.round(68 + norm * (253 - 68) * Math.pow(norm, 0.7));
    const g = Math.round(1 + norm * 231);
    const b = Math.round(84 + Math.sin(norm * Math.PI * 0.9) * 120 - norm * 50);
    return [Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b))];
  }
}

export const Heatmap2D: React.FC<HeatmapProps> = ({
  data,
  xGrid,
  tGrid,
  title,
  xLabel = 'Spatial coordinate x',
  tLabel = 'Time t',
  colormap = 'viridis',
  valueUnit = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hovered, setHovered] = useState<{ x: number; t: number; val: number } | null>(null);

  const Nt = data.length;
  const Nx = Nt > 0 ? data[0].length : 0;

  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let i = 0; i < Nt; i++) {
    for (let j = 0; j < Nx; j++) {
      const v = data[i][j];
      if (!isNaN(v) && isFinite(v)) {
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
  }
  if (minVal === Infinity) { minVal = 0; maxVal = 1; }
  if (Math.abs(maxVal - minVal) < 1e-9) maxVal = minVal + 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || Nt === 0 || Nx === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Margins
    const ml = 50; // left
    const mb = 40; // bottom
    const mt = 20; // top
    const mr = 60; // right for colorbar
    const pw = width - ml - mr; // plot width
    const ph = height - mt - mb; // plot height

    // Draw Heatmap Cells
    const cellW = pw / (Nx - 1);
    const cellH = ph / (Nt - 1);

    for (let i = 0; i < Nt; i++) {
      for (let j = 0; j < Nx; j++) {
        const val = data[i][j];
        const [r, g, b] = getColormapColor(val, minVal, maxVal, colormap);
        ctx.fillStyle = `rgb(${r},${g},${b})`;

        const px = ml + j * cellW - cellW * 0.5;
        const py = mt + (Nt - 1 - i) * cellH - cellH * 0.5;
        ctx.fillRect(Math.max(ml, px), Math.max(mt, py), cellW + 0.5, cellH + 0.5);
      }
    }

    // Border around plot
    ctx.strokeStyle = '#23252a';
    ctx.lineWidth = 1;
    ctx.strokeRect(ml, mt, pw, ph);

    // X-axis ticks and labels
    ctx.fillStyle = '#8a8f98';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    const numTicksX = 5;
    for (let k = 0; k <= numTicksX; k++) {
      const frac = k / numTicksX;
      const xVal = (xGrid[0] ?? 0) + frac * ((xGrid[xGrid.length - 1] ?? 1) - (xGrid[0] ?? 0));
      const px = ml + frac * pw;
      ctx.beginPath();
      ctx.moveTo(px, mt + ph);
      ctx.lineTo(px, mt + ph + 4);
      ctx.strokeStyle = '#383b3f';
      ctx.stroke();
      ctx.fillText(xVal.toFixed(2), px, mt + ph + 16);
    }

    // T-axis ticks and labels (vertical)
    ctx.textAlign = 'right';
    const numTicksT = 5;
    for (let k = 0; k <= numTicksT; k++) {
      const frac = k / numTicksT;
      const tVal = (tGrid[0] ?? 0) + frac * ((tGrid[tGrid.length - 1] ?? 1) - (tGrid[0] ?? 0));
      const py = mt + (1 - frac) * ph;
      ctx.beginPath();
      ctx.moveTo(ml - 4, py);
      ctx.lineTo(ml, py);
      ctx.strokeStyle = '#383b3f';
      ctx.stroke();
      ctx.fillText(tVal.toFixed(2), ml - 8, py + 4);
    }

    // Axis titles
    ctx.fillStyle = '#62666d';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, ml + pw / 2, height - 6);

    ctx.save();
    ctx.translate(14, mt + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(tLabel, 0, 0);
    ctx.restore();

    // Colorbar on right
    const cbX = width - mr + 15;
    const cbW = 12;
    const cbH = ph;

    for (let y = 0; y < cbH; y++) {
      const frac = 1 - y / cbH;
      const v = minVal + frac * (maxVal - minVal);
      const [r, g, b] = getColormapColor(v, minVal, maxVal, colormap);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(cbX, mt + y, cbW, 1);
    }
    ctx.strokeStyle = '#23252a';
    ctx.strokeRect(cbX, mt, cbW, cbH);

    // Colorbar labels
    ctx.fillStyle = '#8a8f98';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(maxVal.toFixed(3), cbX + cbW + 5, mt + 8);
    ctx.fillText(((minVal + maxVal) / 2).toFixed(3), cbX + cbW + 5, mt + cbH / 2 + 4);
    ctx.fillText(minVal.toFixed(3), cbX + cbW + 5, mt + cbH);

  }, [data, xGrid, tGrid, colormap, minVal, maxVal]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || Nt === 0 || Nx === 0) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const ml = 50;
    const mb = 40;
    const mt = 20;
    const mr = 60;
    const pw = canvas.width - ml - mr;
    const ph = canvas.height - mt - mb;

    if (mouseX >= ml && mouseX <= ml + pw && mouseY >= mt && mouseY <= mt + ph) {
      const fracX = (mouseX - ml) / pw;
      const fracT = 1 - (mouseY - mt) / ph;
      const j = Math.max(0, Math.min(Nx - 1, Math.round(fracX * (Nx - 1))));
      const i = Math.max(0, Math.min(Nt - 1, Math.round(fracT * (Nt - 1))));

      setHovered({
        x: xGrid[j] ?? fracX,
        t: tGrid[i] ?? fracT,
        val: data[i]?.[j] ?? 0,
      });
    } else {
      setHovered(null);
    }
  };

  return (
    <div className="flex flex-col bg-[#0f1011] rounded-[12px] p-4 shadow-[inset_0_0_0_1px_#23252a] relative">
      <div className="flex items-center justify-between mb-2">
        {title && <span className="text-xs font-medium text-[#d0d6e0] tracking-tight">{title}</span>}
        {hovered ? (
          <span className="font-mono text-xs text-[#e4f222] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-[4px]">
            x={hovered.x.toFixed(3)}, t={hovered.t.toFixed(3)} → u={hovered.val.toFixed(4)} {valueUnit}
          </span>
        ) : (
          <span className="text-[11px] font-mono text-[#62666d]">
            range: [{minVal.toFixed(3)}, {maxVal.toFixed(3)}]
          </span>
        )}
      </div>
      <div className="w-full aspect-[16/10] max-h-[380px]">
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          className="w-full h-full block cursor-crosshair rounded-[6px]"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        />
      </div>
    </div>
  );
};
