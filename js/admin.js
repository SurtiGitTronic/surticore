// Admin Panel
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
  await loadEmpresaSelects(); // Call this first so filters work
  await renderAdminKPIs();
  await renderDashEmpresas();
  await renderEmpresas();
  await renderUsuarios();
  await renderAdminSedes();
  await renderAdminPersonal();
  await renderAdminInventario();
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
return`<div class="empresa-item">
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
<button class="btn-icon" onclick="openEmpresaModal('${e.id}')"><i class="fas fa-edit"></i></button>
<button class="btn-icon btn-danger-icon" onclick="deleteEmpresa('${e.id}')"><i class="fas fa-trash"></i></button>
</div></div>`;}).join(''):'<p style="padding:20px;color:var(--text-secondary);text-align:center">No hay empresas</p>';
}

async function loadEmpresaSelects(){
const empresas=await DataManager.getEmpresas();
const opts='<option value="">Seleccionar</option>'+empresas.map(e=>`<option value="${e.id}">${e.nombre}</option>`).join('');
const optsAll='<option value="">Todas las empresas</option>'+empresas.map(e=>`<option value="${e.id}">${e.nombre}</option>`).join('');
['usrEmpresa','aperEmpresa','aeqEmpresa'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});
['adminPerEmpresa','adminInvEmpresa','adminUsrEmpresa','adminSedesEmpresa'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=optsAll;});
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
    // Si la empresa es nueva, agregamos la ubicación a la vista y la guardamos al final
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

// Capturar ubicaciones pendientes si las hay
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

closeModal('modalEmpresa');await renderAll();showNotification(id?'Empresa actualizada':'Empresa creada','success');
}

async function deleteEmpresa(id){
const e=await DataManager.getEmpresa(id);
if(!confirm(`¿Eliminar "${e.nombre}"? Se eliminarán todos sus usuarios, personal y equipos.`))return;
await DataManager.deleteEmpresa(id);await renderAll();showNotification('Empresa eliminada','success');
}

