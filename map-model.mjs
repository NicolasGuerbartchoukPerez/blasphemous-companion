export function extractMapCells(data) {
  const maps = data?.commonElements?.ID_NEW_MAPS;
  if (!maps?.Maps || typeof maps.Maps !== 'object') return { id: null, cells: [] };
  const id = Object.hasOwn(maps.Maps, maps.currentMapId) ? maps.currentMapId : ['CvstodiaDLC3','CvstodiaDLC2','Cvstodia'].find(key => Array.isArray(maps.Maps[key]?.RevealedCells));
  const raw = maps.Maps[id]?.RevealedCells;
  if (!Array.isArray(raw)) return { id: id ?? null, cells: [] };
  const seen = new Set(), cells = [];
  for (const cell of raw) {
    if (!Number.isInteger(cell?.X) || !Number.isInteger(cell?.Y) || Math.abs(cell.X) > 1000 || Math.abs(cell.Y) > 1000) continue;
    const key = cell.X + ':' + cell.Y;
    if (!seen.has(key)) { seen.add(key); cells.push({ x: cell.X, y: cell.Y }); }
  }
  return { id: id ?? null, cells };
}
export function markersFor(rows, positions) {
  const groups = new Map();
  for (const row of rows) for (const point of positions[row.id] ?? []) {
    const key = point.x + ':' + point.y;
    if (!groups.has(key)) groups.set(key, { key, x: point.x, y: point.y, rows: [] });
    const group = groups.get(key);
    if (!group.rows.some(r => r.id === row.id)) group.rows.push(row);
  }
  return [...groups.values()];
}
export function boundsFor(points, padding = 2) {
  if (!points.length) return { x: 0, y: 0, width: 90, height: 70 };
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => -p.y));
  return { x: x-padding, y: y-padding, width: Math.max(5, Math.max(...points.map(p => p.x))-x+padding*2), height: Math.max(5, Math.max(...points.map(p => -p.y))-y+padding*2) };
}
