// ===== UTILITIES =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showNotification(message, type = 'success') {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
}

function closeAllModals() {
  document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function getEquipmentIcon(type) {
  const icons = {
    computador: 'fa-desktop', pcescritorio: 'fa-desktop', notebook: 'fa-laptop', impresora: 'fa-print',
    celular: 'fa-mobile-screen', servidor: 'fa-server',
    tablet: 'fa-tablet-screen-button'
  };
  return icons[type] || 'fa-desktop';
}

function getStatusBadge(status) {
  const map = {
    activo: { label: 'Activo', cls: 'badge-success' },
    mantenimiento: { label: 'Mantenimiento', cls: 'badge-warning' },
    baja: { label: 'Dado de baja', cls: 'badge-danger' }
  };
  const s = map[status] || map.activo;
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

function applyCompanyTheme(color) {
  if (!color) return;
  document.documentElement.style.setProperty('--accent', color);
  // Generate lighter and darker variants
  const hsl = hexToHSL(color);
  if (hsl) {
    document.documentElement.style.setProperty('--accent-light', `hsl(${hsl.h}, ${Math.min(hsl.s + 10, 100)}%, ${Math.min(hsl.l + 10, 70)}%)`);
    document.documentElement.style.setProperty('--accent-dark', `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 15, 15)}%)`);
    document.documentElement.style.setProperty('--accent-glow', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.3)`);
  }
}

function hexToHSL(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function createDynamicList(containerId, fields, items = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.dataset.fields = JSON.stringify(fields);
  container.dataset.items = JSON.stringify(items);
  
  let html = '';
  items.forEach((item, i) => {
    html += `<div class="dynamic-list-item" data-index="${i}">`;
    fields.forEach(f => {
      html += `<input type="text" placeholder="${f.placeholder}" value="${escapeHtml(item[f.key] || '')}" data-key="${f.key}" class="form-control form-control-sm">`;
    });
    html += `<button type="button" class="btn-icon btn-danger-icon" onclick="removeDynamicItem('${containerId}', ${i})"><i class="fas fa-times"></i></button></div>`;
  });
  container.innerHTML = html;
}

function addDynamicItem(containerId) {
  const container = document.getElementById(containerId);
  const fields = JSON.parse(container.dataset.fields || '[]');
  const items = getListItems(containerId);
  const newItem = {};
  fields.forEach(f => newItem[f.key] = '');
  items.push(newItem);
  container.dataset.items = JSON.stringify(items);
  createDynamicList(containerId, fields, items);
}

function removeDynamicItem(containerId, index) {
  const items = getListItems(containerId);
  items.splice(index, 1);
  const container = document.getElementById(containerId);
  const fields = JSON.parse(container.dataset.fields || '[]');
  container.dataset.items = JSON.stringify(items);
  createDynamicList(containerId, fields, items);
}

function getListItems(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  // Read from DOM inputs
  const itemEls = container.querySelectorAll('.dynamic-list-item');
  if (itemEls.length === 0) {
    return JSON.parse(container.dataset.items || '[]');
  }
  const items = [];
  itemEls.forEach(el => {
    const item = {};
    el.querySelectorAll('input').forEach(inp => {
      item[inp.dataset.key] = inp.value;
    });
    items.push(item);
  });
  return items;
}
