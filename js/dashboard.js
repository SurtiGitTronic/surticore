// Dashboard Init
let currentView='table',currentSort={key:'fechaIngreso',dir:'desc'},currentPage=1,pageSize=10,filteredEquipos=[],empresaId=null,currentLocationFilter='';
let chartInstances = {};
let isAdminViewing = false;

document.addEventListener('DOMContentLoaded', async ()=>{
if(!AuthManager.requireAuth())return;
const s=AuthManager.getSession();

// Check if admin is visiting a specific empresa via URL param
const urlParams = new URLSearchParams(window.location.search);
const paramEmpresaId = urlParams.get('empresaId');

if(s.rol==='admin'){
  if(!paramEmpresaId){window.location.href='admin.html';return;}
  // Admin is visiting a specific empresa's dashboard
  isAdminViewing = true;
  empresaId = paramEmpresaId;
  // Show back-to-admin button
  const backBtn = document.getElementById('btnBackToAdmin');
  if(backBtn) backBtn.style.display = '';
  // Grant full permissions for admin viewing
  document.getElementById('btnAddEquipo').style.display='';
  document.getElementById('btnAddPersonal').style.display='';
  const btnManageLocs = document.getElementById('btnManageLocs');
  if(btnManageLocs) btnManageLocs.style.display = 'block';
  // Show Soporte Remoto for admin
  const navSoporte = document.getElementById('nav-soporte-remoto');
  if(navSoporte) navSoporte.style.display = '';
} else {
  empresaId=s.empresaId;
  if(s.permisos && s.permisos.canManageUbicaciones) {
    const btn = document.getElementById('btnManageLocs');
    if(btn) btn.style.display = 'block';
  }
  // Show Soporte Remoto if user has permission
  if(s.permisos && s.permisos.canSoporteRemoto) {
    const navSoporte = document.getElementById('nav-soporte-remoto');
    if(navSoporte) navSoporte.style.display = '';
  }
  if(AuthManager.canCreate()){document.getElementById('btnAddEquipo').style.display='';document.getElementById('btnAddPersonal').style.display='';}
}

document.getElementById('userName').textContent=s.nombre;
const emp=await DataManager.getEmpresa(empresaId);
if(emp){
  document.getElementById('sidebarCompany').textContent=emp.nombre;
  document.getElementById('printCompany').textContent=emp.nombre;
  
  const sidebarUserName = document.getElementById('sidebarUserName');
  if(sidebarUserName) sidebarUserName.textContent = s.nombre;
  const sidebarUserCargo = document.getElementById('sidebarUserCargo');
  if(sidebarUserCargo) sidebarUserCargo.textContent = isAdminViewing ? 'Administrador' : (s.cargo || 'Cliente');
  if(emp.logo){document.getElementById('sidebarLogo').src=emp.logo;document.getElementById('sidebarLogo').style.display='block';document.getElementById('printLogo').src=emp.logo;}
  if(emp.colorPrimario)applyCompanyTheme(emp.colorPrimario);
  const label = emp.etiquetaUbicacion || 'Sedes';
  document.getElementById('navUbicacionesTitle').textContent = label;
}
document.getElementById('printDate').textContent=new Date().toLocaleDateString('es-CL');
await loadUbicacionesSelects();await loadFilters();await loadSidebarLocations();await renderKPIs();await applyFilters();await renderPersonal();
await renderExecutiveDashboard();
});

async function loadSidebarLocations() {
  const locs = await DataManager.getUniqueLocations(empresaId);
  const container = document.getElementById('navUbicacionesContainer');
  const list = document.getElementById('navUbicacionesList');
  if(locs.length > 0) {
    container.style.display = 'block';
    list.innerHTML = locs.map(l => `
      <div class="sidebar__location-item">
        <a href="#" class="sidebar__link" onclick="toggleLocationSubmenu('${l.replace(/'/g, "\\'")}', this)">
          <i class="fas fa-map-marker-alt"></i> ${l} <i class="fas fa-chevron-down" style="margin-left:auto;font-size:0.7rem"></i>
        </a>
        <div class="sidebar__submenu" id="submenu-${l.replace(/\s+/g, '-')}" style="display:none; padding-left:24px; font-size:0.9rem">
          <a href="#" class="sidebar__link" style="padding: 6px 12px; margin-bottom: 2px" onclick="selectLocationSection('${l.replace(/'/g, "\\'")}', 'equipos', this)">Equipos</a>
          <a href="#" class="sidebar__link" style="padding: 6px 12px; margin-bottom: 2px" onclick="selectLocationSection('${l.replace(/'/g, "\\'")}', 'personal', this)">Personal</a>
        </div>
      </div>
    `).join('');
  } else {
    container.style.display = 'none';
  }
}

async function loadUbicacionesSelects() {
  const locs = await DataManager.getUniqueLocations(empresaId);
  const opts = '<option value="">Sin asignar</option>' + locs.map(l => `<option value="${l}">${l}</option>`).join('');
  const eSel = document.getElementById('eqUbicacion');
  const pSel = document.getElementById('perUbicacion');
  if(eSel) eSel.innerHTML = opts;
  if(pSel) pSel.innerHTML = opts;
}

async function loadFilters(){
const brands=await DataManager.getUniqueBrands(empresaId),locs=await DataManager.getUniqueLocations(empresaId),personal=await DataManager.getPersonal(empresaId);
const bSel=document.getElementById('filterMarca'),lSel=document.getElementById('filterUbicacion'),eSel=document.getElementById('filterEmpleado'),eqSel=document.getElementById('eqEmpleado');
bSel.innerHTML='<option value="">Todas las marcas</option>'+brands.map(b=>`<option>${b}</option>`).join('');
lSel.innerHTML='<option value="">Todas las ubicaciones</option>'+locs.map(l=>`<option>${l}</option>`).join('');
eSel.innerHTML='<option value="">Todos</option>'+personal.map(p=>`<option value="${p.id}">${p.nombre} ${p.apellido}</option>`).join('');
eqSel.innerHTML='<option value="">Sin asignar</option>'+personal.map(p=>`<option value="${p.id}">${p.nombre} ${p.apellido} — ${p.cargo||''}</option>`).join('');
}

async function renderKPIs(){
const st=await DataManager.getStats(empresaId);
document.getElementById('kpiGrid').innerHTML=`
<div class="kpi-card kpi-purple"><div class="kpi-card__icon purple"><i class="fas fa-desktop"></i></div><div class="kpi-card__value">${st.pcescritorio}</div><div class="kpi-card__label">PC Escritorio</div></div>
<div class="kpi-card kpi-blue"><div class="kpi-card__icon blue"><i class="fas fa-laptop"></i></div><div class="kpi-card__value">${st.notebooks}</div><div class="kpi-card__label">Notebooks</div></div>
<div class="kpi-card kpi-orange"><div class="kpi-card__icon orange"><i class="fas fa-print"></i></div><div class="kpi-card__value">${st.impresoras}</div><div class="kpi-card__label">Impresoras</div></div>
<div class="kpi-card kpi-green"><div class="kpi-card__icon green"><i class="fas fa-mobile-screen"></i></div><div class="kpi-card__value">${st.celulares}</div><div class="kpi-card__label">Celulares</div></div>
<div class="kpi-card kpi-blue"><div class="kpi-card__icon blue"><i class="fas fa-tablet-screen-button"></i></div><div class="kpi-card__value">${st.tablets}</div><div class="kpi-card__label">Tablets</div></div>
<div class="kpi-card kpi-red"><div class="kpi-card__icon red"><i class="fas fa-server"></i></div><div class="kpi-card__value">${st.servidores}</div><div class="kpi-card__label">Servidores</div></div>`;
}

