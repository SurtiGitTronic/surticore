// js/supabaseClient.js

// URL y Key proporcionados
const supabaseUrl = 'https://najuwjjaspoxisjldmyh.supabase.co';
const supabaseAnonKey = 'sb_publishable_2Vd7ZXJCV3tNDD393IcQcg__6yCohZe';

// Inicializar el cliente de Supabase
const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// Hacemos el cliente disponible globalmente
window.supabaseClient = client;