// === USUARIOS CRUD ===
async function renderUsuarios(){
const empFilter=document.getElementById('adminUsrEmpresa')?document.getElementById('adminUsrEmpresa').value:'';
let usersRaw=await DataManager.getUsers();
let users = usersRaw;
if(empFilter)users=users.filter(u=>u.empresaId===empFilter);
if(users.length===0){
  document.getElementById('usuariosTableBody').innerHTML='<tr><td colspan="10"><div class="table-empty"><i class="fas fa-user-slash"></i><p>No hay usuarios</p></div></td></tr>';
  return;
}
const empMap = new Map();
const empresas = await DataManager.getEmpresas();
empresas.forEach(e => empMap.set(e.id, e.nombre));

document.getElementById('usuariosTableBody').innerHTML=users.map(u=>{
const empName=empMap.get(u.empresaId);
const check=v=>v?'<i class="fas fa-check-circle" style="color:var(--success)"></i>':'<i class="fas fa-times-circle" style="color:var(--text-secondary);opacity:.3"></i>';
return`<tr>
<td><strong>${u.username}</strong></td><td>${u.nombre}</td><td>${empName||'—'}</td><td><span class="badge ${u.rol==='admin'?'badge-primary':'badge-info'}">${u.rol==='admin'?'Admin':'Cliente'}</span></td>
<td>${check(u.permisos.canCreate)}</td><td>${check(u.permisos.canEdit)}</td><td>${check(u.permisos.canDelete)}</td><td>${check(u.permisos.canManageUbicaciones)}</td>
<td>${u.activo?'<span class="badge badge-success">Activo</span>':'<span class="badge badge-danger">Inactivo</span>'}</td>
<td class="td-actions">
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
const data={username:document.getElementById('usrUsername').value,password:document.getElementById('usrPassword').value,nombre:document.getElementById('usrNombre').value,empresaId,rol,permisos:{canCreate:document.getElementById('usrCanCreate').checked,canEdit:document.getElementById('usrCanEdit').checked,canDelete:document.getElementById('usrCanDelete').checked,canManageUbicaciones:document.getElementById('usrCanManageUbicaciones').checked,cargo},activo:document.getElementById('usrActivo').checked};
if(id)await DataManager.updateUser(id,data);else await DataManager.createUser(data);
closeModal('modalUsuario');await renderUsuarios();showNotification(id?'Usuario actualizado':'Usuario creado','success');
}

async function deleteUsuario(id){if(!confirm('¿Eliminar este usuario?'))return;await DataManager.deleteUser(id);await renderUsuarios();showNotification('Usuario eliminado','success');}

// === PERSONAL ADMIN ===
async function renderAdminPersonal(){
const empFilter=document.getElementById('adminPerEmpresa').value;
let personal=empFilter?await DataManager.getPersonal(empFilter):await DataManager.getAllPersonal();
if(personal.length===0){
  document.getElementById('adminPersonalBody').innerHTML='<tr><td colspan="9"><div class="table-empty"><i class="fas fa-users"></i><p>No hay personal</p></div></td></tr>';
  return;
}
const empresas = await DataManager.getEmpresas();
const empMap = new Map(empresas.map(e => [e.id, e.nombre]));
const equipos = await DataManager.getAllEquipos();
const eqCountMap = equipos.reduce((acc, eq) => { if(eq.empleadoId) acc[eq.empleadoId] = (acc[eq.empleadoId] || 0) + 1; return acc; }, {});

document.getElementById('adminPersonalBody').innerHTML=personal.map(p=>{
const empName=empMap.get(p.empresaId);const eqCount=eqCountMap[p.id]||0;
return`<tr><td>${p.nombre}</td><td>${p.apellido}</td><td>${empName||'—'}</td><td>${p.cargo||'—'}</td><td>${p.departamento||'—'}</td><td>${p.ubicacion||'—'}</td><td>${p.email||'—'}</td>
<td><span class="badge badge-info">${eqCount}</span></td>
<td class="td-actions"><button class="btn-icon" onclick="openAdminPersonalModal('${p.id}')"><i class="fas fa-edit"></i></button>
<button class="btn-icon btn-danger-icon" onclick="deleteAdminPersonal('${p.id}')"><i class="fas fa-trash"></i></button></td></tr>`;}).join('');
}

async function openAdminPersonalModal(id){
document.getElementById('adminPersonalTitle').textContent=id?'Editar Personal':'Agregar Personal';
document.getElementById('adminPersonalForm').reset();document.getElementById('aperId').value='';
await loadEmpresaSelects();
if(id){
const p=await DataManager.getEmpleado(id);if(!p)return;
document.getElementById('aperId').value=p.id;document.getElementById('aperEmpresa').value=p.empresaId;
await loadAperUbicaciones();
document.getElementById('aperNombre').value=p.nombre;document.getElementById('aperApellido').value=p.apellido;document.getElementById('aperCargo').value=p.cargo||'';document.getElementById('aperDepto').value=p.departamento||'';document.getElementById('aperEmail').value=p.email||'';document.getElementById('aperTelefono').value=p.telefono||'';setTimeout(()=>{document.getElementById('aperUbicacion').value=p.ubicacion||'';},0);}
openModal('modalAdminPersonal');
}

async function loadAperUbicaciones() {
  const empId = document.getElementById('aperEmpresa').value;
  const sel = document.getElementById('aperUbicacion');
  if(!empId) { sel.innerHTML = '<option value="">Seleccione una empresa primero</option>'; return; }
  const locs = await DataManager.getUniqueLocations(empId);
  sel.innerHTML = '<option value="">Sin asignar</option>' + locs.map(l => `<option value="${l}">${l}</option>`).join('');
}

async function saveAdminPersonal(e){
e.preventDefault();const id=document.getElementById('aperId').value;
const data={empresaId:document.getElementById('aperEmpresa').value,nombre:document.getElementById('aperNombre').value,apellido:document.getElementById('aperApellido').value,cargo:document.getElementById('aperCargo').value,departamento:document.getElementById('aperDepto').value,email:document.getElementById('aperEmail').value,telefono:document.getElementById('aperTelefono').value,ubicacion:document.getElementById('aperUbicacion').value,activo:true};
if(id)await DataManager.updateEmpleado(id,data);else await DataManager.createEmpleado(data);
closeModal('modalAdminPersonal');await renderAdminPersonal();await renderAdminKPIs();showNotification(id?'Personal actualizado':'Personal agregado','success');
}

async function deleteAdminPersonal(id){if(!confirm('¿Eliminar?'))return;await DataManager.deleteEmpleado(id);await renderAdminPersonal();await renderAdminKPIs();showNotification('Eliminado','success');}

// === SEDES ADMIN ===
async function renderAdminSedes(){
const empFilter=document.getElementById('adminSedesEmpresa')?document.getElementById('adminSedesEmpresa').value:'';
const empresas=empFilter?[await DataManager.getEmpresa(empFilter)].filter(Boolean):await DataManager.getEmpresas();
let rows=[];
const equipos = await DataManager.getAllEquipos();
const personal = await DataManager.getAllPersonal();

empresas.forEach(emp=>{
const locs=emp.ubicaciones||[];
if(locs.length===0){
rows.push(`<tr><td>${emp.nombre}</td><td style="color:var(--text-secondary);font-style:italic">Sin sedes registradas</td><td>—</td><td>—</td><td>—</td></tr>`);
}else{
locs.forEach(loc=>{
const eqCount=equipos.filter(e=>e.empresaId===emp.id && e.ubicacion===loc).length;
const perCount=personal.filter(p=>p.empresaId===emp.id && p.ubicacion===loc).length;
rows.push(`<tr><td>${emp.nombre}</td><td><i class="fas fa-map-marker-alt" style="color:var(--accent-light);margin-right:6px"></i>${loc}</td>
<td><span class="badge badge-info">${eqCount}</span></td><td><span class="badge badge-info">${perCount}</span></td>
<td class="td-actions"><button class="btn-icon btn-danger-icon" onclick="deleteSedeFromTable('${emp.id}','${loc.replace(/'/g,"\\'")}')"><i class="fas fa-trash"></i></button></td></tr>`);
});
}
});
document.getElementById('adminSedesBody').innerHTML=rows.length?rows.join(''):'<tr><td colspan="5"><div class="table-empty"><i class="fas fa-map-marker-alt"></i><p>No hay sedes</p></div></td></tr>';
}

