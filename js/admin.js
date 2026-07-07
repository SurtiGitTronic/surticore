// Admin Panel

// Responsive sidebar toggle with overlay
function toggleAdminSidebar(){
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  if(overlay) overlay.classList.toggle('active');
  document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('sidebarOverlay');
  if(overlay) overlay.addEventListener('click', toggleAdminSidebar);
});
let logoBase64='';

document.addEventListener('DOMContentLoaded', async ()=>{
if(!AuthManager.requireAdmin())return;
const s=AuthManager.getSession();
document.getElementById('adminName').textContent=s.nombre;
const sidebarName = document.getElementById('sidebarAdminName');
if (sidebarName) sidebarName.textContent = s.nombre;
const sidebarCargo = document.getElementById('sidebarAdminCargo');
if (sidebarCargo) sidebarCargo.textContent = (s.permisos && s.permisos.cargo) ? s.permisos.cargo : '';
await renderAll();
});

async function renderAll(){
  await loadEmpresaSelects();
  await renderAdminKPIs();
  await renderDashEmpresas();
  await renderEmpresas();
  await renderUsuarios();
}

async function renderAdminKPIs(){
const empresas=await DataManager.getEmpresas(),equipos=await DataManager.getAllEquipos(),personal=await DataManager.getAllPersonal();
document.getElementById('adminKpis').innerHTML=`
<div class="kpi-card kpi-blue"><div class="kpi-card__icon blue"><i class="fas fa-building"></i></div><div class="kpi-card__value">${empresas.length}</div><div class="kpi-card__label">Empresas</div></div>
<div class="kpi-card kpi-purple"><div class="kpi-card__icon purple"><i class="fas fa-boxes-stacked"></i></div><div class="kpi-card__value">${equipos.length}</div><div class="kpi-card__label">Total Equipos</div></div>
<div class="kpi-card kpi-green"><div class="kpi-card__icon green"><i class="fas fa-check-circle"></i></div><div class="kpi-card__value">${equipos.filter(e=>e.estado==='activo').length}</div><div class="kpi-card__label">Activos</div></div>
<div class="kpi-card kpi-orange"><div class="kpi-card__icon orange"><i class="fas fa-tools"></i></div><div class="kpi-card__value">${equipos.filter(e=>e.estado==='mantenimiento').length}</div><div class="kpi-card__label">Mantenimiento</div></div>
<div class="kpi-card kpi-red"><div class="kpi-card__icon red"><i class="fas fa-users"></i></div><div class="kpi-card__value">${personal.length}</div><div class="kpi-card__label">Personal Total</div></div>`;
}

async function renderDashEmpresas(){
const empresas=await DataManager.getEmpresas();
if(empresas.length===0){
  document.getElementById('dashEmpresas').innerHTML='<p style="padding:20px;color:var(--text-secondary);text-align:center">No hay empresas registradas</p>';
  return;
}
const htmlPromises = empresas.map(async e=>{
const eqs=await DataManager.getEquipos(e.id),pers=await DataManager.getPersonal(e.id);
return`<div class="empresa-item" style="cursor:pointer" onclick="window.location.href='dashboard.html?empresaId=${e.id}'">
<div class="empresa-item__info">
<div class="empresa-item__logo">${e.logo?`<img src="${e.logo}">`:`<i class="fas fa-building"></i>`}</div>
<div class="empresa-item__details"><h4>${e.nombre}</h4><p>${e.rut||'Sin RUT'} · ${e.contacto||''}</p></div>
</div>
<div class="empresa-item__stats">
<span><i class="fas fa-laptop"></i> ${eqs.length} equipos</span>
<span><i class="fas fa-users"></i> ${pers.length} personas</span>
<span class="color-preview" style="background:${e.colorPrimario||'#666'}"></span>
</div></div>`;});
const htmls = await Promise.all(htmlPromises);
document.getElementById('dashEmpresas').innerHTML=htmls.join('');
}

