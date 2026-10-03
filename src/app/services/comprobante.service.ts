import { Service } from '@angular/core';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Compra } from '../interfaces/Compra';

const LEYENDA_ADULTO = 'Película con restricción de edad: el menor debe asistir acompañado de un adulto.';

// Generación de QR (librería qrcode), PDF (jsPDF) y CSV para Excel. Ver docs/decisiones.md.
@Service()
export class ComprobanteService {
  // El QR contiene solo el código de la compra; el empleado lo busca en la base
  generarQr(codigo: string) {
    return QRCode.toDataURL(codigo, {
      width: 320,
      margin: 1,
      color: { dark: '#13100e', light: '#ffffff' },
    });
  }

  // PDF de la entrada: se arma con los datos de la compra y el QR
  async descargarEntrada(compra: Compra) {
    const qr = await this.generarQr(compra.codigo);
    const funcion = compra.funciones!;
    const inicio = new Date(funcion.inicio);
    const doc = new jsPDF({ unit: 'mm', format: [90, 170] });

    // Encabezado con la marca
    doc.setFillColor(19, 16, 14);
    doc.rect(0, 0, 90, 24, 'F');
    doc.setFillColor(242, 165, 65);
    doc.roundedRect(6, 6, 12, 12, 2, 2, 'F');
    doc.setTextColor(19, 16, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('F', 12, 14, { align: 'center' });
    doc.setTextColor(243, 236, 226);
    doc.setFontSize(16);
    doc.text('Fotograma', 22, 14.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Entrada de cine', 22, 19);

    // Datos de la función
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(doc.splitTextToSize(compra.peliculas?.nombre ?? '', 78), 6, 33);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let y = 44;
    const filas: [string, string][] = [
      ['Fecha', inicio.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })],
      ['Hora', inicio.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })],
      ['Sala', funcion.salas?.nombre ?? ''],
      ['Formato', `${funcion.formato} · ${funcion.idioma}`],
      [
        'Butacas',
        (compra.entradas ?? []).map((e) => `${e.fila}${e.numero}${e.tipo === 'vip' ? ' (VIP)' : ''}`).join(', '),
      ],
    ];
    for (const [titulo, valor] of filas) {
      doc.setTextColor(120, 110, 100);
      doc.text(titulo, 6, y);
      doc.setTextColor(20, 20, 20);
      const lineas = doc.splitTextToSize(valor, 56);
      doc.text(lineas, 28, y);
      y += 5 * lineas.length;
    }

    const items = compra.compra_items ?? [];
    if (items.length > 0) {
      doc.setTextColor(120, 110, 100);
      doc.text('Candy', 6, y);
      doc.setTextColor(20, 20, 20);
      for (const item of items) {
        doc.text(`${item.cantidad} × ${item.nombre}`, 28, y);
        y += 5;
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $ ${Number(compra.total).toLocaleString('es-AR')}`, 6, y + 2);
    doc.setFont('helvetica', 'normal');

    // QR + código para tipear a mano
    doc.addImage(qr, 'PNG', 20, y + 7, 50, 50);
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);
    doc.text(compra.codigo, 45, y + 63, { align: 'center' });

    if (compra.requiere_adulto) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 50, 40);
      doc.text(doc.splitTextToSize(LEYENDA_ADULTO, 78), 6, y + 70);
    }

    doc.save(`entrada-${compra.codigo}.pdf`);
  }

  // Reporte de facturación en PDF: una tabla simple
  descargarReportePdf(titulo: string, encabezados: string[], filas: (string | number)[][]) {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Fotograma — ${titulo}`, 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, 14, 25);

    const anchoColumna = 182 / encabezados.length;
    let y = 36;
    doc.setFont('helvetica', 'bold');
    encabezados.forEach((e, i) => doc.text(e, 14 + i * anchoColumna, y));
    doc.line(14, y + 2, 196, y + 2);
    doc.setFont('helvetica', 'normal');

    for (const fila of filas) {
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      fila.forEach((valor, i) => doc.text(String(valor), 14 + i * anchoColumna, y));
    }
    doc.save(`${titulo.toLowerCase().replaceAll(' ', '-')}.pdf`);
  }

  // Excel: se genera un CSV (separado por ";" para que Excel en español lo abra en columnas)
  descargarCsv(nombre: string, encabezados: string[], filas: (string | number)[][]) {
    const lineas = [encabezados, ...filas].map((fila) =>
      fila.map((valor) => `"${String(valor).replaceAll('"', '""')}"`).join(';'),
    );
    // ﻿ (BOM) para que Excel respete los acentos
    const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