async function deleteSedeFromTable(empId,nombre){
if(!confirm(`¿Eliminar "${nombre}"? Los equipos y personal en esta sede quedarán sin asignar.`))return;
await DataManager.deleteUbicacion(empId,nombre);
await renderAdminSedes();await renderAdminKPIs();showNotification('Sede eliminada','success');
}

// === INVENTARIO GLOBAL ===
async function renderAdminInventario(){
const empFilter=document.getElementById('adminInvEmpresa').value;
const tipoFilter=document.getElementById('adminInvTipo').value;
let equipos=empFilter?await DataManager.getEquipos(empFilter):await DataManager.getAllEquipos();
if(tipoFilter)equipos=equipos.filter(e=>e.tipo===tipoFilter);
if(equipos.length===0){
  document.getElementById('adminInventarioBody').innerHTML='<tr><td colspan="9"><div class="table-empty"><i class="fas fa-box-open"></i><p>No hay equipos</p></div></td></tr>';
  return;
}
const empresas = await DataManager.getEmpresas();
const empMap = new Map(empresas.map(e => [e.id, e.nombre]));
const personal = await DataManager.getAllPersonal();
const perMap = new Map(personal.map(p => [p.id, p]));

document.getElementById('adminInventarioBody').innerHTML=equipos.map(e=>{
const empName=empMap.get(e.empresaId);const per=e.empleadoId ? perMap.get(e.empleadoId) : null;
return`<tr><td>${empName||'—'}</td><td><div class="td-type"><i class="fas ${getEquipmentIcon(e.tipo)}"></i>${e.tipo}</div></td>
<td>${e.marca} ${e.modelo}</td><td>${e.serial}</td>
<td>${per?`${per.nombre} ${per.apellido}`:'Sin asignar'}</td><td>${e.ubicacion||'—'}</td>
<td>${getStatusBadge(e.estado)}</td><td>${e.direccionIP||'—'}</td>
<td class="td-actions"><button class="btn-icon" onclick="openAdminEquipoModal('${e.id}')"><i class="fas fa-edit"></i></button>
<button class="btn-icon btn-danger-icon" onclick="deleteAdminEquipo('${e.id}')"><i class="fas fa-trash"></i></button></td></tr>`;}).join('');
}