async function applyFilters(){
const f={search:document.getElementById('searchInput').value,tipo:document.getElementById('filterTipo').value,marca:document.getElementById('filterMarca').value,estado:document.getElementById('filterEstado').value,empleadoId:document.getElementById('filterEmpleado').value,ubicacion:document.getElementById('filterUbicacion').value,fechaDesde:document.getElementById('filterFechaDesde').value,fechaHasta:document.getElementById('filterFechaHasta').value};
filteredEquipos=await DataManager.searchEquipos(empresaId,f);
await sortEquipos();currentPage=1;renderEquipos();
}
const handleSearch=debounce(()=>applyFilters(),300);

function clearFilters(){
['searchInput','filterTipo','filterMarca','filterEstado','filterEmpleado','filterUbicacion','filterFechaDesde','filterFechaHasta'].forEach(id=>document.getElementById(id).value='');
applyFilters();
}

async function sortBy(key){
if(currentSort.key===key)currentSort.dir=currentSort.dir==='asc'?'desc':'asc';
else{currentSort.key=key;currentSort.dir='asc';}
document.querySelectorAll('th').forEach(t=>{t.classList.remove('sorted-asc','sorted-desc');});
await sortEquipos();renderEquipos();
}

async function sortEquipos(){
const{key,dir}=currentSort;
const personal = await DataManager.getPersonal(empresaId);
const pMap = new Map(personal.map(p => [p.id, `${p.nombre} ${p.apellido}`.toLowerCase()]));

filteredEquipos.sort((a,b)=>{
let va,vb;
if(key==='empleado'){va=a.empleadoId?pMap.get(a.empleadoId)||'':'';vb=b.empleadoId?pMap.get(b.empleadoId)||'':'';}
else{va=a[key]||'';vb=b[key]||'';}
if(typeof va==='string')va=va.toLowerCase();
if(typeof vb==='string')vb=vb.toLowerCase();
if(va<vb)return dir==='asc'?-1:1;if(va>vb)return dir==='asc'?1:-1;return 0;
});
}

function renderEquipos(){
if(currentView==='table')renderTable();else renderCards();
}