async function renderEmpresas(){
const empresas=await DataManager.getEmpresas();
document.getElementById('empresasList').innerHTML=empresas.length?empresas.map(e=>{
return`<div class="empresa-item">
<div class="empresa-item__info">
<div class="empresa-item__logo">${e.logo?`<img src="${e.logo}">`:`<i class="fas fa-building"></i>`}</div>
<div class="empresa-item__details"><h4>${e.nombre}</h4><p>${e.rut||''} · ${e.email||''} · ${e.telefono||''}</p></div>
</div>
<div style="display:flex;gap:6px">
<button class="btn btn-primary btn-sm" onclick="window.location.href='dashboard.html?empresaId=${e.id}'" title="Ver Dashboard"><i class="fas fa-chart-pie"></i> Ver Dashboard</button>
<button class="btn-icon" onclick="openEmpresaModal('${e.id}')"><i class="fas fa-edit"></i></button>
<button class="btn-icon btn-danger-icon" onclick="deleteEmpresa('${e.id}')"><i class="fas fa-trash"></i></button>
</div></div>`;}).join(''):'<p style="padding:20px;color:var(--text-secondary);text-align:center">No hay empresas</p>';
}

async function loadEmpresaSelects(){
const empresas=await DataManager.getEmpresas();
const opts='<option value="">Seleccionar</option>'+empresas.map(e=>`<option value="${e.id}">${e.nombre}</option>`).join('');
const optsAll='<option value="">Todas las empresas</option>'+empresas.map(e=>`<option value="${e.id}">${e.nombre}</option>`).join('');
['usrEmpresa'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
['adminUsrEmpresa'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=optsAll;});
}

// === EMPRESAS CRUD ===
async function openEmpresaModal(id){
document.getElementById('empresaModalTitle').textContent=id?'Editar Empresa':'Nueva Empresa';
document.getElementById('empresaForm').reset();document.getElementById('empId').value='';
logoBase64='';document.getElementById('logoPreviewContainer').style.display='none';
document.getElementById('empColor').value='#2563eb';document.getElementById('empColorPreview').style.background='#2563eb';
document.getElementById('empColor').oninput=function(){document.getElementById('empColorPreview').style.background=this.value;};
if(id){
const e=await DataManager.getEmpresa(id);if(!e)return;
document.getElementById('empId').value=e.id;document.getElementById('empNombre').value=e.nombre;
document.getElementById('empRut').value=e.rut||'';document.getElementById('empContacto').value=e.contacto||'';
document.getElementById('empEmail').value=e.email||'';document.getElementById('empTelefono').value=e.telefono||'';
document.getElementById('empDireccion').value=e.direccion||'';document.getElementById('empColor').value=e.colorPrimario||'#2563eb';
document.getElementById('empEtiquetaUbicacion').value=e.etiquetaUbicacion||'';
document.getElementById('empColorPreview').style.background=e.colorPrimario||'#2563eb';
if(e.logo){logoBase64=e.logo;document.getElementById('logoPreviewImg').src=e.logo;document.getElementById('logoPreviewContainer').style.display='block';}
}
await renderAdminUbicaciones();
openModal('modalEmpresa');
}