async function adminExportCSV(){
const empFilter=document.getElementById('adminInvEmpresa').value;
let equipos=empFilter?await DataManager.getEquipos(empFilter):await DataManager.getAllEquipos();
const pm={};
const personal = await DataManager.getAllPersonal();
personal.forEach(p=>pm[p.id]=p);
ReportsManager.exportExcel(equipos,'Global',pm);
}

// === NAVIGATION ===
function switchAdminSection(section,el){
document.querySelectorAll('.sidebar__link').forEach(l=>l.classList.remove('active'));el.classList.add('active');
['dashboard','empresas','usuarios','sedes','personal','inventario'].forEach(s=>{
document.getElementById('sec-'+s).style.display=s===section?'':'none';
});
const titles={dashboard:'Dashboard',empresas:'Empresas',usuarios:'Usuarios',sedes:'Sedes',personal:'Personal',inventario:'Inventario Global'};
document.getElementById('adminPageTitle').textContent=titles[section]||section;
}

// === ADMIN EQUIPO CRUD ===
function switchAdminTab(btn,tabId){
btn.parentElement.querySelectorAll('.tab-btn').forEach(t=>t.classList.remove('active'));btn.classList.add('active');
const form=btn.closest('form')||btn.closest('.modal__body');
form.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
document.getElementById(tabId).classList.add('active');
}

function toggleAdminTypeFields(){
const t=document.getElementById('aeqTipo').value;
document.getElementById('aeqPcFields').style.display=(t==='pcescritorio'||t==='notebook'||t==='servidor'||t==='computador')?'':'none';
document.getElementById('aeqPrinterFields').style.display=t==='impresora'?'':'none';
document.getElementById('aeqPhoneFields').style.display=(t==='celular'||t==='tablet')?'':'none';
document.getElementById('aeqServerFields').style.display=t==='servidor'?'':'none';
document.getElementById('aeqTabPerifericosBtn').style.display=(t==='pcescritorio'||t==='notebook'||t==='computador')?'':'none';
document.getElementById('aeqTabSoftwareBtn').style.display=t==='impresora'?'none':'';
}

async function loadAdminEquipoSelects(){
const empId=document.getElementById('aeqEmpresa').value;
const locSel=document.getElementById('aeqUbicacion');
const empSel=document.getElementById('aeqEmpleado');
if(!empId){
  locSel.innerHTML='<option value="">Seleccione empresa primero</option>';
  empSel.innerHTML='<option value="">Seleccione empresa primero</option>';
  return;
}
const locs=await DataManager.getUniqueLocations(empId);
locSel.innerHTML='<option value="">Sin asignar</option>'+locs.map(l=>`<option value="${l}">${l}</option>`).join('');
const personal=await DataManager.getPersonal(empId);
empSel.innerHTML='<option value="">Sin asignar</option>'+personal.map(p=>`<option value="${p.id}">${p.nombre} ${p.apellido} — ${p.cargo||''}</option>`).join('');
}