async function renderTable(){
const start=(currentPage-1)*pageSize,end=start+pageSize,page=filteredEquipos.slice(start,end);
const tbody=document.getElementById('equiposTableBody');
if(page.length===0){tbody.innerHTML=`<tr><td colspan="8"><div class="table-empty"><i class="fas fa-box-open"></i><p>No se encontraron equipos</p></div></td></tr>`;
}else{
const personal = await DataManager.getPersonal(empresaId);
const pMap = new Map(personal.map(p => [p.id, p]));
tbody.innerHTML=page.map(e=>{
const emp=e.empleadoId?pMap.get(e.empleadoId):null;
const empName=emp?`${emp.nombre} ${emp.apellido}`:'Sin asignar';
const empCargo=emp?emp.cargo:'';
return`<tr>
<td data-label="Tipo"><div class="td-type"><i class="fas ${getEquipmentIcon(e.tipo)}"></i>${e.tipo}</div></td>
<td data-label="Equipo">${e.marca} ${e.modelo}</td>
<td data-label="Serial">${e.serial}</td>
<td data-label="Asignado a"><div class="td-employee"><strong>${empName}</strong><span>${empCargo}</span></div></td>
<td data-label="Ubicación">${e.ubicacion||'—'}</td>
<td data-label="Estado">${getStatusBadge(e.estado)}</td>
<td data-label="Ingreso">${formatDate(e.fechaIngreso)}</td>
<td class="td-actions" data-label="">
<button class="btn-icon" onclick="viewEquipo('${e.id}')" title="Ver detalle"><i class="fas fa-eye"></i></button>
${AuthManager.canCreate()?`<button class="btn-icon" onclick="duplicateEquipo('${e.id}')" title="Duplicar"><i class="fas fa-copy"></i></button>`:''}
${AuthManager.canEdit()?`<button class="btn-icon" onclick="openEquipoModal('${e.id}')" title="Editar"><i class="fas fa-edit"></i></button>`:''}
${AuthManager.canDelete()?`<button class="btn-icon btn-danger-icon" onclick="deleteEquipo('${e.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>`:''}
</td></tr>`;}).join('');
}
renderPagination();
}

async function renderCards(){
const cv=document.getElementById('cardsView');
if(filteredEquipos.length===0){cv.innerHTML='<div class="table-empty"><i class="fas fa-box-open"></i><p>No se encontraron equipos</p></div>';return;}
const personal = await DataManager.getPersonal(empresaId);
const pMap = new Map(personal.map(p => [p.id, p]));
cv.innerHTML=filteredEquipos.map(e=>{
const emp=e.empleadoId?pMap.get(e.empleadoId):null;
const empName=emp?`${emp.nombre} ${emp.apellido}`:'Sin asignar';
return`<div class="equipo-card" onclick="viewEquipo('${e.id}')">
<div class="equipo-card__header"><div class="equipo-card__icon"><i class="fas ${getEquipmentIcon(e.tipo)}"></i></div>
<div class="equipo-card__title"><h4>${e.marca} ${e.modelo}</h4><span>${e.serial}</span></div></div>
<div class="equipo-card__details">
<div class="equipo-card__detail"><label>Asignado:</label><span>${empName}</span></div>
<div class="equipo-card__detail"><label>Ubicación:</label><span>${e.ubicacion||'—'}</span></div>
<div class="equipo-card__detail"><label>IP:</label><span>${e.direccionIP||'—'}</span></div>
</div>
<div class="equipo-card__footer">${getStatusBadge(e.estado)}<span style="font-size:.75rem;color:var(--text-secondary)">${formatDate(e.fechaIngreso)}</span></div>
</div>`;}).join('');
}

function renderPagination(){
const total=filteredEquipos.length,pages=Math.ceil(total/pageSize);
const pg=document.getElementById('pagination');
if(pages<=1){pg.innerHTML=`<span>${total} equipo(s)</span><span></span>`;return;}
let btns='';for(let i=1;i<=pages;i++)btns+=`<button class="${i===currentPage?'active':''}" onclick="goToPage(${i})">${i}</button>`;
pg.innerHTML=`<span>${total} equipo(s) — Página ${currentPage} de ${pages}</span><div class="pagination__btns"><button onclick="goToPage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>${btns}<button onclick="goToPage(${currentPage+1})" ${currentPage===pages?'disabled':''}><i class="fas fa-chevron-right"></i></button></div>`;
}
function goToPage(p){currentPage=p;renderTable();}

function setView(v,btn){
currentView=v;
document.querySelectorAll('.view-toggle button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
document.getElementById('tableView').style.display=v==='table'?'':'none';
document.getElementById('cardsView').style.display=v==='cards'?'':'none';
renderEquipos();
}

// === EQUIPO CRUD ===
let currentDetailEquipoId = null;

async function viewEquipo(id){
currentDetailEquipoId = id;
const e=await DataManager.getEquipo(id);if(!e)return;
const emp=e.empleadoId ? await DataManager.getEmpleado(e.empleadoId) : null;
const empName=emp?`${emp.nombre} ${emp.apellido}`:'Sin asignar';
document.getElementById('detailTitle').textContent=`${e.marca} ${e.modelo}`;
if(AuthManager.canEdit())document.getElementById('detailEditBtn').style.display='';
if(AuthManager.canCreate())document.getElementById('detailDuplicateBtn').style.display='';
document.getElementById('detailEditBtn').onclick=()=>{closeModal('modalDetail');openEquipoModal(id);};

document.getElementById('detail-general').innerHTML=`<div class="detail-grid">
<div class="detail-item"><label>Tipo</label><span>${e.tipo}</span></div>
<div class="detail-item"><label>Estado</label><span>${getStatusBadge(e.estado)}</span></div>
<div class="detail-item"><label>Marca</label><span>${e.marca}</span></div>
<div class="detail-item"><label>Modelo</label><span>${e.modelo}</span></div>
<div class="detail-item"><label>Serial</label><span>${e.serial}</span></div>
<div class="detail-item"><label>Asignado a</label><span>${empName}${emp?' — '+emp.cargo:''}</span></div>
<div class="detail-item"><label>Ubicación</label><span>${e.ubicacion||'—'}</span></div>
<div class="detail-item"><label>Fecha Ingreso</label><span>${formatDateTime(e.fechaIngreso)}</span></div>
<div class="detail-item"><label>Fecha Compra</label><span>${formatDate(e.fechaCompra)}</span></div>
<div class="detail-item"><label>Garantía Hasta</label><span>${formatDate(e.garantiaHasta)}</span></div>
<div class="detail-item"><label>Precio Promedio</label><span>${e.precioEstimado ? `$${parseFloat(e.precioEstimado).toLocaleString()}` : '—'}</span></div></div>`;

document.getElementById('detail-hardware').innerHTML=`<div class="detail-grid">
${e.procesador?`<div class="detail-item"><label>Procesador</label><span>${e.procesador}</span></div>`:''}
${e.ram?`<div class="detail-item"><label>RAM</label><span>${e.ram}</span></div>`:''}
${e.disco?`<div class="detail-item"><label>Disco</label><span>${e.disco}</span></div>`:''}
${e.tarjetaVideo?`<div class="detail-item"><label>Tarjeta de Video</label><span>${e.tarjetaVideo}</span></div>`:''}
${e.tipoImpresion?`<div class="detail-item"><label>Tipo Impresión</label><span>${e.tipoImpresion}</span></div>`:''}
${e.consumibles?`<div class="detail-item"><label>Consumibles</label><span>${e.consumibles}</span></div>`:''}
${e.conectividad?`<div class="detail-item"><label>Conectividad</label><span>${e.conectividad}</span></div>`:''}
${e.imei?`<div class="detail-item"><label>IMEI</label><span>${e.imei}</span></div>`:''}
${e.lineaTelefonica?`<div class="detail-item"><label>Línea</label><span>${e.lineaTelefonica}</span></div>`:''}
${e.tipoServidor?`<div class="detail-item"><label>Tipo Servidor</label><span>${e.tipoServidor}</span></div>`:''}
${e.almacenamientoTotal?`<div class="detail-item"><label>Almacenamiento</label><span>${e.almacenamientoTotal}</span></div>`:''}
</div>`;

const os=e.sistemaOperativo?`${e.sistemaOperativo.nombre||''} ${e.sistemaOperativo.version||''}`:'—';
const progs=(e.programasInstalados||[]).map(p=>`<div class="detail-list-item"><span>${p.nombre}</span><span>${p.version||''}</span></div>`).join('')||'<p style="color:var(--text-secondary);font-size:.85rem">Sin programas registrados</p>';
const units=(e.unidadesRed||[]).map(u=>`<div class="detail-list-item"><span>${u.letra}</span><span>${u.ruta}</span></div>`).join('')||'<p style="color:var(--text-secondary);font-size:.85rem">Sin unidades de red</p>';
const prints=(e.impresorasInstaladas||[]).map(p=>`<div class="detail-list-item"><span>${p.nombre} (${p.tipo})</span><span>${p.ip||''}</span></div>`).join('')||'<p style="color:var(--text-secondary);font-size:.85rem">Sin impresoras</p>';
document.getElementById('detail-software').innerHTML=`
<div class="detail-grid" style="margin-bottom:20px"><div class="detail-item"><label>Sistema Operativo</label><span>${os}</span></div><div class="detail-item"><label>Dirección IP</label><span>${e.direccionIP||'—'}</span></div></div>
<div class="detail-section"><h4><i class="fas fa-box"></i> Programas Instalados</h4><div class="detail-list">${progs}</div></div>
<div class="detail-section"><h4><i class="fas fa-folder"></i> Unidades de Red</h4><div class="detail-list">${units}</div></div>
<div class="detail-section"><h4><i class="fas fa-print"></i> Impresoras Instaladas</h4><div class="detail-list">${prints}</div></div>`;

if(e.tipo === 'impresora') {
  document.getElementById('detailTabSoftwareBtn').style.display='none';
} else {
  document.getElementById('detailTabSoftwareBtn').style.display='';
}

if(e.tipo === 'pcescritorio' || e.tipo === 'notebook' || e.tipo === 'computador') {
  document.getElementById('detailTabPerifericosBtn').style.display='';
  document.getElementById('detail-perifericos').innerHTML=`<div class="detail-grid">
  <div class="detail-item"><label>Teclado</label><span>${e.perTeclado||'—'}</span></div>
  <div class="detail-item"><label>Mouse</label><span>${e.perMouse||'—'}</span></div>
  <div class="detail-item"><label>Cámara WEB</label><span>${e.perCamara||'—'}</span></div>
  <div class="detail-item"><label>Audífonos</label><span>${e.perAudifonos||'—'}</span></div>
  <div class="detail-item"><label>Parlantes</label><span>${e.perParlantes||'—'}</span></div>
  <div class="detail-item"><label>Monitor</label><span>${e.perMonitor||'—'}</span></div>
  <div class="detail-item" style="grid-column:1/-1"><label>Otros</label><span>${e.perOtros||'—'}</span></div>
  </div>`;
} else {
  document.getElementById('detailTabPerifericosBtn').style.display='none';
}

document.getElementById('detail-notas').innerHTML=`<p style="white-space:pre-wrap;font-size:.9rem">${e.notas||'Sin notas'}</p>`;
// Reset to first tab
document.querySelectorAll('#modalDetail .tab-btn').forEach((t,i)=>{t.classList.toggle('active',i===0);});
document.querySelectorAll('#modalDetail .tab-content').forEach((c,i)=>{c.classList.toggle('active',i===0);});
openModal('modalDetail');
}

async function openEquipoModal(id){
const isEdit=!!id;
document.getElementById('equipoModalTitle').textContent=isEdit?'Editar Equipo':'Agregar Equipo';
document.getElementById('equipoForm').reset();document.getElementById('equipoId').value='';
// Reset tabs
document.querySelectorAll('#modalEquipo .tab-btn').forEach((t,i)=>t.classList.toggle('active',i===0));
document.querySelectorAll('#modalEquipo .tab-content').forEach((c,i)=>c.classList.toggle('active',i===0));
await loadFilters();
if(isEdit){
const e=await DataManager.getEquipo(id);if(!e)return;
document.getElementById('equipoId').value=e.id;
document.getElementById('eqTipo').value=e.tipo;document.getElementById('eqEstado').value=e.estado;
document.getElementById('eqMarca').value=e.marca;document.getElementById('eqModelo').value=e.modelo;
document.getElementById('eqSerial').value=e.serial;document.getElementById('eqEmpleado').value=e.empleadoId||'';
document.getElementById('eqUbicacion').value=e.ubicacion||'';document.getElementById('eqFechaCompra').value=e.fechaCompra||'';
document.getElementById('eqGarantia').value=e.garantiaHasta||'';document.getElementById('eqProcesador').value=e.procesador||'';
document.getElementById('eqRam').value=e.ram||'';document.getElementById('eqDisco').value=e.disco||'';
document.getElementById('eqPrecio').value=e.precioEstimado||'';
document.getElementById('eqTarjetaVideo').value=e.tarjetaVideo||'';
document.getElementById('eqTipoImpresion').value=e.tipoImpresion||'';
document.getElementById('eqConsumibles').value=e.consumibles||'';
document.getElementById('eqConectividad').value=e.conectividad||'';document.getElementById('eqImei').value=e.imei||'';
document.getElementById('eqLinea').value=e.lineaTelefonica||'';document.getElementById('eqTipoServidor').value=e.tipoServidor||'';
document.getElementById('eqAlmTotal').value=e.almacenamientoTotal||'';
document.getElementById('eqOS').value=e.sistemaOperativo?e.sistemaOperativo.nombre:'';
document.getElementById('eqOSVersion').value=e.sistemaOperativo?e.sistemaOperativo.version:'';
document.getElementById('eqIP').value=e.direccionIP||'';document.getElementById('eqNotas').value=e.notas||'';
document.getElementById('eqPerTeclado').value=e.perTeclado||'';document.getElementById('eqPerMouse').value=e.perMouse||'';
document.getElementById('eqPerCamara').value=e.perCamara||'';document.getElementById('eqPerAudifonos').value=e.perAudifonos||'';
document.getElementById('eqPerParlantes').value=e.perParlantes||'';document.getElementById('eqPerMonitor').value=e.perMonitor||'';
document.getElementById('eqPerOtros').value=e.perOtros||'';
createDynamicList('listProgramas',[{key:'nombre',placeholder:'Programa'},{key:'version',placeholder:'Versión'}],e.programasInstalados||[]);
createDynamicList('listUnidades',[{key:'letra',placeholder:'Letra (Z:)'},{key:'ruta',placeholder:'Ruta (\\\\server\\share)'}],e.unidadesRed||[]);
createDynamicList('listImpresoras',[{key:'nombre',placeholder:'Nombre'},{key:'tipo',placeholder:'Tipo (red/usb)'},{key:'ip',placeholder:'IP'}],e.impresorasInstaladas||[]);
}else{
createDynamicList('listProgramas',[{key:'nombre',placeholder:'Programa'},{key:'version',placeholder:'Versión'}],[]);
createDynamicList('listUnidades',[{key:'letra',placeholder:'Letra (Z:)'},{key:'ruta',placeholder:'Ruta (\\\\server\\share)'}],[]);
createDynamicList('listImpresoras',[{key:'nombre',placeholder:'Nombre'},{key:'tipo',placeholder:'Tipo (red/usb)'},{key:'ip',placeholder:'IP'}],[]);
}
toggleTypeFields();openModal('modalEquipo');
}

function toggleTypeFields(){
const t=document.getElementById('eqTipo').value;
document.getElementById('pcFields').style.display=(t==='pcescritorio'||t==='notebook'||t==='servidor'||t==='computador')?'':'none';
document.getElementById('printerFields').style.display=t==='impresora'?'':'none';
document.getElementById('phoneFields').style.display=(t==='celular'||t==='tablet')?'':'none';
document.getElementById('serverFields').style.display=t==='servidor'?'':'none';
document.getElementById('tabPerifericosBtn').style.display=(t==='pcescritorio'||t==='notebook'||t==='computador')?'':'none';
document.getElementById('tabSoftwareBtn').style.display=t==='impresora'?'none':'';
}

async function saveEquipo(e){
e.preventDefault();const id=document.getElementById('equipoId').value;
const _v=v=>v||null; // Convert empty strings to null for DB compatibility
const data={empresaId,tipo:document.getElementById('eqTipo').value,marca:document.getElementById('eqMarca').value,modelo:document.getElementById('eqModelo').value,serial:document.getElementById('eqSerial').value,estado:document.getElementById('eqEstado').value,empleadoId:_v(document.getElementById('eqEmpleado').value),ubicacion:document.getElementById('eqUbicacion').value,fechaCompra:_v(document.getElementById('eqFechaCompra').value),garantiaHasta:_v(document.getElementById('eqGarantia').value),precioEstimado:document.getElementById('eqPrecio').value?parseFloat(document.getElementById('eqPrecio').value):null,procesador:document.getElementById('eqProcesador').value,ram:document.getElementById('eqRam').value,disco:document.getElementById('eqDisco').value,tarjetaVideo:document.getElementById('eqTarjetaVideo').value,tipoImpresion:document.getElementById('eqTipoImpresion').value,consumibles:document.getElementById('eqConsumibles').value,conectividad:document.getElementById('eqConectividad').value,imei:document.getElementById('eqImei').value,lineaTelefonica:document.getElementById('eqLinea').value,tipoServidor:document.getElementById('eqTipoServidor').value,almacenamientoTotal:document.getElementById('eqAlmTotal').value,sistemaOperativo:{nombre:document.getElementById('eqOS').value,version:document.getElementById('eqOSVersion').value},direccionIP:document.getElementById('eqIP').value,programasInstalados:getListItems('listProgramas').filter(p=>p.nombre),unidadesRed:getListItems('listUnidades').filter(u=>u.letra),impresorasInstaladas:getListItems('listImpresoras').filter(p=>p.nombre),notas:document.getElementById('eqNotas').value, perTeclado:document.getElementById('eqPerTeclado').value, perMouse:document.getElementById('eqPerMouse').value, perCamara:document.getElementById('eqPerCamara').value, perAudifonos:document.getElementById('eqPerAudifonos').value, perParlantes:document.getElementById('eqPerParlantes').value, perMonitor:document.getElementById('eqPerMonitor').value, perOtros:document.getElementById('eqPerOtros').value};
if(id){await DataManager.updateEquipo(id,data);await DataManager.logAudit('editar','equipo',id,`${data.marca} ${data.modelo}`,empresaId,{serial:data.serial,tipo:data.tipo});}else{const created=await DataManager.createEquipo(data);await DataManager.logAudit('crear','equipo',created?created.id:null,`${data.marca} ${data.modelo}`,empresaId,{serial:data.serial,tipo:data.tipo});}
closeModal('modalEquipo');await renderKPIs();await loadFilters();await loadSidebarLocations();await applyFilters();
showNotification(id?'Equipo actualizado':'Equipo agregado','success');
}

async function deleteEquipo(id){if(!confirm('¿Eliminar este equipo?'))return;const eq=await DataManager.getEquipo(id);await DataManager.deleteEquipo(id);await DataManager.logAudit('eliminar','equipo',id,eq?`${eq.marca} ${eq.modelo}`:'',empresaId,{serial:eq?eq.serial:''});await renderKPIs();await loadFilters();await applyFilters();showNotification('Equipo eliminado','success');}
function editFromDetail(){const id=document.getElementById('equipoId').value;closeModal('modalDetail');openEquipoModal(id);}

// === DUPLICATE EQUIPO ===
async function duplicateEquipo(id){
  const original = await DataManager.getEquipo(id);
  if(!original) return;
  // Open the modal as "new" (no id) so it creates a new record
  document.getElementById('equipoModalTitle').textContent='Duplicar Equipo';
  document.getElementById('equipoForm').reset();
  document.getElementById('equipoId').value='';
  // Reset tabs
  document.querySelectorAll('#modalEquipo .tab-btn').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.querySelectorAll('#modalEquipo .tab-content').forEach((c,i)=>c.classList.toggle('active',i===0));
  await loadFilters();
  // Pre-fill all fields from original, except serial and empleado
  document.getElementById('eqTipo').value=original.tipo;
  document.getElementById('eqEstado').value=original.estado;
  document.getElementById('eqMarca').value=original.marca;
  document.getElementById('eqModelo').value=original.modelo;
  document.getElementById('eqSerial').value=''; // Leave empty — unique per device
  document.getElementById('eqEmpleado').value=''; // Leave empty — user assigns new person
  document.getElementById('eqUbicacion').value=original.ubicacion||'';
  document.getElementById('eqFechaCompra').value=original.fechaCompra||'';
  document.getElementById('eqGarantia').value=original.garantiaHasta||'';
  document.getElementById('eqProcesador').value=original.procesador||'';
  document.getElementById('eqRam').value=original.ram||'';
  document.getElementById('eqDisco').value=original.disco||'';
  document.getElementById('eqPrecio').value=original.precioEstimado||'';
  document.getElementById('eqTarjetaVideo').value=original.tarjetaVideo||'';
  document.getElementById('eqTipoImpresion').value=original.tipoImpresion||'';
  document.getElementById('eqConsumibles').value=original.consumibles||'';
  document.getElementById('eqConectividad').value=original.conectividad||'';
  document.getElementById('eqImei').value='';
  document.getElementById('eqLinea').value=original.lineaTelefonica||'';
  document.getElementById('eqTipoServidor').value=original.tipoServidor||'';
  document.getElementById('eqAlmTotal').value=original.almacenamientoTotal||'';
  document.getElementById('eqOS').value=original.sistemaOperativo?original.sistemaOperativo.nombre:'';
  document.getElementById('eqOSVersion').value=original.sistemaOperativo?original.sistemaOperativo.version:'';
  document.getElementById('eqIP').value='';
  document.getElementById('eqNotas').value=original.notas||'';
  document.getElementById('eqPerTeclado').value=original.perTeclado||'';
  document.getElementById('eqPerMouse').value=original.perMouse||'';
  document.getElementById('eqPerCamara').value=original.perCamara||'';
  document.getElementById('eqPerAudifonos').value=original.perAudifonos||'';
  document.getElementById('eqPerParlantes').value=original.perParlantes||'';
  document.getElementById('eqPerMonitor').value=original.perMonitor||'';
  document.getElementById('eqPerOtros').value=original.perOtros||'';
  createDynamicList('listProgramas',[{key:'nombre',placeholder:'Programa'},{key:'version',placeholder:'Versión'}],original.programasInstalados||[]);
  createDynamicList('listUnidades',[{key:'letra',placeholder:'Letra (Z:)'},{key:'ruta',placeholder:'Ruta (\\\\server\\share)'}],original.unidadesRed||[]);
  createDynamicList('listImpresoras',[{key:'nombre',placeholder:'Nombre'},{key:'tipo',placeholder:'Tipo (red/usb)'},{key:'ip',placeholder:'IP'}],original.impresorasInstaladas||[]);
  toggleTypeFields();
  openModal('modalEquipo');
  showNotification('Equipo duplicado — complete el serial y asigne persona','info');
}

function duplicateFromDetail(){
  closeModal('modalDetail');
  if(currentDetailEquipoId) duplicateEquipo(currentDetailEquipoId);
}

// === PERSONAL ===
async function renderPersonal(search){
let personal=await DataManager.getPersonal(empresaId);
if(currentLocationFilter){personal=personal.filter(p=>p.ubicacion===currentLocationFilter);}
if(search){const s=search.toLowerCase();personal=personal.filter(p=>`${p.nombre} ${p.apellido} ${p.cargo} ${p.departamento}`.toLowerCase().includes(s));}
const tbody=document.getElementById('personalTableBody');
if(!personal.length){tbody.innerHTML='<tr><td colspan="8"><div class="table-empty"><i class="fas fa-users"></i><p>No hay personal registrado</p></div></td></tr>';return;}
const equipos = await DataManager.getEquipos(empresaId);
const eqMap = equipos.reduce((acc, eq) => { if(eq.empleadoId) acc[eq.empleadoId] = (acc[eq.empleadoId] || 0) + 1; return acc; }, {});
tbody.innerHTML=personal.map(p=>{
const eqCount = eqMap[p.id] || 0;
return`<tr>
<td data-label="Nombre">${p.nombre}</td><td data-label="Apellido">${p.apellido}</td><td data-label="Cargo">${p.cargo||'—'}</td><td data-label="Departamento">${p.departamento||'—'}</td><td data-label="Email">${p.email||'—'}</td><td data-label="Teléfono">${p.telefono||'—'}</td>
<td data-label="Equipos"><button class="btn btn-sm btn-outline" onclick="viewEmpleadoEquipos('${p.id}')"><i class="fas fa-laptop"></i> ${eqCount}</button></td>
<td class="td-actions" data-label="">
${AuthManager.canEdit()?`<button class="btn-icon" onclick="openPersonalModal('${p.id}')"><i class="fas fa-edit"></i></button>`:''}
${AuthManager.canDelete()?`<button class="btn-icon btn-danger-icon" onclick="deletePersonal('${p.id}')"><i class="fas fa-trash"></i></button>`:''}
</td></tr>`;}).join('');
}
const handleSearchPersonal=debounce(()=>renderPersonal(document.getElementById('searchPersonal').value),300);

async function openPersonalModal(id){
document.getElementById('personalModalTitle').textContent=id?'Editar Personal':'Agregar Personal';
document.getElementById('personalForm').reset();document.getElementById('personalId').value='';
if(id){const p=await DataManager.getEmpleado(id);if(!p)return;document.getElementById('personalId').value=p.id;document.getElementById('perNombre').value=p.nombre;document.getElementById('perApellido').value=p.apellido;document.getElementById('perCargo').value=p.cargo||'';document.getElementById('perDepto').value=p.departamento||'';document.getElementById('perEmail').value=p.email||'';document.getElementById('perTelefono').value=p.telefono||'';document.getElementById('perUbicacion').value=p.ubicacion||'';}
openModal('modalPersonal');
}

async function savePersonal(e){
e.preventDefault();const id=document.getElementById('personalId').value;
const data={empresaId,nombre:document.getElementById('perNombre').value,apellido:document.getElementById('perApellido').value,cargo:document.getElementById('perCargo').value,departamento:document.getElementById('perDepto').value,email:document.getElementById('perEmail').value,telefono:document.getElementById('perTelefono').value,ubicacion:document.getElementById('perUbicacion').value,activo:true};
if(id){await DataManager.updateEmpleado(id,data);await DataManager.logAudit('editar','personal',id,`${data.nombre} ${data.apellido}`,empresaId,{cargo:data.cargo});}else{const created=await DataManager.createEmpleado(data);await DataManager.logAudit('crear','personal',created?created.id:null,`${data.nombre} ${data.apellido}`,empresaId,{cargo:data.cargo});}
closeModal('modalPersonal');await renderPersonal();await loadFilters();await loadSidebarLocations();
showNotification(id?'Personal actualizado':'Personal agregado','success');
}

async function deletePersonal(id){if(!confirm('¿Eliminar este empleado? Los equipos asignados quedarán sin asignar.'))return;const emp=await DataManager.getEmpleado(id);await DataManager.deleteEmpleado(id);await DataManager.logAudit('eliminar','personal',id,emp?`${emp.nombre} ${emp.apellido}`:'',empresaId);await renderPersonal();await loadFilters();await applyFilters();showNotification('Personal eliminado','success');}

async function viewEmpleadoEquipos(id){
const emp=await DataManager.getEmpleado(id),eqs=await DataManager.getEquiposByEmpleado(id);
document.getElementById('empleadoEquiposTitle').textContent=`Equipos de ${emp.nombre} ${emp.apellido}`;
if(!eqs.length){document.getElementById('empleadoEquiposBody').innerHTML='<div class="table-empty"><i class="fas fa-box-open"></i><p>No tiene equipos asignados</p></div>';}
else{document.getElementById('empleadoEquiposBody').innerHTML='<div class="table-wrapper"><table><thead><tr><th>Tipo</th><th>Equipo</th><th>Serial</th><th>Estado</th><th>Ubicación</th></tr></thead><tbody>'+eqs.map(e=>`<tr><td data-label="Tipo"><div class="td-type"><i class="fas ${getEquipmentIcon(e.tipo)}"></i>${e.tipo}</div></td><td data-label="Equipo">${e.marca} ${e.modelo}</td><td data-label="Serial">${e.serial}</td><td data-label="Estado">${getStatusBadge(e.estado)}</td><td data-label="Ubicación">${e.ubicacion||'—'}</td></tr>`).join('')+'</tbody></table></div>';}
openModal('modalEmpleadoEquipos');
}

// === NAVIGATION & GESTION UBICACIONES ===
function toggleLocationSubmenu(loc, el) {
  const submenuId = `submenu-${loc.replace(/\s+/g, '-')}`;
  const submenu = document.getElementById(submenuId);
  if(!submenu) return;
  const icon = el.querySelector('.fa-chevron-down, .fa-chevron-up');
  if(submenu.style.display === 'none') {
    submenu.style.display = 'block';
    if(icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
  } else {
    submenu.style.display = 'none';
    if(icon) { icon.classList.remove('fa-chevron-up'); icon.classList.add('fa-chevron-down'); }
  }
}

function selectLocationSection(loc, section, el) {
  currentLocationFilter = loc;
  document.querySelectorAll('.sidebar__link').forEach(l=>l.classList.remove('active'));
  el.classList.add('active'); 
  el.closest('.sidebar__location-item').querySelector('.sidebar__link').classList.add('active');
  
  document.getElementById('filterUbicacion').value = loc;
  applyFilters();
  
  document.getElementById('section-dashboard').style.display = 'none';
  document.getElementById('section-equipos').style.display = section === 'equipos' ? '' : 'none';
  document.getElementById('section-personal').style.marginTop = '0';
  document.getElementById('section-personal').style.display = section === 'personal' ? '' : 'none';
  document.getElementById('pageTitle').textContent = `${loc} - ${section === 'equipos' ? 'Equipos' : 'Personal'}`;
  
  renderPersonal();
}

async function openGestionUbicaciones() {
  const emp = await DataManager.getEmpresa(empresaId);
  document.getElementById('gestionUbicacionesTitle').textContent = emp.etiquetaUbicacion || 'Ubicaciones';
  document.getElementById('nuevaUbicacionInput').value = '';
  await renderGestionUbicacionesList();
  openModal('modalGestionUbicaciones');
}

async function renderGestionUbicacionesList() {
  const locs = await DataManager.getUniqueLocations(empresaId);
  const list = document.getElementById('gestionUbicacionesList');
  if(locs.length === 0) {
    list.innerHTML = '<p style="color:var(--text-secondary);font-size:.85rem">No hay ubicaciones creadas.</p>';
    return;
  }
  list.innerHTML = locs.map(l => `
    <div class="detail-list-item">
      <span>${l}</span>
      <button type="button" class="btn-icon btn-danger-icon" onclick="clientDeleteUbicacion('${l}')" title="Eliminar"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

async function clientAddUbicacion() {
  const input = document.getElementById('nuevaUbicacionInput');
  const val = input.value.trim();
  if(!val) return;
  await DataManager.addUbicacion(empresaId, val);
  await DataManager.logAudit('crear','ubicacion',null,val,empresaId);
  input.value = '';
  await renderGestionUbicacionesList();
  await loadSidebarLocations();
  await loadUbicacionesSelects();
  await loadFilters();
}

async function clientDeleteUbicacion(nombre) {
  if(!confirm(`¿Eliminar "${nombre}"? Los equipos y personal asignados quedarán sin ubicación.`)) return;
  await DataManager.deleteUbicacion(empresaId, nombre);
  await DataManager.logAudit('eliminar','ubicacion',null,nombre,empresaId);
  await renderGestionUbicacionesList();
  await loadSidebarLocations();
  await loadUbicacionesSelects();
  await loadFilters();
  await applyFilters();
  await renderPersonal();
}

function switchSection(section,el){
currentLocationFilter = '';
const filterUb = document.getElementById('filterUbicacion');
if(filterUb) filterUb.value = '';
if(section === 'equipos' || section === 'personal') applyFilters();

document.querySelectorAll('.sidebar__link').forEach(l=>l.classList.remove('active'));
if(el) el.classList.add('active');

document.getElementById('section-dashboard').style.display=section==='dashboard'?'':'none';
document.getElementById('section-equipos').style.display=section==='equipos'?'':'none';
document.getElementById('section-personal').style.marginTop='0';
document.getElementById('section-personal').style.display=section==='personal'?'':'none';
const titles = {dashboard:'Dashboard',equipos:'Equipos',personal:'Personal'};
document.getElementById('pageTitle').textContent=titles[section]||section;
if(section==='dashboard') renderExecutiveDashboard();
if(section==='personal') renderPersonal();
}
function switchTab(btn,tabId){
const parent=btn.closest('.modal__body')||btn.closest('.modal__content')||document;
parent.querySelectorAll('.tab-btn').forEach(t=>t.classList.remove('active'));btn.classList.add('active');
parent.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
document.getElementById(tabId).classList.add('active');
}
function toggleSidebar(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  if(overlay) overlay.classList.toggle('active');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}
// Close sidebar on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('sidebarOverlay');
  if(overlay) overlay.addEventListener('click', toggleSidebar);
});

// === EXPORTS ===
function openExportConfig(format) {
  ReportsManager.openExportModal(format, 'modalExport', async (fmt, options) => {
    const emp = await DataManager.getEmpresa(empresaId);
    const pm = {};
    const personal = await DataManager.getPersonal(empresaId);
    personal.forEach(p => pm[p.id] = p);
    if (fmt === 'csv') {
      ReportsManager.exportExcel(filteredEquipos, emp ? emp.nombre : 'Empresa', pm, options);
    } else {
      ReportsManager.exportPDF(filteredEquipos, emp ? emp.nombre : 'Empresa', pm, emp ? emp.logo : null, options);
    }
  });
}

// ============================================
// === EXECUTIVE DASHBOARD ANALYTICS ENGINE ===
// ============================================

const CHART_COLORS = {
  blue: '#3b82f6', purple: '#8b5cf6', green: '#10b981', orange: '#f59e0b',
  red: '#ef4444', cyan: '#06b6d4', pink: '#ec4899', indigo: '#6366f1',
  blueBg: 'rgba(59,130,246,0.7)', purpleBg: 'rgba(139,92,246,0.7)',
  greenBg: 'rgba(16,185,129,0.7)', orangeBg: 'rgba(245,158,11,0.7)',
  redBg: 'rgba(239,68,68,0.7)', cyanBg: 'rgba(6,182,212,0.7)',
  pinkBg: 'rgba(236,72,153,0.7)', indigoBg: 'rgba(99,102,241,0.7)'
};

const CHART_DEFAULTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#a0a0b8', font: { family: 'Poppins', size: 12 }, padding: 16, usePointStyle: true, pointStyleWidth: 10 } },
    tooltip: { backgroundColor: 'rgba(18,18,26,0.95)', titleColor: '#f0f0f5', bodyColor: '#a0a0b8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, padding: 12, cornerRadius: 8, titleFont: { family: 'Outfit', weight: '600' }, bodyFont: { family: 'Poppins' } }
  },
  scales: {
    x: { ticks: { color: '#a0a0b8', font: { family: 'Poppins', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'rgba(255,255,255,0.06)' } },
    y: { ticks: { color: '#a0a0b8', font: { family: 'Poppins', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'rgba(255,255,255,0.06)' } }
  }
};

function destroyChart(id) { if(chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

function formatCurrency(val) {
  if(!val && val !== 0) return '$0';
  return '$' + Number(val).toLocaleString('es-CL', {maximumFractionDigits:0});
}

async function renderExecutiveDashboard() {
  const equipos = await DataManager.getEquipos(empresaId);
  const personal = await DataManager.getPersonal(empresaId);
  renderExecKPIs(equipos, personal);
  renderCategoryChart(equipos);
  renderDistributionChart(equipos);
  renderInvestmentChart(equipos);
  renderLocationChart(equipos);
  renderStatusChart(equipos);
  renderAlerts(equipos);
  renderRecentAssets(equipos, personal);
}

// --- Executive KPIs ---
function renderExecKPIs(equipos, personal) {
  const total = equipos.length;
  const totalValue = equipos.reduce((s, e) => s + (parseFloat(e.precioEstimado) || 0), 0);
  const activos = equipos.filter(e => e.estado === 'activo').length;
  const mant = equipos.filter(e => e.estado === 'mantenimiento').length;
  const baja = equipos.filter(e => e.estado === 'baja').length;

  // Monthly variation
  const now = new Date();
  const thisMonth = equipos.filter(e => {
    if(!e.fechaIngreso) return false;
    const d = new Date(e.fechaIngreso);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const lastMonth = equipos.filter(e => {
    if(!e.fechaIngreso) return false;
    const d = new Date(e.fechaIngreso);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  }).length;
  const variation = thisMonth - lastMonth;
  const variationPct = lastMonth > 0 ? Math.round((variation / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);
  const trendClass = variation > 0 ? 'up' : variation < 0 ? 'down' : 'neutral';
  const trendIcon = variation > 0 ? 'fa-arrow-up' : variation < 0 ? 'fa-arrow-down' : 'fa-minus';
  const activosPct = total > 0 ? Math.round((activos / total) * 100) : 0;

  document.getElementById('execKpiGrid').innerHTML = `
    <div class="exec-kpi kpi-accent-blue">
      <div class="exec-kpi__header">
        <div class="exec-kpi__icon blue"><i class="fas fa-boxes-stacked"></i></div>
        <span class="exec-kpi__trend neutral"><i class="fas fa-layer-group"></i> ${personal.length} personas</span>
      </div>
      <div class="exec-kpi__value">${total}</div>
      <div class="exec-kpi__label">Total Equipos</div>
    </div>
    <div class="exec-kpi kpi-accent-green">
      <div class="exec-kpi__header">
        <div class="exec-kpi__icon green"><i class="fas fa-dollar-sign"></i></div>
      </div>
      <div class="exec-kpi__value">${formatCurrency(totalValue)}</div>
      <div class="exec-kpi__label">Valor Total Invertido</div>
    </div>
    <div class="exec-kpi kpi-accent-emerald">
      <div class="exec-kpi__header">
        <div class="exec-kpi__icon emerald"><i class="fas fa-check-circle"></i></div>
        <span class="exec-kpi__trend up"><i class="fas fa-percentage"></i> ${activosPct}%</span>
      </div>
      <div class="exec-kpi__value">${activos}</div>
      <div class="exec-kpi__label">Equipos Activos</div>
    </div>
    <div class="exec-kpi kpi-accent-orange">
      <div class="exec-kpi__header">
        <div class="exec-kpi__icon orange"><i class="fas fa-tools"></i></div>
      </div>
      <div class="exec-kpi__value">${mant}</div>
      <div class="exec-kpi__label">En Mantenimiento</div>
    </div>
    <div class="exec-kpi kpi-accent-red">
      <div class="exec-kpi__header">
        <div class="exec-kpi__icon red"><i class="fas fa-power-off"></i></div>
      </div>
      <div class="exec-kpi__value">${baja}</div>
      <div class="exec-kpi__label">Dados de Baja</div>
    </div>
    <div class="exec-kpi kpi-accent-purple">
      <div class="exec-kpi__header">
        <div class="exec-kpi__icon purple"><i class="fas fa-chart-line"></i></div>
        <span class="exec-kpi__trend ${trendClass}"><i class="fas ${trendIcon}"></i> ${variation >= 0 ? '+' : ''}${variation}</span>
      </div>
      <div class="exec-kpi__value">${thisMonth}</div>
      <div class="exec-kpi__label">Nuevos Este Mes</div>
    </div>
  `;
}

// --- Category Bar Chart ---
function renderCategoryChart(equipos) {
  destroyChart('chartCategory');
  const cats = {
    'PC Escritorio': equipos.filter(e => e.tipo === 'pcescritorio' || e.tipo === 'computador').length,
    'Notebooks': equipos.filter(e => e.tipo === 'notebook').length,
    'Impresoras': equipos.filter(e => e.tipo === 'impresora').length,
    'Celulares': equipos.filter(e => e.tipo === 'celular').length,
    'Tablets': equipos.filter(e => e.tipo === 'tablet').length,
    'Servidores': equipos.filter(e => e.tipo === 'servidor').length
  };
  const labels = Object.keys(cats);
  const data = Object.values(cats);
  const colors = [CHART_COLORS.blueBg, CHART_COLORS.purpleBg, CHART_COLORS.orangeBg, CHART_COLORS.greenBg, CHART_COLORS.cyanBg, CHART_COLORS.redBg];

  chartInstances['chartCategory'] = new Chart(document.getElementById('chartCategory'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Cantidad', data, backgroundColor: colors, borderColor: colors.map(c => c.replace('0.7', '1')), borderWidth: 1, borderRadius: 6, borderSkipped: false }] },
    options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } }, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, beginAtZero: true, ticks: { ...CHART_DEFAULTS.scales.y.ticks, stepSize: 1 } } } }
  });
}

// --- Distribution Donut Chart ---
function renderDistributionChart(equipos) {
  destroyChart('chartDistribution');
  const cats = {
    'PC Escritorio': equipos.filter(e => e.tipo === 'pcescritorio' || e.tipo === 'computador').length,
    'Notebooks': equipos.filter(e => e.tipo === 'notebook').length,
    'Impresoras': equipos.filter(e => e.tipo === 'impresora').length,
    'Celulares': equipos.filter(e => e.tipo === 'celular').length,
    'Tablets': equipos.filter(e => e.tipo === 'tablet').length,
    'Servidores': equipos.filter(e => e.tipo === 'servidor').length
  };
  // Filter zero values
  const filtered = Object.entries(cats).filter(([,v]) => v > 0);
  const labels = filtered.map(([k]) => k);
  const data = filtered.map(([,v]) => v);
  const bgColors = [CHART_COLORS.blue, CHART_COLORS.purple, CHART_COLORS.orange, CHART_COLORS.green, CHART_COLORS.cyan, CHART_COLORS.red].slice(0, data.length);

  chartInstances['chartDistribution'] = new Chart(document.getElementById('chartDistribution'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: bgColors, borderColor: 'rgba(18,18,26,0.8)', borderWidth: 3, hoverOffset: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { ...CHART_DEFAULTS.plugins, legend: { ...CHART_DEFAULTS.plugins.legend, position: 'bottom' } } }
  });
}

// --- Investment Timeline Chart ---
function renderInvestmentChart(equipos) {
  destroyChart('chartInvestment');
  const withDate = equipos.filter(e => e.fechaIngreso && (parseFloat(e.precioEstimado) || 0) > 0);
  if(withDate.length === 0) {
    const body = document.getElementById('chartInvestment').parentElement;
    body.innerHTML = '<div class="chart-empty"><i class="fas fa-chart-line"></i><p>Sin datos de inversión disponibles</p></div>';
    return;
  }
  // Group by month
  const monthlyMap = {};
  withDate.forEach(e => {
    const d = new Date(e.fechaIngreso);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + (parseFloat(e.precioEstimado) || 0);
  });
  const sortedKeys = Object.keys(monthlyMap).sort();
  const labels = sortedKeys.map(k => {
    const [y, m] = k.split('-');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${months[parseInt(m)-1]} ${y.slice(2)}`;
  });
  // Accumulated
  let acc = 0;
  const data = sortedKeys.map(k => { acc += monthlyMap[k]; return acc; });

  chartInstances['chartInvestment'] = new Chart(document.getElementById('chartInvestment'), {
    type: 'line',
    data: { labels, datasets: [{
      label: 'Inversión Acumulada', data, fill: true,
      backgroundColor: 'rgba(16,185,129,0.1)', borderColor: CHART_COLORS.green,
      borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: CHART_COLORS.green,
      pointBorderColor: '#fff', pointBorderWidth: 1.5, tension: 0.4
    }] },
    options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } }, scales: { ...CHART_DEFAULTS.scales, y: { ...CHART_DEFAULTS.scales.y, beginAtZero: true, ticks: { ...CHART_DEFAULTS.scales.y.ticks, callback: v => formatCurrency(v) } } } }
  });
}

// --- Location Investment Chart ---
function renderLocationChart(equipos) {
  destroyChart('chartLocation');
  const locMap = {};
  equipos.forEach(e => {
    const loc = e.ubicacion || 'Sin asignar';
    locMap[loc] = (locMap[loc] || 0) + (parseFloat(e.precioEstimado) || 0);
  });
  const sorted = Object.entries(locMap).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([k]) => k);
  const data = sorted.map(([,v]) => v);
  const colors = [CHART_COLORS.orange, CHART_COLORS.blue, CHART_COLORS.purple, CHART_COLORS.green, CHART_COLORS.red, CHART_COLORS.cyan, CHART_COLORS.pink, CHART_COLORS.indigo];

  chartInstances['chartLocation'] = new Chart(document.getElementById('chartLocation'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Inversión', data, backgroundColor: colors.slice(0, data.length).map(c => c + 'bb'), borderColor: colors.slice(0, data.length), borderWidth: 1, borderRadius: 6, borderSkipped: false }] },
    options: { ...CHART_DEFAULTS, indexAxis: 'y', plugins: { ...CHART_DEFAULTS.plugins, legend: { display: false } }, scales: { x: { ...CHART_DEFAULTS.scales.x, beginAtZero: true, ticks: { ...CHART_DEFAULTS.scales.x.ticks, callback: v => formatCurrency(v) } }, y: CHART_DEFAULTS.scales.y } }
  });
}

