// ===== AUTH MANAGER =====
const AuthManager = {
  SESSION_KEY: 'inventario_session',

  async login(username, password) {
    const { data: users, error } = await supabaseClient
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .eq('activo', true);

    if (error || !users || users.length === 0) return null;
    const user = users[0];
    
    const session = { userId: user.id, username: user.username, nombre: user.nombre, rol: user.rol, empresaId: user.empresaId, permisos: user.permisos };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    window.location.href = 'index.html';
  },

  getSession() {
    const data = sessionStorage.getItem(this.SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  isLoggedIn() {
    return this.getSession() !== null;
  },

  isAdmin() {
    const s = this.getSession();
    return s && s.rol === 'admin';
  },

  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = 'index.html'; return false; }
    return true;
  },

  requireAdmin() {
    if (!this.isLoggedIn() || !this.isAdmin()) { window.location.href = 'index.html'; return false; }
    return true;
  },

  canCreate() { const s = this.getSession(); return s && (s.rol === 'admin' || (s.permisos && s.permisos.canCreate)); },
  canEdit() { const s = this.getSession(); return s && (s.rol === 'admin' || (s.permisos && s.permisos.canEdit)); },
  canDelete() { const s = this.getSession(); return s && (s.rol === 'admin' || (s.permisos && s.permisos.canDelete)); },
};