async function openAdminEquipoModal(id){
const isEdit=!!id;
document.getElementById('adminEquipoModalTitle').textContent=isEdit?'Editar Equipo':'Agregar Equipo';
document.getElementById('adminEquipoForm').reset();document.getElementById('aeqId').value='';
// Reset tabs
document.querySelectorAll('#modalAdminEquipo .tab-btn').forEach((t,i)=>t.classList.toggle('active',i===0));
document.querySelectorAll('#modalAdminEquipo .tab-content').forEach((c,i)=>c.classList.toggle('active',i===0));
await loadEmpresaSelects();
if(isEdit){
const e=await DataManager.getEquipo(id);if(!e)return;
document.getElementById('aeqId').value=e.id;
document.getElementById('aeqEmpresa').value=e.empresaId;
await loadAdminEquipoSelects();
document.getElementById('aeqTipo').value=e.tipo;document.getElementById('aeqEstado').value=e.estado;
document.getElementById('aeqMarca').value=e.marca;document.getElementById('aeqModelo').value=e.modelo;
document.getElementById('aeqSerial').value=e.serial;
setTimeout(()=>{
document.getElementById('aeqEmpleado').value=e.empleadoId||'';
document.getElementById('aeqUbicacion').value=e.ubicacion||'';
},0);
document.getElementById('aeqFechaCompra').value=e.fechaCompra||'';
document.getElementById('aeqGarantia').value=e.garantiaHasta||'';
document.getElementById('aeqProcesador').value=e.procesador||'';
document.getElementById('aeqRam').value=e.ram||'';document.getElementById('aeqDisco').value=e.disco||'';
document.getElementById('aeqTarjetaVideo').value=e.tarjetaVideo||'';
document.getElementById('aeqTipoImpresion').value=e.tipoImpresion||'';
document.getElementById('aeqConectividad').value=e.conectividad||'';
document.getElementById('aeqImei').value=e.imei||'';document.getElementById('aeqLinea').value=e.lineaTelefonica||'';
document.getElementById('aeqTipoServidor').value=e.tipoServidor||'';
document.getElementById('aeqAlmTotal').value=e.almacenamientoTotal||'';
document.getElementById('aeqOS').value=e.sistemaOperativo?e.sistemaOperativo.nombre:'';
document.getElementById('aeqOSVersion').value=e.sistemaOperativo?e.sistemaOperativo.version:'';
document.getElementById('aeqIP').value=e.direccionIP||'';document.getElementById('aeqNotas').value=e.notas||'';
document.getElementById('aeqPerTeclado').value=e.perTeclado||'';document.getElementById('aeqPerMouse').value=e.perMouse||'';
document.getElementById('aeqPerCamara').value=e.perCamara||'';document.getElementById('aeqPerAudifonos').value=e.perAudifonos||'';
document.getElementById('aeqPerParlantes').value=e.perParlantes||'';document.getElementById('aeqPerMonitor').value=e.perMonitor||'';
document.getElementById('aeqPerOtros').value=e.perOtros||'';
createAdminDynamicList('aeqListProgramas',[{key:'nombre',placeholder:'Programa'},{key:'version',placeholder:'Versión'}],e.programasInstalados||[]);
createAdminDynamicList('aeqListUnidades',[{key:'letra',placeholder:'Letra (Z:)'},{key:'ruta',placeholder:'Ruta (\\\\server\\share)'}],e.unidadesRed||[]);
createAdminDynamicList('aeqListImpresoras',[{key:'nombre',placeholder:'Nombre'},{key:'tipo',placeholder:'Tipo (red/usb)'},{key:'ip',placeholder:'IP'}],e.impresorasInstaladas||[]);
}else{
createAdminDynamicList('aeqListProgramas',[{key:'nombre',placeholder:'Programa'},{key:'version',placeholder:'Versión'}],[]);
createAdminDynamicList('aeqListUnidades',[{key:'letra',placeholder:'Letra (Z:)'},{key:'ruta',placeholder:'Ruta (\\\\server\\share)'}],[]);
createAdminDynamicList('aeqListImpresoras',[{key:'nombre',placeholder:'Nombre'},{key:'tipo',placeholder:'Tipo (red/usb)'},{key:'ip',placeholder:'IP'}],[]);
}
toggleAdminTypeFields();openModal('modalAdminEquipo');
}

function createAdminDynamicList(containerId,fields,items){
const c=document.getElementById(containerId);c.innerHTML='';
if(items.length===0)items=[{}];
items.forEach(item=>addAdminDynamicRow(containerId,fields,item));
}

function addAdminDynamicRow(containerId,fields,item={}){
const c=document.getElementById(containerId);
const row=document.createElement('div');row.className='dynamic-list-item';
fields.forEach(f=>{const inp=document.createElement('input');inp.className='form-control form-control-sm';inp.placeholder=f.placeholder;inp.value=item[f.key]||'';inp.dataset.key=f.key;row.appendChild(inp);});
const delBtn=document.createElement('button');delBtn.type='button';delBtn.className='btn-icon btn-danger-icon';delBtn.innerHTML='<i class="fas fa-times"></i>';delBtn.onclick=()=>row.remove();row.appendChild(delBtn);c.appendChild(row);
}