// --- Status Stacked Chart ---
function renderStatusChart(equipos) {
  destroyChart('chartStatus');
  const types = ['PC Escritorio','Notebook','Impresora','Celular','Tablet','Servidor'];
  const typeKeys = ['pcescritorio','notebook','impresora','celular','tablet','servidor'];
  const activoData = typeKeys.map(t => equipos.filter(e => (e.tipo === t || (t === 'pcescritorio' && e.tipo === 'computador')) && e.estado === 'activo').length);
  const mantData = typeKeys.map(t => equipos.filter(e => (e.tipo === t || (t === 'pcescritorio' && e.tipo === 'computador')) && e.estado === 'mantenimiento').length);
  const bajaData = typeKeys.map(t => equipos.filter(e => (e.tipo === t || (t === 'pcescritorio' && e.tipo === 'computador')) && e.estado === 'baja').length);

  chartInstances['chartStatus'] = new Chart(document.getElementById('chartStatus'), {
    type: 'bar',
    data: { labels: types, datasets: [
      { label: 'Activo', data: activoData, backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 4, borderSkipped: false },
      { label: 'Mantenimiento', data: mantData, backgroundColor: 'rgba(245,158,11,0.75)', borderRadius: 4, borderSkipped: false },
      { label: 'Dado de baja', data: bajaData, backgroundColor: 'rgba(239,68,68,0.75)', borderRadius: 4, borderSkipped: false }
    ] },
    options: { ...CHART_DEFAULTS, plugins: { ...CHART_DEFAULTS.plugins, legend: { ...CHART_DEFAULTS.plugins.legend, position: 'bottom' } }, scales: { ...CHART_DEFAULTS.scales, x: { ...CHART_DEFAULTS.scales.x, stacked: true }, y: { ...CHART_DEFAULTS.scales.y, stacked: true, beginAtZero: true, ticks: { ...CHART_DEFAULTS.scales.y.ticks, stepSize: 1 } } } }
  });
}

