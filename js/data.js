// ===== DATA MANAGER (SUPABASE) =====
const DataManager = {
  init() {
    console.log("DataManager initialized with Supabase");
  },

  _handleError(error, context) {
    if (error) {
      console.error(`[DataManager] ${context}:`, error);
      if (typeof showNotification === 'function') {
        showNotification(`Error: ${error.message || error.details || 'Operación fallida'}`, 'error');
      }
    }
  },

  // === EMPRESAS ===
  async getEmpresas() {
    const { data, error } = await supabaseClient.from('empresas').select('*');
    if (error) this._handleError(error, 'getEmpresas');
    return data || [];
  },
  async getEmpresa(id) {
    const { data, error } = await supabaseClient.from('empresas').select('*').eq('id', id).single();
    if (error) this._handleError(error, 'getEmpresa');
    return data;
  },
  async createEmpresa(empresaData) {
    empresaData.id = generateId();
    const { data, error } = await supabaseClient.from('empresas').insert([empresaData]).select().single();
    if (error) { this._handleError(error, 'createEmpresa'); return null; }
    return data;
  },
  async updateEmpresa(id, updates) {
    const { data, error } = await supabaseClient.from('empresas').update(updates).eq('id', id).select().single();
    if (error) { this._handleError(error, 'updateEmpresa'); return null; }
    return data;
  },
  async deleteEmpresa(id) {
    const { error } = await supabaseClient.from('empresas').delete().eq('id', id);
    if (error) this._handleError(error, 'deleteEmpresa');
  },

  // === USUARIOS ===
  async getUsers() {
    const { data, error } = await supabaseClient.from('usuarios').select('*');
    if (error) this._handleError(error, 'getUsers');
    return data || [];
  },
  async getUser(id) {
    const { data, error } = await supabaseClient.from('usuarios').select('*').eq('id', id).single();
    if (error) this._handleError(error, 'getUser');
    return data;
  },
  async getUsersByEmpresa(empresaId) {
    const { data, error } = await supabaseClient.from('usuarios').select('*').eq('empresaId', empresaId);
    if (error) this._handleError(error, 'getUsersByEmpresa');
    return data || [];
  },
  async createUser(userData) {
    userData.id = generateId();
    const { data, error } = await supabaseClient.from('usuarios').insert([userData]).select().single();
    if (error) { this._handleError(error, 'createUser'); return null; }
    return data;
  },
  async updateUser(id, updates) {
    const { data, error } = await supabaseClient.from('usuarios').update(updates).eq('id', id).select().single();
    if (error) { this._handleError(error, 'updateUser'); return null; }
    return data;
  },
  async deleteUser(id) {
    const { error } = await supabaseClient.from('usuarios').delete().eq('id', id);
    if (error) this._handleError(error, 'deleteUser');
  },

  // === PERSONAL ===
  async getPersonal(empresaId) {
    let query = supabaseClient.from('personal').select('*');
    if (empresaId) query = query.eq('empresaId', empresaId);
    const { data, error } = await query;
    if (error) this._handleError(error, 'getPersonal');
    return data || [];
  },
  async getAllPersonal() {
    const { data, error } = await supabaseClient.from('personal').select('*');
    if (error) this._handleError(error, 'getAllPersonal');
    return data || [];
  },
  async getEmpleado(id) {
    const { data, error } = await supabaseClient.from('personal').select('*').eq('id', id).single();
    if (error) this._handleError(error, 'getEmpleado');
    return data;
  },
  async createEmpleado(empData) {
    empData.id = generateId();
    const { data, error } = await supabaseClient.from('personal').insert([empData]).select().single();
    if (error) { this._handleError(error, 'createEmpleado'); return null; }
    return data;
  },
  async updateEmpleado(id, updates) {
    const { data, error } = await supabaseClient.from('personal').update(updates).eq('id', id).select().single();
    if (error) { this._handleError(error, 'updateEmpleado'); return null; }
    return data;
  },
  async deleteEmpleado(id) {
    const { error } = await supabaseClient.from('personal').delete().eq('id', id);
    if (error) this._handleError(error, 'deleteEmpleado');
  },
  async getEmpleadoFullName(id) {
    if (!id) return 'Sin asignar';
    const emp = await this.getEmpleado(id);
    return emp ? `${emp.nombre} ${emp.apellido}` : 'Sin asignar';
  },
  async getEquiposByEmpleado(empleadoId) {
    const { data, error } = await supabaseClient.from('equipos').select('*').eq('empleadoId', empleadoId);
    if (error) this._handleError(error, 'getEquiposByEmpleado');
    return data || [];
  },

  // === EQUIPOS ===
  async getEquipos(empresaId) {
    let query = supabaseClient.from('equipos').select('*');
    if (empresaId) query = query.eq('empresaId', empresaId);
    const { data, error } = await query;
    if (error) this._handleError(error, 'getEquipos');
    return data || [];
  },
  async getAllEquipos() {
    const { data, error } = await supabaseClient.from('equipos').select('*');
    if (error) this._handleError(error, 'getAllEquipos');
    return data || [];
  },
  async getEquipo(id) {
    const { data, error } = await supabaseClient.from('equipos').select('*').eq('id', id).single();
    if (error) this._handleError(error, 'getEquipo');
    return data;
  },
  async createEquipo(eqData) {
    eqData.id = generateId();
    if (!eqData.fechaIngreso) eqData.fechaIngreso = new Date().toISOString();
    const { data, error } = await supabaseClient.from('equipos').insert([eqData]).select().single();
    if (error) { this._handleError(error, 'createEquipo'); return null; }
    return data;
  },
  async updateEquipo(id, updates) {
    const { data, error } = await supabaseClient.from('equipos').update(updates).eq('id', id).select().single();
    if (error) { this._handleError(error, 'updateEquipo'); return null; }
    return data;
  },
  async deleteEquipo(id) {
    const { error } = await supabaseClient.from('equipos').delete().eq('id', id);
    if (error) this._handleError(error, 'deleteEquipo');
  },

  // === STATS ===
  async getStats(empresaId) {
    const equipos = await this.getEquipos(empresaId);
    return {
      total: equipos.length,
      pcescritorio: equipos.filter(e => e.tipo === 'pcescritorio' || e.tipo === 'computador').length,
      notebooks: equipos.filter(e => e.tipo === 'notebook').length,
      impresoras: equipos.filter(e => e.tipo === 'impresora').length,
      celulares: equipos.filter(e => e.tipo === 'celular').length,
      tablets: equipos.filter(e => e.tipo === 'tablet').length,
      servidores: equipos.filter(e => e.tipo === 'servidor').length,
      activos: equipos.filter(e => e.estado === 'activo').length,
      mantenimiento: equipos.filter(e => e.estado === 'mantenimiento').length,
      baja: equipos.filter(e => e.estado === 'baja').length,
    };
  },

  // === SEARCH & FILTER ===
  async searchEquipos(empresaId, filters = {}) {
    let equipos = await this.getEquipos(empresaId);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const personal = await this.getPersonal(empresaId);
      const personalMap = new Map(personal.map(p => [p.id, `${p.nombre} ${p.apellido}`.toLowerCase()]));

      equipos = equipos.filter(e => {
        const empName = e.empleadoId ? personalMap.get(e.empleadoId) || '' : '';
        return (e.marca || '').toLowerCase().includes(s) || (e.modelo || '').toLowerCase().includes(s) ||
          (e.serial || '').toLowerCase().includes(s) || empName.includes(s) ||
          (e.ubicacion || '').toLowerCase().includes(s) || (e.direccionIP || '').toLowerCase().includes(s) ||
          (e.procesador || '').toLowerCase().includes(s) || (e.ram || '').toLowerCase().includes(s) ||
          (e.sistemaOperativo && e.sistemaOperativo.nombre || '').toLowerCase().includes(s);
      });
    }
    if (filters.tipo) equipos = equipos.filter(e => e.tipo === filters.tipo);
    if (filters.marca) equipos = equipos.filter(e => e.marca === filters.marca);
    if (filters.estado) equipos = equipos.filter(e => e.estado === filters.estado);
    if (filters.empleadoId) equipos = equipos.filter(e => e.empleadoId === filters.empleadoId);
    if (filters.ubicacion) equipos = equipos.filter(e => e.ubicacion === filters.ubicacion);
    if (filters.fechaDesde) equipos = equipos.filter(e => e.fechaIngreso >= filters.fechaDesde);
    if (filters.fechaHasta) equipos = equipos.filter(e => e.fechaIngreso <= filters.fechaHasta + 'T23:59:59');
    return equipos;
  },

  async getUniqueBrands(empresaId) {
    const equipos = await this.getEquipos(empresaId);
    return [...new Set(equipos.map(e => e.marca).filter(Boolean))].sort();
  },
  async getUniqueLocations(empresaId) {
    const emp = await this.getEmpresa(empresaId);
    return emp && emp.ubicaciones ? emp.ubicaciones : [];
  },

  async addUbicacion(empresaId, nombre) {
    const emp = await this.getEmpresa(empresaId);
    if(!emp) return;
    if(!emp.ubicaciones) emp.ubicaciones = [];
    if(!emp.ubicaciones.includes(nombre)) {
      emp.ubicaciones.push(nombre);
      await this.updateEmpresa(empresaId, { ubicaciones: emp.ubicaciones });
    }
  },

  async deleteUbicacion(empresaId, nombre) {
    const emp = await this.getEmpresa(empresaId);
    if(!emp || !emp.ubicaciones) return;
    emp.ubicaciones = emp.ubicaciones.filter(u => u !== nombre);
    await this.updateEmpresa(empresaId, { ubicaciones: emp.ubicaciones });
    
    // Clear location from affected equipment and personnel
    const equipos = await this.getEquipos(empresaId);
    const affectedEquipos = equipos.filter(e => e.ubicacion === nombre);
    for (let e of affectedEquipos) {
      await this.updateEquipo(e.id, { ubicacion: '' });
    }
    
    const personal = await this.getPersonal(empresaId);
    const affectedPersonal = personal.filter(p => p.ubicacion === nombre);
    for (let p of affectedPersonal) {
      await this.updateEmpleado(p.id, { ubicacion: '' });
    }
  },

  // === AUDIT LOG ===
  async logAudit(action, entity, entityId, entityName, empresaId, details) {
    try {
      const session = AuthManager.getSession();
      const logEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        userId: session ? session.userId : null,
        userName: session ? session.nombre : 'Sistema',
        action,
        entity,
        entityId,
        entityName: entityName || '',
        empresaId: empresaId || null,
        details: details || {}
      };
      await supabaseClient.from('audit_log').insert([logEntry]);
    } catch (err) {
      console.error('[Audit] Error logging:', err);
    }
  },

  async getAuditLog(filters = {}) {
    let query = supabaseClient.from('audit_log').select('*').order('timestamp', { ascending: false });
    if (filters.empresaId) query = query.eq('empresaId', filters.empresaId);
    if (filters.action) query = query.eq('action', filters.action);
    if (filters.entity) query = query.eq('entity', filters.entity);
    if (filters.userId) query = query.eq('userId', filters.userId);
    if (filters.fechaDesde) query = query.gte('timestamp', filters.fechaDesde);
    if (filters.fechaHasta) query = query.lte('timestamp', filters.fechaHasta + 'T23:59:59');
    query = query.limit(500);
    const { data, error } = await query;
    if (error) this._handleError(error, 'getAuditLog');
    return data || [];
  }
};

// Initialize on load
DataManager.init();
