export const GROUPS = { relics: 'Reliquias', bones: 'Huesos', cherubs: 'Querubines', beads: 'Cuentas de rosario', prayers: 'Rezos', hearts: 'Corazones', upgrades: 'Mejoras', quest: 'Objetos de misión' };
const FIELDS = { relics: ['ownRellics', 'ownRelics'], bones: ['ownCollectibleItems'], beads: ['ownBeads'], prayers: ['ownPrayers'], hearts: ['ownSwords'], upgrades: ['ownQuestItems'], quest: ['ownQuestItems'] };
const WEAR = { relics: ['wearRellics', 'wearRelics'], beads: ['wearBeads'], prayers: ['wearPrayers'], hearts: ['wearSwords'] };
export function decodeSave(input) {
  if (typeof input !== 'string' || input.length > 30 * 1024 * 1024) throw new Error('El archivo está vacío o supera los 30 MB permitidos.');
  let raw = input.replace(/^\uFEFF/, '').trim();
  if (!raw) throw new Error('El archivo está vacío.');
  if (!raw.startsWith('{')) {
    const b64 = raw.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new Error('Formato no reconocido. Selecciona savegame_0.save, 1 o 2, o su JSON decodificado.');
    try { raw = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0))); }
    catch { throw new Error('No se ha podido decodificar este guardado.'); }
  }
  let data;
  try { data = JSON.parse(raw.replace(/^\uFEFF/, '')); } catch { throw new Error('El guardado no contiene un JSON válido. Espera a que el juego termine de guardar y vuelve a intentarlo.'); }
  const common = data?.commonElements;
  const inventory = common?.ID_INVENTORY;
  if (!inventory || typeof inventory !== 'object' || !Object.values(FIELDS).flat().some(k => Array.isArray(inventory[k]))) throw new Error('No es un guardado compatible de Blasphemous 1.');
  for (const k of [...Object.values(FIELDS).flat(), ...Object.values(WEAR).flat()]) {
    if (inventory[k] !== undefined && (!Array.isArray(inventory[k]) || inventory[k].some(v => typeof v !== 'string'))) throw new Error('No se puede leer el inventario de este archivo. Carga el guardado original de Blasphemous 1 y espera a que el juego termine de guardar.');
  }
  const flags = common.ID_EVENT_MANAGER?.flags;
  if (flags !== undefined && (!flags || typeof flags !== 'object' || Array.isArray(flags))) throw new Error('Los eventos del guardado no son compatibles.');
  if (Object.keys(common).some(k => /randomizer/i.test(k))) throw new Error('Esta versión analiza partidas normales. Un randomizer cambia las ubicaciones y requiere su propio catálogo.');
  return data;
}
export function analyze(data, catalog) {
  const common = data.commonElements, inv = common.ID_INVENTORY, flags = common.ID_EVENT_MANAGER?.flags ?? {}, persistent = common.ID_PERSISTENT_MANAGER ?? {};
  const sets = {}, known = {};
  for (const [group, fields] of Object.entries(FIELDS)) {
    known[group] = fields.some(k => Array.isArray(inv[k]));
    sets[group] = new Set([...fields, ...(WEAR[group] ?? [])].flatMap(k => inv[k] ?? []).filter(Boolean));
  }
  const isTrue = k => flags[k] === true;
  const evidence = (id, group) => {
    if (sets[group]?.has(id)) return true;
    if ([id + '_OWNED', 'CLAIMED_' + id, id + '_USED', id + '_BOUGHT_AT_CANDELARIA'].some(isTrue)) return true;
    if (/^QI/.test(id) && Object.entries(flags).some(([k, v]) => v === true && (k.endsWith('_' + id + '_DELIVERED') || k.endsWith('_' + id + '_USED') || k.endsWith('_' + id + '_OWNED') || /^ALTASGRACIAS_ALTAR[123]_QI(10|11|12)$/.test(k) && k.endsWith('_' + id)))) return true;
    return false;
  };
  const rows = catalog.map(item => {
    let status;
    if (item.group === 'cherubs') status = flags[item.id] === true ? 'obtained' : flags[item.id] === false ? 'missing' : 'unknown';
    else if (evidence(item.id, item.group) || item.laterStages?.some(id => evidence(id, item.group))) status = 'obtained';
    else if (item.ngplus && persistent.IsNewGamePlus === false) status = 'later';
    else if (!known[item.group]) status = 'unknown';
    else if (item.group === 'quest' || item.group === 'upgrades') {
      // Consumidos o transformados: su ausencia en inventario no demuestra que falten.
      const explicit = [item.id + '_OWNED', 'CLAIMED_' + item.id, item.id + '_USED'].some(k => flags[k] === false);
      status = explicit ? 'missing' : 'unknown';
    } else status = 'missing';
    const equipped = (WEAR[item.group] ?? []).some(k => inv[k]?.includes(item.id));
    return { ...item, status, equipped };
  });
  const rescued = rows.filter(r => r.group === 'cherubs' && r.status === 'obtained').length;
  const cherubsKnown = rows.filter(r => r.group === 'cherubs' && r.status !== 'unknown').length === 38;
  const relic = id => rows.find(r => r.id === id)?.status === 'obtained';
  let rootStep = 0, rootNext;
  if (relic('RE10')) { rootStep = 4; rootNext = 'Ya tienes Tres Lenguas Nudosas. Equípala en una de las tres ranuras de reliquias para activar las raíces.'; }
  else if (sets.quest.has('QI14')) { rootStep = 3; rootNext = 'Lleva el Huevo de la Deformidad Eclosionado a la fuente de Albero y entrégalo al Señor de las Orillas Saladas.'; }
  else if (sets.quest.has('QI13')) { rootStep = 2; rootNext = 'Ya tienes el Huevo de la Deformidad. Déjalo en el árbol donde luchaste contra Perpetva, en la Serranía del Ocaso Perpetuo, antes de Jondo. Sal de la sala y vuelve a entrar para recoger el huevo eclosionado.'; }
  else if (isTrue('ALTASGRACIAS_EGG_OFFERED')) { rootStep = 2; rootNext = 'El guardado indica que ofreciste el huevo. Vuelve al árbol de Perpetva en la Serranía del Ocaso Perpetuo para comprobar si puedes recoger el huevo eclosionado.'; }
  else if (isTrue('ALTASGRACIAS_EGG_BROKEN')) { rootStep = 1; rootNext = 'Ya has abierto el huevo de Altasgracias. Habla con ella en Asciende el Quejido para comprobar la entrega del Huevo de la Deformidad; todavía no figura en tu inventario.'; }
  else { rootNext = 'Lleva Monedas de Oro Fundidas, Cinta Nupcial Rasgada y Velo de Negro Luto a los tres platos de Altasgracias, en Asciende el Quejido.'; }
  return { rows, rescued, cherubsKnown, rootStep, rootNext, progress: Number.isFinite(persistent.Percent) ? persistent.Percent : null, playtime: Number.isFinite(persistent.Time) ? persistent.Time : null, ngplus: persistent.IsNewGamePlus === true, scene: common.ID_CHECKPOINT_MANAGER?.activePrieDieuScene ?? '', relicCount: rows.filter(r => r.group === 'relics' && r.status === 'obtained').length, warnings: Object.keys(common).some(k => /mod/i.test(k) && !/GAMEMMODE/.test(k)) ? ['Hay datos de mods: las ubicaciones están documentadas para el juego normal.'] : [] };
}