// --- Alerts ---
function renderAlerts(equipos) {
  const container = document.getElementById('alertsContainer');
  const alerts = [];
  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Warranties expiring soon
  const expiringWarranty = equipos.filter(e => {
    if(!e.garantiaHasta) return false;
    const g = new Date(e.garantiaHasta);
    return g >= now && g <= in90;
  });
  if(expiringWarranty.length > 0) {
    alerts.push(`<div class="alert-item alert-warning"><div class="alert-item__icon"><i class="fas fa-shield-halved"></i></div><div class="alert-item__text"><div class="alert-item__title">Garantías por Vencer</div><div class="alert-item__desc">${expiringWarranty.length} equipo(s) con garantía venciendo en los próximos 90 días</div></div><div class="alert-item__count" style="color:#fbbf24">${expiringWarranty.length}</div></div>`);
  }

  // Unassigned equipment
  const unassigned = equipos.filter(e => !e.empleadoId && e.estado === 'activo');
  if(unassigned.length > 0) {
    alerts.push(`<div class="alert-item alert-info"><div class="alert-item__icon"><i class="fas fa-user-slash"></i></div><div class="alert-item__text"><div class="alert-item__title">Equipos sin Asignar</div><div class="alert-item__desc">${unassigned.length} equipo(s) activo(s) sin responsable asignado</div></div><div class="alert-item__count" style="color:#60a5fa">${unassigned.length}</div></div>`);
  }

  // In maintenance
  const inMaint = equipos.filter(e => e.estado === 'mantenimiento');
  if(inMaint.length > 0) {
    alerts.push(`<div class="alert-item alert-danger"><div class="alert-item__icon"><i class="fas fa-wrench"></i></div><div class="alert-item__text"><div class="alert-item__title">En Mantenimiento</div><div class="alert-item__desc">${inMaint.length} equipo(s) actualmente en reparación o mantenimiento</div></div><div class="alert-item__count" style="color:#f87171">${inMaint.length}</div></div>`);
  }

  // No price
  const noPrice = equipos.filter(e => !e.precioEstimado && e.estado === 'activo');
  if(noPrice.length > 0) {
    alerts.push(`<div class="alert-item alert-success"><div class="alert-item__icon"><i class="fas fa-tag"></i></div><div class="alert-item__text"><div class="alert-item__title">Sin Precio Registrado</div><div class="alert-item__desc">${noPrice.length} equipo(s) sin valor de precio promedio asignado</div></div><div class="alert-item__count" style="color:#34d399">${noPrice.length}</div></div>`);
  }

  if(alerts.length === 0) {
    container.innerHTML = '<div class="chart-empty" style="position:static;padding:40px 0"><i class="fas fa-check-circle" style="color:#34d399;opacity:0.6"></i><p>Todo en orden — sin alertas pendientes</p></div>';
  } else {
    container.innerHTML = `<div class="alerts-grid">${alerts.join('')}</div>`;
  }
}

