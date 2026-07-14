/**
 * js/utils/tooltip.js
 * Maritime terminology tooltips
 */
import { CONFIG } from '../config.js';

export const MARITIME_TERMS = {
  'knot':  'Satuan kecepatan laut. 1 knot = 1,852 km/jam',
  'kt':    'Knot - satuan kecepatan laut. 1 kt = 1,852 km/jam',
  'WITA':  'Waktu Indonesia Tengah (UTC+8), zona waktu Sulawesi',
  'BMKG':  'Badan Meteorologi, Klimatologi, dan Geofisika - lembaga resmi cuaca Indonesia',
  'cm/s':  'Centimeter per detik - satuan kecepatan arus laut',
  'RH':    'Relative Humidity - kelembapan udara relatif dalam persen',
  'GT':    'Gross Tonnage - satuan ukuran kapasitas kapal',
  'ADM4':  'Kode wilayah administrasi tingkat 4 (kelurahan/desa) - standar Kemendagri'
};

/**
 * Apply maritime tooltips to a container element
 * @param {HTMLElement|string} container
 */
export function applyMaritimeTooltips(container) {
  if (typeof container === 'string') container = document.getElementById(container);
  if (!container) return;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (['SCRIPT','STYLE','INPUT','TEXTAREA','BUTTON'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.classList.contains('maritime-tooltip')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  nodes.forEach(textNode => {
    let text = textNode.textContent;
    let hasMatch = false;
    Object.entries(MARITIME_TERMS).forEach(([term, desc]) => {
      const regex = new RegExp(`(?<![a-zA-Z])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z])`, 'g');
      if (regex.test(text)) {
        hasMatch = true;
        text = text.replace(regex,
          `<span class="maritime-tooltip" data-tooltip="${desc}" tabindex="0" role="definition" aria-label="${term}: ${desc}">${term}</span>`
        );
      }
    });
    if (hasMatch) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = text;
      textNode.parentNode.replaceChild(wrapper, textNode);
    }
  });
}
