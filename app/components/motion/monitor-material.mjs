// Frontal device geometry stays fixed while the camera approaches its live screen.
let brushedTile;

function brushPattern(g) {
  if (!brushedTile) {
    brushedTile = document.createElement('canvas');
    brushedTile.width = brushedTile.height = 256;
    const ctx = brushedTile.getContext('2d');
    const data = ctx.createImageData(256, 256);
    let seed = 419;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let y = 0; y < 256; y++) {
      const row = 105 + random() * 95;
      for (let x = 0; x < 256; x++) {
        const i = (y * 256 + x) * 4;
        const value = row + (random() - .5) * 34;
        data.data[i] = value;
        data.data[i + 1] = value;
        data.data[i + 2] = value - 3;
        data.data[i + 3] = 46;
      }
    }
    ctx.putImageData(data, 0, 0);
  }
  return g.createPattern(brushedTile, 'repeat');
}

function rounded(g, x, y, w, h, r, fill) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
}

function gradient(g, x1, y1, x2, y2, stops) {
  const value = g.createLinearGradient(x1, y1, x2, y2);
  for (const [at, color] of stops) value.addColorStop(at, color);
  return value;
}

function support(g, x, sy, w, stand, grain) {
  const height = w * .18 * stand, halfTop = w * .037;
  const halfFoot = w * .215, baseY = sy + height - 2;
  g.save();
  g.globalAlpha *= Math.min(1, stand * 3);

  // A soft contact shadow gives the thin base a surface to rest on.
  g.save();
  g.globalAlpha *= stand;
  g.shadowColor = '#282a2652';
  g.shadowBlur = w * .038;
  g.shadowOffsetY = 4;
  g.fillStyle = '#24282422';
  g.beginPath();
  g.ellipse(x + 3, baseY + 10, halfFoot * .98, 5 * stand, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();

  const neck = new Path2D();
  neck.moveTo(x - halfTop, sy - 18);
  neck.lineTo(x + halfTop, sy - 18);
  neck.bezierCurveTo(x + halfTop * .98, sy + height * .3, x + w * .046, sy + height * .62, x + w * .069, baseY - 14 * stand);
  neck.bezierCurveTo(x + w * .077, baseY - 5 * stand, x + w * .073, baseY, x + w * .051, baseY + 2 * stand);
  neck.lineTo(x - w * .051, baseY + 2 * stand);
  neck.bezierCurveTo(x - w * .073, baseY, x - w * .077, baseY - 5 * stand, x - w * .069, baseY - 14 * stand);
  neck.bezierCurveTo(x - w * .046, sy + height * .62, x - halfTop * .98, sy + height * .3, x - halfTop, sy - 18);
  neck.closePath();
  g.fillStyle = gradient(g, x, sy, x, baseY, [[0, '#444946'], [.34, '#797f7a'], [.7, '#a2a59e'], [.91, '#bfc1b9'], [1, '#7d847c']]);
  g.fill(neck);
  g.fillStyle = gradient(g, x - w * .075, sy, x + w * .075, sy, [[0, '#18211b66'], [.14, '#edf0e85c'], [.36, '#ffffff0a'], [.7, '#20272025'], [.9, '#f4f6ee54'], [1, '#1e28215c']]);
  g.fill(neck);
  g.save();g.clip(neck);g.fillStyle = grain;g.fillRect(x - w * .08, sy - 20, w * .16, height + 25);g.restore();
  g.lineWidth = .8;g.strokeStyle = '#51595077';g.stroke(neck);

  // The front edge and top plane are separate, shallow metal surfaces.
  const base = new Path2D();
  base.moveTo(x - halfFoot * .86, baseY - 4 * stand);
  base.quadraticCurveTo(x, baseY - 10 * stand, x + halfFoot * .86, baseY - 4 * stand);
  base.lineTo(x + halfFoot, baseY + 7 * stand);
  base.quadraticCurveTo(x + halfFoot + 3, baseY + 10 * stand, x + halfFoot - 4, baseY + 12 * stand);
  base.quadraticCurveTo(x, baseY + 19 * stand, x - halfFoot + 4, baseY + 12 * stand);
  base.quadraticCurveTo(x - halfFoot - 3, baseY + 10 * stand, x - halfFoot, baseY + 7 * stand);
  base.closePath();
  g.fillStyle = gradient(g, x, baseY - 10 * stand, x, baseY + 18 * stand, [[0, '#9ca299'], [.38, '#dcdfd6'], [.58, '#a9aea5'], [.75, '#646c63'], [1, '#a8aea4']]);
  g.fill(base);
  g.save();g.clip(base);g.fillStyle = grain;g.fillRect(x - halfFoot - 5, baseY - 12, halfFoot * 2 + 10, 35);g.restore();
  g.strokeStyle = '#626a605c';g.lineWidth = .8;g.stroke(base);
  g.beginPath();g.moveTo(x - halfFoot + 6, baseY + 8 * stand);g.quadraticCurveTo(x, baseY + 14 * stand, x + halfFoot - 6, baseY + 8 * stand);g.strokeStyle = '#f9faf1a6';g.lineWidth = .8;g.stroke();
  g.restore();
}

export function drawMetalMonitor(g, {x, y, w, stand = 1, drawScreen}) {
  const h = w * 9 / 16, left = x - w / 2, top = y - h / 2;
  const amount = Math.max(0, Math.min(1, stand)), grain = brushPattern(g);
  g.save();
  if (amount > .01) support(g, x, y + h / 2 + 8, w, amount, grain);

  g.save();
  g.shadowColor = `rgba(31, 34, 28, ${.21 * amount})`;
  g.shadowBlur = 36;
  g.shadowOffsetY = 20 * amount;
  rounded(g, left - 13, top - 13, w + 26, h + 26, 15, '#353b35');
  g.restore();

  const rim = gradient(g, left, top, left + w * .82, top + h, [[0, '#c4c8be'], [.13, '#757d71'], [.42, '#e0e2d8'], [.63, '#7c857a'], [.85, '#4d564c'], [1, '#bdc3b7']]);
  rounded(g, left - 14, top - 14, w + 28, h + 28, 16, rim);
  g.save();g.clip();g.fillStyle = grain;g.fillRect(left - 14, top - 14, w + 28, h + 28);g.restore();
  rounded(g, left - 11, top - 11, w + 22, h + 22, 13, gradient(g, x, top - 11, x, top + h + 11, [[0, '#292e28'], [.36, '#181d18'], [.9, '#10150f'], [1, '#31392e']]));
  rounded(g, left - 7, top - 7, w + 14, h + 14, 7, '#080b09');

  // Highlights are restrained to the physical edge, away from the video.
  g.beginPath();g.moveTo(left + 6, top - 12.5);g.lineTo(left + w - 6, top - 12.5);g.strokeStyle = '#f2f4e9a6';g.lineWidth = .7;g.stroke();
  g.beginPath();g.moveTo(left - 12.5, top + 4);g.lineTo(left - 12.5, top + h - 4);g.strokeStyle = '#e4e9da78';g.stroke();
  g.beginPath();g.moveTo(left + 5, top + h + 12);g.lineTo(left + w - 5, top + h + 12);g.strokeStyle = '#252e2377';g.lineWidth = 1;g.stroke();

  g.save();
  g.beginPath();g.roundRect(left, top, w, h, 3);g.clip();
  drawScreen(left, top, w, h);
  // No glass layer at the fullscreen hand-off: the following film frame matches.
  if (amount > 0) {
    g.fillStyle = gradient(g, left, top, left + w * .68, top + h, [[0, `rgba(255,255,246,${.035 * amount})`], [.37, `rgba(255,255,246,${.008 * amount})`], [.68, '#ffffff00'], [1, '#ffffff00']]);
    g.fillRect(left, top, w, h);
  }
  g.restore();
  g.restore();
}