// --- Recent Assets Table ---
function renderRecentAssets(equipos, personal) {
  const container = document.getElementById('recentAssetsContainer');
  const sorted = [...equipos].sort((a, b) => new Date(b.fechaIngreso || 0) - new Date(a.fechaIngreso || 0)).slice(0, 10);
  if(sorted.length === 0) {
    container.innerHTML = '<div class="chart-empty" style="position:static;padding:40px 0"><i class="fas fa-box-open"></i><p>No hay activos registrados</p></div>';
    return;
  }
  const pMap = new Map(personal.map(p => [p.id, p]));
  const rows = sorted.map(e => {
    const emp = e.empleadoId ? pMap.get(e.empleadoId) : null;
    const empName = emp ? `${emp.nombre} ${emp.apellido}` : '<span style="color:var(--text-secondary)">Sin asignar</span>';
    const val = e.precioEstimado ? formatCurrency(e.precioEstimado) : '<span style="color:var(--text-secondary)">—</span>';
    return `<tr>
      <td data-label="Tipo"><div class="td-type"><i class="fas ${getEquipmentIcon(e.tipo)}"></i>${e.tipo}</div></td>
      <td data-label="Equipo" class="td-equipo-name">${e.marca} ${e.modelo}</td>
      <td data-label="Serial" style="color:var(--text-secondary)">${e.serial}</td>
      <td data-label="Responsable">${empName}</td>
      <td data-label="Estado">${getStatusBadge(e.estado)}</td>
      <td data-label="Valor" class="td-value">${val}</td>
      <td data-label="Ingreso">${formatDate(e.fechaIngreso)}</td>
    </tr>`;
  }).join('');
  container.innerHTML = `<table class="recent-table"><thead><tr><th>Tipo</th><th>Equipo</th><th>Serial</th><th>Responsable</th><th>Estado</th><th>Valor</th><th>Ingreso</th></tr></thead><tbody>${rows}</tbody></table>`;
}