async function renderAdminUbicaciones() {
  const id = document.getElementById('empId').value;
  const list = document.getElementById('empUbicacionesList');
  if(!id) {
    list.innerHTML = '<p style="color:var(--text-secondary);font-size:.85rem">Guarde la empresa primero para añadir ubicaciones.</p>';
    return;
  }
  const e = await DataManager.getEmpresa(id);
  const locs = e.ubicaciones || [];
  if(locs.length === 0) {
    list.innerHTML = '<p style="color:var(--text-secondary);font-size:.85rem">Sin ubicaciones registradas.</p>';
    return;
  }
  list.innerHTML = locs.map(l => `
    <div class="detail-list-item">
      <span>${l}</span>
      <button type="button" class="btn-icon btn-danger-icon" onclick="adminDeleteUbicacion('${l}')" title="Eliminar"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

async function adminAddUbicacion() {
  const id = document.getElementById('empId').value;
  const input = document.getElementById('empNuevaUbicacion');
  const val = input.value.trim();
  if(!val) return;
  
  if(!id) {
    const list = document.getElementById('empUbicacionesList');
    if (list.innerHTML.includes('Sin ubicaciones') || list.innerHTML.includes('Guarde la empresa primero')) list.innerHTML = '';
    list.innerHTML += `
      <div class="detail-list-item pending-loc" data-val="${val}">
        <span>${val} <small style="color:var(--accent-light)">(pendiente)</small></span>
        <button type="button" class="btn-icon btn-danger-icon" onclick="this.parentElement.remove()" title="Eliminar"><i class="fas fa-trash"></i></button>
      </div>`;
    input.value = '';
    return;
  }

  await DataManager.addUbicacion(id, val);
  input.value = '';
  await renderAdminUbicaciones();
}

async function adminDeleteUbicacion(nombre) {
  const id = document.getElementById('empId').value;
  if(!confirm(`¿Eliminar "${nombre}"? Los equipos y personal en esta sede quedarán sin asignar.`)) return;
  await DataManager.deleteUbicacion(id, nombre);
  await renderAdminUbicaciones();
}

function previewLogo(event){
const file=event.target.files[0];if(!file)return;
const reader=new FileReader();
reader.onload=function(e){logoBase64=e.target.result;document.getElementById('logoPreviewImg').src=logoBase64;document.getElementById('logoPreviewContainer').style.display='block';};
reader.readAsDataURL(file);
}

async function saveEmpresa(e){
e.preventDefault();const id=document.getElementById('empId').value;

let pendingLocs = Array.from(document.querySelectorAll('.pending-loc')).map(el => el.dataset.val);
const currentInput = document.getElementById('empNuevaUbicacion').value.trim();
if(currentInput && !pendingLocs.includes(currentInput)) pendingLocs.push(currentInput);

const data={nombre:document.getElementById('empNombre').value,rut:document.getElementById('empRut').value,contacto:document.getElementById('empContacto').value,email:document.getElementById('empEmail').value,telefono:document.getElementById('empTelefono').value,direccion:document.getElementById('empDireccion').value,colorPrimario:document.getElementById('empColor').value,logo:logoBase64,etiquetaUbicacion:document.getElementById('empEtiquetaUbicacion').value};

if(id){
  await DataManager.updateEmpresa(id,data);
  for(let loc of pendingLocs) await DataManager.addUbicacion(id, loc);
} else {
  if (pendingLocs.length > 0) data.ubicaciones = pendingLocs;
  await DataManager.createEmpresa(data);
}

closeModal('modalEmpresa');await DataManager.logAudit(id?'editar':'crear','empresa',id||'new',data.nombre,null,{rut:data.rut});await renderAll();showNotification(id?'Empresa actualizada':'Empresa creada','success');
}

async function deleteEmpresa(id){
const e=await DataManager.getEmpresa(id);
if(!confirm(`¿Eliminar "${e.nombre}"? Se eliminarán todos sus usuarios, personal y equipos.`))return;
await DataManager.deleteEmpresa(id);await DataManager.logAudit('eliminar','empresa',id,e.nombre,null);await renderAll();showNotification('Empresa eliminada','success');
}

// === USUARIOS CRUD ===
async function renderUsuarios(){
const empFilter=document.getElementById('adminUsrEmpresa')?document.getElementById('adminUsrEmpresa').value:'';
let usersRaw=await DataManager.getUsers();
let users = usersRaw;
if(empFilter)users=users.filter(u=>u.empresaId===empFilter);
if(users.length===0){
  document.getElementById('usuariosTableBody').innerHTML='<tr><td colspan="11"><div class="table-empty"><i class="fas fa-user-slash"></i><p>No hay usuarios</p></div></td></tr>';
  return;
}
const empMap = new Map();
const empresas = await DataManager.getEmpresas();
empresas.forEach(e => empMap.set(e.id, e.nombre));

document.getElementById('usuariosTableBody').innerHTML=users.map(u=>{
const empName=empMap.get(u.empresaId);
const check=v=>v?'<i class="fas fa-check-circle" style="color:var(--success)"></i>':'<i class="fas fa-times-circle" style="color:var(--text-secondary);opacity:.3"></i>';
return`<tr>
<td data-label="Usuario"><strong>${u.username}</strong></td><td data-label="Nombre">${u.nombre}</td><td data-label="Empresa">${empName||'—'}</td><td data-label="Rol"><span class="badge ${u.rol==='admin'?'badge-primary':'badge-info'}">${u.rol==='admin'?'Admin':'Cliente'}</span></td>
<td data-label="Crear">${check(u.permisos.canCreate)}</td><td data-label="Editar">${check(u.permisos.canEdit)}</td><td data-label="Eliminar">${check(u.permisos.canDelete)}</td><td data-label="Sedes">${check(u.permisos.canManageUbicaciones)}</td><td data-label="Soporte">${check(u.permisos.canSoporteRemoto)}</td>
<td data-label="Estado">${u.activo?'<span class="badge badge-success">Activo</span>':'<span class="badge badge-danger">Inactivo</span>'}</td>
<td class="td-actions" data-label="">
<button class="btn-icon" onclick="openUsuarioModal('${u.id}')"><i class="fas fa-edit"></i></button>
<button class="btn-icon btn-danger-icon" onclick="deleteUsuario('${u.id}')"><i class="fas fa-trash"></i></button>
</td></tr>`;}).join('');
}

async function openUsuarioModal(id){
document.getElementById('usuarioModalTitle').textContent=id?'Editar Usuario':'Nuevo Usuario';
document.getElementById('usuarioForm').reset();document.getElementById('usrId').value='';
document.getElementById('usrRol').value='cliente';
if(typeof toggleUsrRole === 'function') toggleUsrRole();
await loadEmpresaSelects();
if(id){
const u=await DataManager.getUser(id);if(!u)return;
document.getElementById('usrId').value=u.id;document.getElementById('usrUsername').value=u.username;
document.getElementById('usrPassword').value=u.password;document.getElementById('usrNombre').value=u.nombre;
document.getElementById('usrRol').value=u.rol||'cliente';
if(typeof toggleUsrRole === 'function') toggleUsrRole();
document.getElementById('usrEmpresa').value=u.empresaId||'';
if(document.getElementById('usrCargo')) document.getElementById('usrCargo').value=(u.permisos&&u.permisos.cargo)?u.permisos.cargo:'';
document.getElementById('usrCanCreate').checked=u.permisos.canCreate;
document.getElementById('usrCanEdit').checked=u.permisos.canEdit;
document.getElementById('usrCanDelete').checked=u.permisos.canDelete;
document.getElementById('usrCanManageUbicaciones').checked=u.permisos.canManageUbicaciones||false;
document.getElementById('usrCanSoporteRemoto').checked=u.permisos.canSoporteRemoto||false;
document.getElementById('usrActivo').checked=u.activo;
}
openModal('modalUsuario');
}

function toggleUsrRole() {
  const isCliente = document.getElementById('usrRol').value === 'cliente';
  document.getElementById('usrEmpresa').required = isCliente;
  document.getElementById('usrEmpresaGroup').style.display = isCliente ? 'block' : 'none';
  const cargoGroup = document.getElementById('usrCargoGroup');
  if (cargoGroup) cargoGroup.style.display = isCliente ? 'none' : 'block';
}

async function saveUsuario(e){
e.preventDefault();const id=document.getElementById('usrId').value;
const rol = document.getElementById('usrRol').value;
const empresaId = rol === 'admin' ? null : document.getElementById('usrEmpresa').value;
const cargo = rol === 'admin' ? document.getElementById('usrCargo').value : null;
const data={username:document.getElementById('usrUsername').value,password:document.getElementById('usrPassword').value,nombre:document.getElementById('usrNombre').value,empresaId,rol,permisos:{canCreate:document.getElementById('usrCanCreate').checked,canEdit:document.getElementById('usrCanEdit').checked,canDelete:document.getElementById('usrCanDelete').checked,canManageUbicaciones:document.getElementById('usrCanManageUbicaciones').checked,canSoporteRemoto:document.getElementById('usrCanSoporteRemoto').checked,cargo},activo:document.getElementById('usrActivo').checked};
if(id){await DataManager.updateUser(id,data);await DataManager.logAudit('editar','usuario',id,data.nombre,data.empresaId,{username:data.username,rol:data.rol});}else{const created=await DataManager.createUser(data);await DataManager.logAudit('crear','usuario',created?created.id:null,data.nombre,data.empresaId,{username:data.username,rol:data.rol});}
closeModal('modalUsuario');await renderUsuarios();showNotification(id?'Usuario actualizado':'Usuario creado','success');
}

async function deleteUsuario(id){if(!confirm('¿Eliminar este usuario?'))return;const u=await DataManager.getUser(id);await DataManager.deleteUser(id);await DataManager.logAudit('eliminar','usuario',id,u?u.nombre:'',u?u.empresaId:null,{username:u?u.username:''});await renderUsuarios();showNotification('Usuario eliminado','success');}

// === NAVIGATION ===
function switchAdminSection(section,el){
document.querySelectorAll('.sidebar__link').forEach(l=>l.classList.remove('active'));el.classList.add('active');
['dashboard','empresas','usuarios','auditoria'].forEach(s=>{
document.getElementById('sec-'+s).style.display=s===section?'':'none';
});
if(section==='auditoria') renderAuditLog();
const titles={dashboard:'Dashboard',empresas:'Empresas',usuarios:'Usuarios',auditoria:'Auditoría'};
document.getElementById('adminPageTitle').textContent=titles[section]||section;
}

// === AUDITORIA ===
async function renderAuditLog(){
  const filters = {
    fechaDesde: document.getElementById('auditFechaDesde').value,
    fechaHasta: document.getElementById('auditFechaHasta').value,
    empresaId: document.getElementById('auditEmpresa').value,
    action: document.getElementById('auditAction').value,
    entity: document.getElementById('auditEntity').value
  };
  // Clean empty filters
  Object.keys(filters).forEach(k => { if(!filters[k]) delete filters[k]; });
  const logs = await DataManager.getAuditLog(filters);
  const empMap = new Map();
  const empresas = await DataManager.getEmpresas();
  empresas.forEach(e => empMap.set(e.id, e.nombre));
  // Populate empresa filter if not done
  const empSelect = document.getElementById('auditEmpresa');
  if(empSelect.options.length <= 1) {
    empresas.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id; opt.textContent = e.nombre;
      empSelect.appendChild(opt);
    });
  }
  const tbody = document.getElementById('auditTableBody');
  if(!logs.length){
    tbody.innerHTML='<tr><td colspan="6"><div class="table-empty"><i class="fas fa-clipboard-check"></i><p>No hay registros de auditoría</p></div></td></tr>';
    return;
  }
  const actionBadge = a => {
    const colors = {crear:'badge-success',editar:'badge-warning',eliminar:'badge-danger'};
    const icons = {crear:'fa-plus',editar:'fa-pen',eliminar:'fa-trash'};
    return `<span class="badge ${colors[a]||'badge-info'}"><i class="fas ${icons[a]||'fa-info'}"></i> ${a}</span>`;
  };
  const entityLabel = e => {
    const icons = {equipo:'fa-laptop',personal:'fa-user',empresa:'fa-building',usuario:'fa-user-shield',ubicacion:'fa-map-marker-alt'};
    return `<i class="fas ${icons[e]||'fa-cube'}"></i> ${e}`;
  };
  tbody.innerHTML = logs.map(l => {
    const fecha = new Date(l.timestamp).toLocaleString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    const empName = l.empresaId ? (empMap.get(l.empresaId) || '—') : '—';
    return `<tr>
      <td data-label="Fecha">${fecha}</td>
      <td data-label="Usuario"><strong>${l.userName||'—'}</strong></td>
      <td data-label="Acción">${actionBadge(l.action)}</td>
      <td data-label="Entidad">${entityLabel(l.entity)}</td>
      <td data-label="Detalle">${l.entityName||'—'}</td>
      <td data-label="Empresa">${empName}</td>
    </tr>`;
  }).join('');
}

function clearAuditFilters(){
  document.getElementById('auditFechaDesde').value='';
  document.getElementById('auditFechaHasta').value='';
  document.getElementById('auditEmpresa').value='';
  document.getElementById('auditAction').value='';
  document.getElementById('auditEntity').value='';
  renderAuditLog();
}
