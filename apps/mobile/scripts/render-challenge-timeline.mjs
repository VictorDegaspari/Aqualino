import {readFileSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const layoutPath = fileURLToPath(new URL('../src/features/home/presentation/challenge/timeline-layout.json', import.meta.url));
const svgPath = fileURLToPath(new URL('../src/assets/challenge/source/timeline-stream.svg', import.meta.url));
const pngPath = fileURLToPath(new URL('../src/assets/challenge/static/timeline-stream.png', import.meta.url));
const layout = JSON.parse(readFileSync(layoutPath, 'utf8'));
const nodes = layout.zigzagOffsets.map((offset, index) => ({
  x: layout.timelineCenterX + offset,
  y: layout.firstNodeY + layout.dayVerticalDistance * index,
}));

const timelinePath = nodes.reduce((path, node, index) => {
  if (index === 0) {
    return `M ${node.x} ${node.y}`;
  }
  const previous = nodes[index - 1];
  const controlDistance = (node.y - previous.y) * 0.52;
  return `${path} C ${previous.x} ${previous.y + controlDistance}, ${node.x} ${node.y - controlDistance}, ${node.x} ${node.y}`;
}, '');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.canvasWidth * 2}" height="${layout.canvasHeight * 2}" viewBox="0 0 ${layout.canvasWidth} ${layout.canvasHeight}">
  <defs>
    <linearGradient id="stream" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#19dfff" stop-opacity=".88"/>
      <stop offset=".5" stop-color="#087fd8" stop-opacity=".78"/>
      <stop offset="1" stop-color="#0465b8" stop-opacity=".46"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-10%" width="180%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>
  <path d="${timelinePath}" fill="none" stroke="#00b9ff" stroke-opacity=".34" stroke-width="18" stroke-linecap="round" filter="url(#glow)"/>
  <path d="${timelinePath}" fill="none" stroke="url(#stream)" stroke-width="7" stroke-linecap="round"/>
  <path d="${timelinePath}" fill="none" stroke="#a3fbff" stroke-opacity=".46" stroke-width="1.4" stroke-linecap="round" transform="translate(-1.5 -1)"/>
</svg>\n`;

writeFileSync(svgPath, svg);
const render = spawnSync('/bin/ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', svgPath, '-frames:v', '1', pngPath], {stdio: 'inherit'});
if (render.status !== 0) {
  process.exit(render.status ?? 1);
}

console.log(`Timeline renderizada a partir de ${nodes.length} nós: ${pngPath}`);
