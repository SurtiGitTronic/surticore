// Dashboard Init
let currentView='table',currentSort={key:'fechaIngreso',dir:'desc'},currentPage=1,pageSize=10,filteredEquipos=[],empresaId=null,currentLocationFilter='';

document.addEventListener('DOMContentLoaded', async ()=>{
if(!AuthManager.requireAuth())return;
const s=AuthManager.getSession();
if(s.rol==='admin'){window.location.href='admin.html';return;}
empresaId=s.empresaId;
document.getElementById('userName').textContent=s.nombre;
const emp=await DataManager.getEmpresa(empresaId);
if(emp){
  document.getElementById('sidebarCompany').textContent=emp.nombre;
  document.getElementById('printCompany').textContent=emp.nombre;
  if(emp.logo){document.getElementById('sidebarLogo').src=emp.logo;document.getElementById('sidebarLogo').style.display='block';document.getElementById('printLogo').src=emp.logo;}
  if(emp.colorPrimario)applyCompanyTheme(emp.colorPrimario);
  const label = emp.etiquetaUbicacion || 'Sedes';
  document.getElementById('navUbicacionesTitle').textContent = label;
}
document.getElementById('printDate').textContent=new Date().toLocaleDateString('es-CL');
if(s.permisos && s.permisos.canManageUbicaciones) {
  const btn = document.getElementById('btnManageLocs');
  if(btn) btn.style.display = 'block';
}
if(AuthManager.canCreate()){document.getElementById('btnAddEquipo').style.display='';document.getElementById('btnAddPersonal').style.display='';}
await loadUbicacionesSelects();await loadFilters();await loadSidebarLocations();await renderKPIs();await applyFilters();await renderPersonal();
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
<td><div class="td-type"><i class="fas ${getEquipmentIcon(e.tipo)}"></i>${e.tipo}</div></td>
<td>${e.marca} ${e.modelo}</td>
<td>${e.serial}</td>
<td><div class="td-employee"><strong>${empName}</strong><span>${empCargo}</span></div></td>
<td>${e.ubicacion||'—'}</td>
<td>${getStatusBadge(e.estado)}</td>
<td>${formatDate(e.fechaIngreso)}</td>
<td class="td-actions">
<button class="btn-icon" onclick="viewEquipo('${e.id}')" title="Ver detalle"><i class="fas fa-eye"></i></button>
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
async function viewEquipo(id){
const e=await DataManager.getEquipo(id);if(!e)return;
const emp=e.empleadoId ? await DataManager.getEmpleado(e.empleadoId) : null;
const empName=emp?`${emp.nombre} ${emp.apellido}`:'Sin asignar';
document.getElementById('detailTitle').textContent=`${e.marca} ${e.modelo}`;
if(AuthManager.canEdit())document.getElementById('detailEditBtn').style.display='';
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
<div class="detail-item"><label>Garantía Hasta</label><span>${formatDate(e.garantiaHasta)}</span></div></div>`;

document.getElementById('detail-hardware').innerHTML=`<div class="detail-grid">
${e.procesador?`<div class="detail-item"><label>Procesador</label><span>${e.procesador}</span></div>`:''}
${e.ram?`<div class="detail-item"><label>RAM</label><span>${e.ram}</span></div>`:''}
${e.disco?`<div class="detail-item"><label>Disco</label><span>${e.disco}</span></div>`:''}
${e.tarjetaVideo?`<div class="detail-item"><label>Tarjeta de Video</label><span>${e.tarjetaVideo}</span></div>`:''}
${e.tipoImpresion?`<div class="detail-item"><label>Tipo Impresión</label><span>${e.tipoImpresion}</span></div>`:''}
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
document.getElementById('eqTarjetaVideo').value=e.tarjetaVideo||'';
document.getElementById('eqTipoImpresion').value=e.tipoImpresion||'';
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
}

async function saveEquipo(e){
e.preventDefault();const id=document.getElementById('equipoId').value;
const _v=v=>v||null; // Convert empty strings to null for DB compatibility
const data={empresaId,tipo:document.getElementById('eqTipo').value,marca:document.getElementById('eqMarca').value,modelo:document.getElementById('eqModelo').value,serial:document.getElementById('eqSerial').value,estado:document.getElementById('eqEstado').value,empleadoId:_v(document.getElementById('eqEmpleado').value),ubicacion:document.getElementById('eqUbicacion').value,fechaCompra:_v(document.getElementById('eqFechaCompra').value),garantiaHasta:_v(document.getElementById('eqGarantia').value),procesador:document.getElementById('eqProcesador').value,ram:document.getElementById('eqRam').value,disco:document.getElementById('eqDisco').value,tarjetaVideo:document.getElementById('eqTarjetaVideo').value,tipoImpresion:document.getElementById('eqTipoImpresion').value,conectividad:document.getElementById('eqConectividad').value,imei:document.getElementById('eqImei').value,lineaTelefonica:document.getElementById('eqLinea').value,tipoServidor:document.getElementById('eqTipoServidor').value,almacenamientoTotal:document.getElementById('eqAlmTotal').value,sistemaOperativo:{nombre:document.getElementById('eqOS').value,version:document.getElementById('eqOSVersion').value},direccionIP:document.getElementById('eqIP').value,programasInstalados:getListItems('listProgramas').filter(p=>p.nombre),unidadesRed:getListItems('listUnidades').filter(u=>u.letra),impresorasInstaladas:getListItems('listImpresoras').filter(p=>p.nombre),notas:document.getElementById('eqNotas').value, perTeclado:document.getElementById('eqPerTeclado').value, perMouse:document.getElementById('eqPerMouse').value, perCamara:document.getElementById('eqPerCamara').value, perAudifonos:document.getElementById('eqPerAudifonos').value, perParlantes:document.getElementById('eqPerParlantes').value, perMonitor:document.getElementById('eqPerMonitor').value, perOtros:document.getElementById('eqPerOtros').value};
if(id)await DataManager.updateEquipo(id,data);else await DataManager.createEquipo(data);
closeModal('modalEquipo');await renderKPIs();await loadFilters();await loadSidebarLocations();await applyFilters();
showNotification(id?'Equipo actualizado':'Equipo agregado','success');
}

async function deleteEquipo(id){if(!confirm('¿Eliminar este equipo?'))return;await DataManager.deleteEquipo(id);await renderKPIs();await loadFilters();await applyFilters();showNotification('Equipo eliminado','success');}
function editFromDetail(){const id=document.getElementById('equipoId').value;closeModal('modalDetail');openEquipoModal(id);}

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
<td>${p.nombre}</td><td>${p.apellido}</td><td>${p.cargo||'—'}</td><td>${p.departamento||'—'}</td><td>${p.email||'—'}</td><td>${p.telefono||'—'}</td>
<td><button class="btn btn-sm btn-outline" onclick="viewEmpleadoEquipos('${p.id}')"><i class="fas fa-laptop"></i> ${eqCount}</button></td>
<td class="td-actions">
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
if(id)await DataManager.updateEmpleado(id,data);else await DataManager.createEmpleado(data);
closeModal('modalPersonal');await renderPersonal();await loadFilters();await loadSidebarLocations();
showNotification(id?'Personal actualizado':'Personal agregado','success');
}

async function deletePersonal(id){if(!confirm('¿Eliminar este empleado? Los equipos asignados quedarán sin asignar.'))return;await DataManager.deleteEmpleado(id);await renderPersonal();await loadFilters();await applyFilters();showNotification('Personal eliminado','success');}

async function viewEmpleadoEquipos(id){
const emp=await DataManager.getEmpleado(id),eqs=await DataManager.getEquiposByEmpleado(id);
document.getElementById('empleadoEquiposTitle').textContent=`Equipos de ${emp.nombre} ${emp.apellido}`;
if(!eqs.length){document.getElementById('empleadoEquiposBody').innerHTML='<div class="table-empty"><i class="fas fa-box-open"></i><p>No tiene equipos asignados</p></div>';}
else{document.getElementById('empleadoEquiposBody').innerHTML='<div class="table-wrapper"><table><thead><tr><th>Tipo</th><th>Equipo</th><th>Serial</th><th>Estado</th><th>Ubicación</th></tr></thead><tbody>'+eqs.map(e=>`<tr><td><div class="td-type"><i class="fas ${getEquipmentIcon(e.tipo)}"></i>${e.tipo}</div></td><td>${e.marca} ${e.modelo}</td><td>${e.serial}</td><td>${getStatusBadge(e.estado)}</td><td>${e.ubicacion||'—'}</td></tr>`).join('')+'</tbody></table></div>';}
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
  input.value = '';
  await renderGestionUbicacionesList();
  await loadSidebarLocations();
  await loadUbicacionesSelects();
  await loadFilters();
}

async function clientDeleteUbicacion(nombre) {
  if(!confirm(`¿Eliminar "${nombre}"? Los equipos y personal asignados quedarán sin ubicación.`)) return;
  await DataManager.deleteUbicacion(empresaId, nombre);
  await renderGestionUbicacionesList();
  await loadSidebarLocations();
  await loadUbicacionesSelects();
  await loadFilters();
  await applyFilters();
  await renderPersonal();
}

function switchSection(section,el){
currentLocationFilter = '';
document.getElementById('filterUbicacion').value = '';
applyFilters();

document.querySelectorAll('.sidebar__link').forEach(l=>l.classList.remove('active'));
if(el) el.classList.add('active');

document.getElementById('section-equipos').style.display=section==='equipos'?'':'none';
document.getElementById('section-personal').style.marginTop='0';
document.getElementById('section-personal').style.display=section==='personal'?'':'none';
document.getElementById('pageTitle').textContent=section==='equipos'?'Equipos':'Personal';
renderPersonal();
}
function switchTab(btn,tabId){
const parent=btn.closest('.modal__body')||btn.closest('.modal__content')||document;
parent.querySelectorAll('.tab-btn').forEach(t=>t.classList.remove('active'));btn.classList.add('active');
parent.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
document.getElementById(tabId).classList.add('active');
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');}

// === EXPORTS ===
async function exportCSV(){
const emp=await DataManager.getEmpresa(empresaId);const pm={};
const personal=await DataManager.getPersonal(empresaId);
personal.forEach(p=>pm[p.id]=p);
ReportsManager.exportExcel(filteredEquipos,emp?emp.nombre:'Empresa',pm);
}
async function exportPDF(){
const emp=await DataManager.getEmpresa(empresaId);const pm={};
const personal=await DataManager.getPersonal(empresaId);
personal.forEach(p=>pm[p.id]=p);
ReportsManager.exportPDF(filteredEquipos,emp?emp.nombre:'Empresa',pm,emp?emp.logo:null);
}