function addDynamicItem(containerId){
const c=document.getElementById(containerId);
let fields;
if(containerId.includes('Programas'))fields=[{key:'nombre',placeholder:'Programa'},{key:'version',placeholder:'Versión'}];
else if(containerId.includes('Unidades'))fields=[{key:'letra',placeholder:'Letra (Z:)'},{key:'ruta',placeholder:'Ruta (\\\\server\\share)'}];
else fields=[{key:'nombre',placeholder:'Nombre'},{key:'tipo',placeholder:'Tipo (red/usb)'},{key:'ip',placeholder:'IP'}];
addAdminDynamicRow(containerId,fields);
}

function getAdminListItems(containerId){
const rows=document.getElementById(containerId).querySelectorAll('.dynamic-list-item');
return Array.from(rows).map(row=>{
const obj={};row.querySelectorAll('input').forEach(inp=>{if(inp.dataset.key)obj[inp.dataset.key]=inp.value;});return obj;
});
}

async function saveAdminEquipo(e){
e.preventDefault();const id=document.getElementById('aeqId').value;
const empresaId=document.getElementById('aeqEmpresa').value;
const _v=v=>v||null; // Convert empty strings to null for DB compatibility
const data={empresaId,tipo:document.getElementById('aeqTipo').value,marca:document.getElementById('aeqMarca').value,modelo:document.getElementById('aeqModelo').value,serial:document.getElementById('aeqSerial').value,estado:document.getElementById('aeqEstado').value,empleadoId:_v(document.getElementById('aeqEmpleado').value),ubicacion:document.getElementById('aeqUbicacion').value,fechaCompra:_v(document.getElementById('aeqFechaCompra').value),garantiaHasta:_v(document.getElementById('aeqGarantia').value),precioEstimado:document.getElementById('aeqPrecio').value?parseFloat(document.getElementById('aeqPrecio').value):null,procesador:document.getElementById('aeqProcesador').value,ram:document.getElementById('aeqRam').value,disco:document.getElementById('aeqDisco').value,tarjetaVideo:document.getElementById('aeqTarjetaVideo').value,tipoImpresion:document.getElementById('aeqTipoImpresion').value,conectividad:document.getElementById('aeqConectividad').value,imei:document.getElementById('aeqImei').value,lineaTelefonica:document.getElementById('aeqLinea').value,tipoServidor:document.getElementById('aeqTipoServidor').value,almacenamientoTotal:document.getElementById('aeqAlmTotal').value,sistemaOperativo:{nombre:document.getElementById('aeqOS').value,version:document.getElementById('aeqOSVersion').value},direccionIP:document.getElementById('aeqIP').value,programasInstalados:getAdminListItems('aeqListProgramas').filter(p=>p.nombre),unidadesRed:getAdminListItems('aeqListUnidades').filter(u=>u.letra),impresorasInstaladas:getAdminListItems('aeqListImpresoras').filter(p=>p.nombre),notas:document.getElementById('aeqNotas').value, perTeclado:document.getElementById('aeqPerTeclado').value, perMouse:document.getElementById('aeqPerMouse').value, perCamara:document.getElementById('aeqPerCamara').value, perAudifonos:document.getElementById('aeqPerAudifonos').value, perParlantes:document.getElementById('aeqPerParlantes').value, perMonitor:document.getElementById('aeqPerMonitor').value, perOtros:document.getElementById('aeqPerOtros').value};
if(id)await DataManager.updateEquipo(id,data);else await DataManager.createEquipo(data);
closeModal('modalAdminEquipo');await renderAll();showNotification(id?'Equipo actualizado':'Equipo agregado','success');
}

async function deleteAdminEquipo(id){if(!confirm('¿Eliminar este equipo?'))return;await DataManager.deleteEquipo(id);await renderAll();showNotification('Equipo eliminado','success');}
