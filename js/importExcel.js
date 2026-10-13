// ===== IMPORTAR EQUIPOS DESDE EXCEL (Reporte de Soporte Remoto) =====
// La parte "ImportParser" es lógica pura (sin DOM) para poder probarla fuera del navegador.

const ImportParser = (() => {
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const key = s => norm(s).replace(/[^a-z0-9]/g, '');
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

  // Mapeo tolerante de encabezados del Excel -> campo interno
  const HEADER_RULES = [
    ['nombre', k => k === 'nombre'],
    ['empresa', k => k === 'empresa'],
    ['auth', k => k.startsWith('autenticacion')],
    ['depto', k => k.startsWith('departamento')],
    ['codigo', k => k === 'codigo'],
    ['equipo', k => k === 'equipo' || k === 'hostname'],
    ['so', k => k.startsWith('sistemaoperativo')],
    ['cpu', k => k.startsWith('procesador')],
    ['mem', k => k.startsWith('memoria')],
    ['fab', k => k.startsWith('fabricante')],
    ['serie', k => k.includes('serie') || k.includes('serial')],
    ['desc', k => k.startsWith('descripcion')],
    ['ipPub', k => k.includes('ippublica')],
    ['ipPriv', k => k.includes('ipprivada')],
    ['mac', k => k.includes('mac')],
  ];

  function mapRow(raw) {
    const out = {};
    for (const [h, v] of Object.entries(raw)) {
      const k = key(h);
      const rule = HEADER_RULES.find(([f, test]) => !(f in out) && test(k));
      if (rule) out[rule[0]] = clean(v);
    }
    return out;
  }

  const JUNK_SERIAL = /^(|to be filled.*|default string|system serial number|none|0+|not specified|not applicable|chassis serial number|n\/a|123456789|sku|all)$/i;
  const GENERIC_MODEL = /^(|system product name|to be filled.*|default string|all series|not specified)$/i;

  const BRANDS = [
    [/^dell inc\.?\s*/i, 'Dell'],
    [/^(hewlett-packard|hp)\s+/i, 'HP'],
    [/^lenovo\s*/i, 'Lenovo'],
    [/^(asustek computer inc\.?|asus)\s*/i, 'ASUS'],
    [/^acer\s*/i, 'Acer'],
    [/^(micro-star international co\., ltd\.?|msi)\s*/i, 'MSI'],
    [/^samsung electronics co\., ltd\.?\s*/i, 'Samsung'],
    [/^gigabyte technology co\., ltd\.?\s*/i, 'Gigabyte'],
    [/^apple inc\.?\s*/i, 'Apple'],
    [/^vmware,? inc\.?\s*/i, 'VMware'],
    [/^microsoft corporation\s*/i, 'Microsoft'],
    [/^(system manufacturer|to be filled by o\.e\.m\.|default string)\s*/i, 'Genérico'],
  ];

  function parseMarcaModelo(fab, serieRaw, codigo) {
    let marca = '', modelo = clean(fab);
    for (const [re, name] of BRANDS) {
      if (re.test(modelo)) { marca = name; modelo = modelo.replace(re, ''); break; }
    }
    if (!marca && modelo) { marca = modelo.split(' ')[0]; modelo = modelo.slice(marca.length).trim(); }
    // "HP HP Pro..." -> "HP Pro..." (quitar marca repetida)
    if (marca && marca !== 'Genérico' && norm(modelo).startsWith(norm(marca) + ' ') && marca !== 'HP') modelo = modelo.slice(marca.length).trim();
    // Lenovo: el modelo comercial viene en el campo producto (LENOVO_MT_80TJ_..._FM_Lenovo ideapad 110-15ACL)
    const prod = clean(String(serieRaw || '').split(' / ')[0]);
    const fm = prod.match(/_FM_(.+)$/i);
    if (fm) modelo = fm[1].replace(/^lenovo\s+/i, '');
    if (GENERIC_MODEL.test(modelo)) modelo = clean(codigo) || 'Genérico';
    if (!marca) marca = 'Genérico';
    return { marca, modelo };
  }

  function parseSerial(serieRaw, hostname) {
    const parts = String(serieRaw || '').split(' / ');
    const s = clean(parts[parts.length - 1]);
    if (!JUNK_SERIAL.test(s)) return { serial: s, fallback: false };
    return { serial: hostname || 'SIN-SERIAL', fallback: true };
  }

  function parseOS(so) {
    let s = clean(so).replace(/^[^,]*corporation,\s*/i, '');
    const m = s.match(/^(.*?)\s*\(([\d.]+)\)/);
    if (!m) return { nombre: s, version: '' };
    let nombre = m[1].trim(); const version = m[2];
    // Las herramientas remotas reportan Windows 11 como "Windows 10" con build >= 22000
    const build = parseInt((version.split('.')[2]) || '0', 10);
    if (/^windows 10/i.test(nombre) && build >= 22000) nombre = nombre.replace(/windows 10/i, 'Windows 11');
    return { nombre, version };
  }

  function parseCPU(cpu) {
    return clean(String(cpu || '').replace(/\((R|TM)\)/gi, '').replace(/\(\d+ virtual\)/i, '').replace(/\((X64|X86|ARM64)\)/i, '').replace(/\bCPU\b/, ''));
  }

  function parseRAM(mem) {
    const m = String(mem || '').match(/\/\s*([\d.]+)\s*MB/i);
    if (!m) return clean(mem);
    return Math.max(1, Math.round(parseFloat(m[1]) / 1024)) + ' GB';
  }

  // "usuario - clave" -> separado. Si es ambiguo, todo va a usuario.
  function parseAuth(auth) {
    const a = clean(auth);
    if (!a) return { usuario: null, clave: null, ambiguo: false };
    const parts = a.split(/\s+-\s+/);
    if (parts.length === 2 && !a.includes(' / ') && parts[0] && parts[1]) return { usuario: parts[0], clave: parts[1], ambiguo: false };
    if (parts.length === 1) return { usuario: a, clave: null, ambiguo: false };
    return { usuario: a, clave: null, ambiguo: true };
  }

  function detectTipo(r) {
    const txt = norm([r.fab, r.nombre, r.equipo, r.codigo, r.serie, r.desc].join(' '));
    if (/server|servidor/.test(norm(r.so)) || /poweredge|proliant|virtual machine|vmware|servidor/.test(txt) || /servidor/.test(norm(r.depto))) return 'servidor';
    if (/laptop|notebook|nitro|ideapad|thinkpad|vivobook|zenbook|pavilion x360|elitebook|probook|latitude|inspiron|aspire|macbook|surface|750xfg|galaxy book|vostro 1|\bnp\d/.test(txt)) return 'notebook';
    return 'pcescritorio';
  }

  function ubicacionFromEmpresa(emp) {
    const m = clean(emp).match(/\(([^)]+)\)\s*$/);
    return m ? m[1].trim() : '';
  }

  function toEquipo(r, opts = {}) {
    const hostname = clean(String(r.equipo || '').split('\\').pop());
    const { marca, modelo } = parseMarcaModelo(r.fab, r.serie, r.codigo);
    const { serial, fallback } = parseSerial(r.serie, hostname);
    const auth = parseAuth(r.auth);
    const tipo = detectTipo(r);
    const ubic = ubicacionFromEmpresa(r.empresa) || opts.ubicacionDefault || '';
    const fecha = opts.fecha || new Date().toLocaleDateString('es-CL');
    const notas = [
      `Importado desde Soporte Remoto (${fecha})`,
      r.nombre && `Nombre: ${r.nombre}`,
      hostname && `Equipo (hostname): ${r.equipo}`,
      r.depto && `Departamento: ${r.depto}`,
      r.codigo && `Código: ${r.codigo}`,
      r.desc && `Descripción: ${r.desc}`,
      r.ipPub && `IP pública: ${r.ipPub}`,
      r.mac && `MAC: ${r.mac}`,
      fallback && 'Serial no disponible en el reporte (se usó el hostname)',
      auth.ambiguo && 'Credenciales: revisar formato (se guardó el texto completo en Usuario)',
    ].filter(Boolean).join('\n');
    return {
      tipo, marca, modelo, serial, estado: 'activo', empleadoId: null, ubicacion: ubic,
      fechaCompra: null, garantiaHasta: null, precioEstimado: null,
      procesador: parseCPU(r.cpu), ram: parseRAM(r.mem), disco: '', tarjetaVideo: '',
      tipoImpresion: '', consumibles: '', conectividad: '', imei: '', lineaTelefonica: '', tipoServidor: '', almacenamientoTotal: '',
      sistemaOperativo: parseOS(r.so), direccionIP: r.ipPriv || '',
      programasInstalados: [], unidadesRed: [], impresorasInstaladas: [],
      perTeclado: '', perMouse: '', perCamara: '', perAudifonos: '', perParlantes: '', perMonitor: '', perOtros: '',
      credUsuario: auth.usuario, credClave: auth.clave,
      notas,
      _meta: { hostname, nombre: r.nombre, empresa: r.empresa, serialFallback: fallback, authAmbiguo: auth.ambiguo },
    };
  }

  // Coincidencia aproximada entre el nombre de empresa del Excel y la empresa de SURTICORE
  function empresaMatches(excelName, surtiName) {
    const stop = new Set(['spa', 'ltda', 'limitada', 'sa', 'c', 'a', 'y', 'de', 'del', 'la', 'el', 'sede']);
    const toks = s => norm(s).replace(/\([^)]*\)/g, ' ').split(/[^a-z0-9&]+/).filter(t => t.length >= 3 && !stop.has(t));
    const a = new Set(toks(excelName)), b = toks(surtiName);
    if (!b.length) return false;
    const shared = b.filter(t => a.has(t)).length;
    return shared >= Math.min(2, b.length);
  }

  // Lee filas desde un workbook de SheetJS (corrige rangos mal declarados en el archivo)
  function rowsFromWorkbook(XLSX, wb) {
    const ws = wb.Sheets[wb.SheetNames[0]];
    let mr = 0, mc = 0;
    for (const k in ws) { if (k[0] === '!') continue; const a = XLSX.utils.decode_cell(k); if (a.r > mr) mr = a.r; if (a.c > mc) mc = a.c; }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: mr, c: mc } });
    return XLSX.utils.sheet_to_json(ws, { defval: '' }).map(mapRow).filter(r => r.nombre || r.equipo);
  }

  return { mapRow, toEquipo, parseAuth, parseOS, parseCPU, parseRAM, parseSerial, parseMarcaModelo, detectTipo, empresaMatches, rowsFromWorkbook, norm };
})();

