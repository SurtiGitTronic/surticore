// ===== REPORTS MANAGER =====
const ReportsManager = {

  // Column definitions for export configuration
  EXPORT_COLUMNS: [
    { key: 'tipo', label: 'Tipo', getValue: (e) => e.tipo },
    { key: 'marca', label: 'Marca', getValue: (e) => e.marca },
    { key: 'modelo', label: 'Modelo', getValue: (e) => e.modelo },
    { key: 'serial', label: 'Serial', getValue: (e) => e.serial },
    { key: 'estado', label: 'Estado', getValue: (e) => e.estado },
    { key: 'asignado', label: 'Asignado a', getValue: (e, emp) => emp ? `${emp.nombre} ${emp.apellido}` : 'Sin asignar' },
    { key: 'cargo', label: 'Cargo', getValue: (e, emp) => emp ? emp.cargo : '' },
    { key: 'ubicacion', label: 'Ubicación', getValue: (e) => e.ubicacion || '' },
    { key: 'ip', label: 'IP', getValue: (e) => e.direccionIP || '' },
    { key: 'so', label: 'Sistema Operativo', getValue: (e) => e.sistemaOperativo ? `${e.sistemaOperativo.nombre} ${e.sistemaOperativo.version || ''}`.trim() : '' },
    { key: 'ram', label: 'RAM', getValue: (e) => e.ram || '' },
    { key: 'procesador', label: 'Procesador', getValue: (e) => e.procesador || '' },
    { key: 'disco', label: 'Disco', getValue: (e) => e.disco || '' },
    { key: 'fechaIngreso', label: 'Fecha Ingreso', getValue: (e) => formatDate(e.fechaIngreso) },
    { key: 'fechaCompra', label: 'Fecha Compra', getValue: (e) => formatDate(e.fechaCompra) },
    { key: 'garantia', label: 'Garantía Hasta', getValue: (e) => formatDate(e.garantiaHasta) },
  ],

  // Price column (special, not in the default grid)
  PRICE_COLUMN: { key: 'precio', label: 'Precio', getValue: (e) => e.precioEstimado ? parseFloat(e.precioEstimado) : 0 },

  /**
   * Format a currency value
   */
  formatPrice(val) {
    if (!val && val !== 0) return '$0';
    return '$' + Number(val).toLocaleString('es-CL', { maximumFractionDigits: 0 });
  },

  /**
   * Open the export configuration modal
   * @param {string} format - 'csv' or 'pdf'
   * @param {string} modalId - the modal element id
   * @param {Function} onExport - callback when user clicks export
   */
  openExportModal(format, modalId, onExport) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Set format badge
    const badge = modal.querySelector('.export-format-badge');
    if (badge) {
      const isCSV = format === 'csv';
      badge.innerHTML = `<i class="fas ${isCSV ? 'fa-file-csv' : 'fa-file-pdf'}"></i> ${isCSV ? 'CSV' : 'PDF'}`;
    }

    // Reset all checkboxes to checked
    modal.querySelectorAll('.export-col-check input[type="checkbox"]').forEach(cb => {
      cb.checked = true;
      cb.closest('.export-col-check').classList.add('checked');
    });

    // Reset toggles
    const priceToggle = modal.querySelector('.export-toggle-price');
    if (priceToggle) priceToggle.checked = false;
    const totalToggle = modal.querySelector('.export-toggle-total');
    if (totalToggle) totalToggle.checked = false;

    // Setup checkbox visual toggle
    modal.querySelectorAll('.export-col-check input[type="checkbox"]').forEach(cb => {
      cb.onchange = () => {
        cb.closest('.export-col-check').classList.toggle('checked', cb.checked);
      };
    });

    // Store callback and format
    modal._exportCallback = onExport;
    modal._exportFormat = format;

    openModal(modalId);
  },

  /**
   * Get selected export options from the modal
   */
  getExportOptions(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return {};

    const selectedColumns = [];
    modal.querySelectorAll('.export-col-check input[type="checkbox"]:checked').forEach(cb => {
      selectedColumns.push(cb.value);
    });

    const showPrice = modal.querySelector('.export-toggle-price')?.checked || false;
    const showTotal = modal.querySelector('.export-toggle-total')?.checked || false;

    return { selectedColumns, showPrice, showTotal };
  },

  /**
   * Execute export from modal
   */
  executeExportFromModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal || !modal._exportCallback) return;

    const options = this.getExportOptions(modalId);
    const format = modal._exportFormat;

    closeModal(modalId);
    modal._exportCallback(format, options);
  },

  /**
   * Toggle select all / deselect all
   */
  toggleSelectAll(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const checkboxes = modal.querySelectorAll('.export-col-check input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => {
      cb.checked = !allChecked;
      cb.closest('.export-col-check').classList.toggle('checked', cb.checked);
    });
    // Update button text
    const btn = modal.querySelector('.export-select-all button');
    if (btn) btn.textContent = allChecked ? 'Seleccionar todo' : 'Deseleccionar todo';
  },

  /**
   * Export to Excel/CSV with configurable columns
   */
  exportExcel(equipos, empresaNombre, personalMap, options = {}) {
    const columns = this._getActiveColumns(options);

    // Build header
    const headers = columns.map(c => c.label);
    const rows = [headers];

    // Build data rows
    equipos.forEach(e => {
      const emp = personalMap ? personalMap[e.empleadoId] : null;
      const row = columns.map(c => {
        if (c.key === 'precio') {
          const val = c.getValue(e);
          return val ? this.formatPrice(val) : '$0';
        }
        return c.getValue(e, emp);
      });
      rows.push(row);
    });

    // Add total row if requested
    if (options.showTotal) {
      const totalRow = columns.map((c, i) => {
        if (i === 0) return 'VALOR TOTAL DEL INVENTARIO';
        if (c.key === 'precio') {
          const total = equipos.reduce((s, e) => s + (parseFloat(e.precioEstimado) || 0), 0);
          return this.formatPrice(total);
        }
        return '';
      });
      rows.push([]); // empty spacer row
      rows.push(totalRow);
    }

    // Create CSV
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

  /**
   * Export to PDF (print-ready HTML) with configurable columns
   */
  exportPDF(equipos, empresaNombre, personalMap, logoBase64, options = {}) {
    const columns = this._getActiveColumns(options);

    // Build table headers
    const thRow = columns.map(c => `<th>${c.label}</th>`).join('');

    // Build table rows
    const empRows = equipos.map(e => {
      const emp = personalMap ? personalMap[e.empleadoId] : null;
      const cells = columns.map(c => {
        if (c.key === 'precio') {
          const val = c.getValue(e);
          return `<td style="text-align:right">${val ? this.formatPrice(val) : '$0'}</td>`;
        }
        return `<td>${c.getValue(e, emp) || '—'}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    // Total row
    let totalRowHtml = '';
    if (options.showTotal) {
      const total = equipos.reduce((s, e) => s + (parseFloat(e.precioEstimado) || 0), 0);
      const totalCells = columns.map((c, i) => {
        if (i === 0) return `<td style="font-weight:700;font-size:12px">VALOR TOTAL DEL INVENTARIO</td>`;
        if (c.key === 'precio') return `<td style="font-weight:700;text-align:right;font-size:12px;color:#c41230">${this.formatPrice(total)}</td>`;
        return '<td></td>';
      }).join('');
      totalRowHtml = `<tr style="background:#f0f0f0;border-top:2px solid #333">${totalCells}</tr>`;
    }

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
      <table><thead><tr>${thRow}</tr></thead>
      <tbody>${empRows}${totalRowHtml}</tbody></table>
      <div class="footer">Powered by Surtitronic — Sistema de Inventario IT</div>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
    showNotification('Reporte PDF generado — usa "Guardar como PDF" en el diálogo de impresión', 'info');
  },

  /**
   * Get active columns based on export options
   * @private
   */
  _getActiveColumns(options) {
    let columns;
    if (options.selectedColumns && options.selectedColumns.length > 0) {
      columns = this.EXPORT_COLUMNS.filter(c => options.selectedColumns.includes(c.key));
    } else {
      columns = [...this.EXPORT_COLUMNS];
    }

    // Add price column if requested
    if (options.showPrice) {
      columns.push(this.PRICE_COLUMN);
    }

    return columns;
  },

  printReport() {
    window.print();
  }
};
