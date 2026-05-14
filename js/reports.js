// ===== REPORTS MANAGER =====
const ReportsManager = {
  exportExcel(equipos, empresaNombre, personalMap) {
    const rows = [['Tipo', 'Marca', 'Modelo', 'Serial', 'Estado', 'Asignado a', 'Cargo', 'Ubicación', 'IP', 'Sistema Operativo', 'RAM', 'Procesador', 'Disco', 'Fecha Ingreso', 'Fecha Compra', 'Garantía Hasta']];
    equipos.forEach(e => {
      const emp = personalMap ? personalMap[e.empleadoId] : null;
      rows.push([
        e.tipo, e.marca, e.modelo, e.serial, e.estado,
        emp ? `${emp.nombre} ${emp.apellido}` : 'Sin asignar',
        emp ? emp.cargo : '',
        e.ubicacion || '',
        e.direccionIP || '',
        e.sistemaOperativo ? `${e.sistemaOperativo.nombre} ${e.sistemaOperativo.version}` : '',
        e.ram || '', e.procesador || '', e.disco || '',
        formatDate(e.fechaIngreso), formatDate(e.fechaCompra), formatDate(e.garantiaHasta)
      ]);
    });

    // Create CSV (simpler, no external lib needed)
    const csv = rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventario_${empresaNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Archivo CSV exportado correctamente', 'success');
  },

  exportPDF(equipos, empresaNombre, personalMap, logoBase64) {
    // Create a printable HTML document
    const empRows = equipos.map(e => {
      const emp = personalMap ? personalMap[e.empleadoId] : null;
      const assignedName = emp ? `${emp.nombre} ${emp.apellido}` : 'Sin asignar';
      const os = e.sistemaOperativo ? `${e.sistemaOperativo.nombre} ${e.sistemaOperativo.version || ''}` : '—';
      return `<tr>
        <td>${e.tipo}</td><td>${e.marca} ${e.modelo}</td><td>${e.serial}</td>
        <td>${e.estado}</td><td>${assignedName}</td><td>${e.ubicacion || '—'}</td>
        <td>${e.direccionIP || '—'}</td><td>${os}</td><td>${formatDate(e.fechaIngreso)}</td>
      </tr>`;
    }).join('');

    const logoHtml = logoBase64 ? `<img src="${logoBase64}" style="height:40px;margin-bottom:8px">` : '';
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Inventario IT - ${empresaNombre}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;color:#333;font-size:12px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #333}
        .header h1{font-size:18px;margin:4px 0}
        .header p{color:#666;font-size:11px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th{background:#f0f0f0;padding:8px 6px;text-align:left;font-size:10px;text-transform:uppercase;border:1px solid #ddd}
        td{padding:6px;border:1px solid #ddd;font-size:11px}
        tr:nth-child(even){background:#f9f9f9}
        .footer{margin-top:20px;text-align:center;font-size:10px;color:#999;border-top:1px solid #ddd;padding-top:10px}
        .stats{display:flex;gap:20px;margin-bottom:16px;justify-content:center}
        .stat{text-align:center}
        .stat strong{font-size:18px;display:block}
      </style></head><body>
      <div class="header">${logoHtml}<h1>Inventario de Activos IT</h1><p>${empresaNombre} — Generado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}</p></div>
      <div class="stats">
        <div class="stat"><strong>${equipos.length}</strong>Total</div>
        <div class="stat"><strong>${equipos.filter(e=>e.estado==='activo').length}</strong>Activos</div>
        <div class="stat"><strong>${equipos.filter(e=>e.estado==='mantenimiento').length}</strong>Mantención</div>
        <div class="stat"><strong>${equipos.filter(e=>e.estado==='baja').length}</strong>Baja</div>
      </div>
      <table><thead><tr><th>Tipo</th><th>Equipo</th><th>Serial</th><th>Estado</th><th>Asignado a</th><th>Ubicación</th><th>IP</th><th>S.O.</th><th>Ingreso</th></tr></thead>
      <tbody>${empRows}</tbody></table>
      <div class="footer">Powered by Surtitronic — Sistema de Inventario IT</div>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
    showNotification('Reporte PDF generado — usa "Guardar como PDF" en el diálogo de impresión', 'info');
  },

  printReport() {
    window.print();
  }
};