if (typeof module !== 'undefined') module.exports = ImportParser;

// ===== UI =====
if (typeof window !== 'undefined') {
  const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  let importRows = [], importItems = [], importExisting = { serials: new Set(), hosts: new Set() };

  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = SHEETJS_URL;
      s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error('No se pudo cargar el lector de Excel'));
      document.head.appendChild(s);
    });
  }

  window.openImportModal = async function () {
    importRows = []; importItems = [];
    document.getElementById('importFile').value = '';
    document.getElementById('importStep2').style.display = 'none';
    document.getElementById('btnRunImport').disabled = true;
    document.getElementById('btnRunImport').innerHTML = '<i class="fas fa-file-import"></i> Importar';
    const locs = await DataManager.getUniqueLocations(empresaId);
    document.getElementById('importUbicacion').innerHTML = '<option value="">Sin asignar</option>' + locs.map(l => `<option>${escapeHtml(l)}</option>`).join('');
    openModal('modalImport');
    loadSheetJS().catch(e => showNotification(e.message, 'error'));
  };

  window.handleImportFile = async function (input) {
    const file = input.files && input.files[0]; if (!file) return;
    try {
      const XLSX = await loadSheetJS();
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      importRows = ImportParser.rowsFromWorkbook(XLSX, wb);
      if (!importRows.length) { showNotification('No se encontraron equipos en el archivo', 'error'); return; }
      const existing = await DataManager.getEquipos(empresaId);
      importExisting = {
        serials: new Set(existing.map(e => ImportParser.norm(e.serial)).filter(Boolean)),
        hosts: new Set(existing.map(e => ((e.notas || '').match(/Equipo \(hostname\): (.+)/) || [])[1]).filter(Boolean).map(h => ImportParser.norm(h.trim()))),
      };
      const emp = await DataManager.getEmpresa(empresaId);
      const groups = {};
      importRows.forEach(r => { const k = r.empresa || '(Sin empresa)'; groups[k] = (groups[k] || 0) + 1; });
      document.getElementById('importEmpresas').innerHTML = Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([name, n]) => {
        const checked = ImportParser.empresaMatches(name, emp ? emp.nombre : '') ? 'checked' : '';
        return `<label class="export-col-check ${checked ? 'checked' : ''}" style="justify-content:space-between"><span><input type="checkbox" class="import-emp" value="${escapeHtml(name).replace(/"/g, '&quot;')}" ${checked} onchange="this.parentElement.parentElement.classList.toggle('checked',this.checked);buildImportPreview()"> ${escapeHtml(name)}</span><b>${n}</b></label>`;
      }).join('');
      document.getElementById('importStep2').style.display = '';
      buildImportPreview();
    } catch (err) {
      console.error(err); showNotification('No se pudo leer el archivo: ' + err.message, 'error');
    }
  };

  window.buildImportPreview = function () {
    const sel = new Set([...document.querySelectorAll('.import-emp:checked')].map(c => c.value));
    const ubicacionDefault = document.getElementById('importUbicacion').value;
    importItems = importRows.filter(r => sel.has(r.empresa || '(Sin empresa)')).map(r => {
      const eq = ImportParser.toEquipo(r, { ubicacionDefault });
      const dup = (!eq._meta.serialFallback && importExisting.serials.has(ImportParser.norm(eq.serial))) ||
        (eq._meta.hostname && importExisting.hosts.has(ImportParser.norm(r.equipo)));
      return { eq, dup, include: !dup };
    });
    const tipoLbl = { pcescritorio: 'PC Escritorio', notebook: 'Notebook', servidor: 'Servidor' };
    const tbody = document.getElementById('importPreviewBody');
    tbody.innerHTML = importItems.length ? importItems.map((it, i) => {
      const e = it.eq, m = e._meta;
      const estado = it.dup ? '<span class="badge badge-warning" style="background:#f59e0b22;color:#f59e0b;padding:2px 8px;border-radius:10px;font-size:.75rem">Ya existe</span>' : '<span style="background:#22c55e22;color:#22c55e;padding:2px 8px;border-radius:10px;font-size:.75rem">Nuevo</span>';
      const warn = [m.serialFallback ? 'Serial = hostname' : '', m.authAmbiguo ? 'Revisar credenciales' : ''].filter(Boolean).join(' · ');
      return `<tr>
        <td><input type="checkbox" ${it.include ? 'checked' : ''} onchange="importItems[${i}].include=this.checked;updateImportCount()"></td>
        <td>${escapeHtml(m.nombre || m.hostname)}${warn ? `<div style="font-size:.7rem;color:#f59e0b">${warn}</div>` : ''}</td>
        <td>${tipoLbl[e.tipo] || e.tipo}</td>
        <td>${escapeHtml(e.marca)} ${escapeHtml(e.modelo)}</td>
        <td>${escapeHtml(e.serial)}</td>
        <td>${escapeHtml(e.credUsuario || '—')}${e.credClave ? ' <i class="fas fa-key" title="Con clave" style="color:var(--accent)"></i>' : ''}</td>
        <td>${escapeHtml(e.ubicacion || '—')}</td>
        <td>${estado}</td></tr>`;
    }).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--text-secondary);padding:20px">Selecciona al menos una empresa del archivo</td></tr>';
    updateImportCount();
  };
  // expone importItems para los onchange inline
  Object.defineProperty(window, 'importItems', { get: () => importItems, configurable: true });

  window.updateImportCount = function () {
    const n = importItems.filter(i => i.include).length;
    const btn = document.getElementById('btnRunImport');
    btn.disabled = n === 0;
    btn.innerHTML = `<i class="fas fa-file-import"></i> Importar ${n} equipo${n === 1 ? '' : 's'}`;
    document.getElementById('importSummary').textContent = `${importItems.length} equipos en las empresas seleccionadas · ${importItems.filter(i => i.dup).length} ya existen en SURTICORE`;
  };

  window.runImport = async function () {
    const items = importItems.filter(i => i.include);
    if (!items.length) return;
    if (!confirm(`¿Importar ${items.length} equipos a esta empresa?`)) return;
    const btn = document.getElementById('btnRunImport');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
    // Registrar ubicaciones nuevas (ej: Terreno / Oficina)
    const locs = await DataManager.getUniqueLocations(empresaId);
    for (const u of new Set(items.map(i => i.eq.ubicacion).filter(Boolean))) {
      if (!locs.includes(u)) await DataManager.addUbicacion(empresaId, u);
    }
    const payload = items.map(({ eq }) => { const { _meta, ...data } = eq; return { ...data, empresaId }; });
    const created = await DataManager.createEquiposBulk(payload, (done, total) => { btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${done}/${total}`; });
    await DataManager.logAudit('crear', 'equipo', null, `Importación Excel (${created} equipos)`, empresaId, { importados: created, origen: 'Soporte Remoto' });
    closeModal('modalImport');
    if (typeof renderKPIs === 'function') { await renderKPIs(); await loadFilters(); await loadSidebarLocations(); await applyFilters(); }
    showNotification(`${created} de ${payload.length} equipos importados`, created === payload.length ? 'success' : 'error');
  };
}
