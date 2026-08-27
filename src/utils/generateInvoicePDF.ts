import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD or display format
  customerName: string;
  customerPhone: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    gstRate: number;
    totalAmount: number;
  }>;
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  discountAmount: number;
  grandTotal: number;
  amountPaid: number;
  amountPending: number;
  paymentMethod: string;
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
  gstin?: string;
}

function formatINR(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function generateInvoicePDF(data: InvoicePDFData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Colors ────────────────────────────────────────────────
  const purple = [109, 40, 217] as [number, number, number];
  const darkText = [31, 41, 55] as [number, number, number];
  const mutedText = [107, 114, 128] as [number, number, number];


  // ── HEADER: Business Name + Invoice Label ─────────────────
  // Business name (left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...darkText);
  doc.text(data.businessName || 'ShoppIQ Store', margin, y + 7);

  // INVOICE label (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...purple);
  doc.text('INVOICE', pageWidth - margin, y + 7, { align: 'right' });

  y += 14;

  // Business details (left)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  if (data.businessPhone) {
    doc.text(`Phone: ${data.businessPhone}`, margin, y);
    y += 4;
  }
  if (data.businessAddress) {
    const addrLines = doc.splitTextToSize(data.businessAddress, contentWidth / 2);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 4;
  }
  if (data.gstin) {
    doc.text(`GSTIN: ${data.gstin}`, margin, y);
    y += 4;
  }

  // Invoice details (right side, aligned with business details)
  const rightX = pageWidth - margin;
  let ry = 28;
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  doc.text(`Invoice #: ${data.invoiceNumber}`, rightX, ry, { align: 'right' });
  ry += 5;
  doc.text(`Date: ${formatDate(data.invoiceDate)}`, rightX, ry, { align: 'right' });
  ry += 5;
  const payLabel = data.paymentMethod === 'upi' ? 'UPI' : data.paymentMethod === 'cash' ? 'Cash' : data.paymentMethod === 'credit' ? 'Credit' : data.paymentMethod;
  doc.text(`Payment: ${payLabel}`, rightX, ry, { align: 'right' });

  y = Math.max(y, ry) + 6;

  // ── Separator Line ────────────────────────────────────────
  doc.setDrawColor(...purple);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── BILL TO Section ───────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...purple);
  doc.text('BILL TO', margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkText);
  doc.text(data.customerName || 'Walk-in Customer', margin, y);
  y += 5;

  if (data.customerPhone) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mutedText);
    doc.text(`Phone: ${data.customerPhone}`, margin, y);
    y += 5;
  }
  y += 4;

  // ── ITEMS TABLE ───────────────────────────────────────────
  const tableHeaders = [['#', 'Product', 'Qty', 'Unit', 'Rate', 'GST%', 'Amount']];
  const tableBody = data.items.map((item, i) => [
    String(i + 1),
    item.productName.length > 30 ? item.productName.slice(0, 30) + '...' : item.productName,
    String(item.quantity),
    item.unit || 'pc',
    formatINR(item.unitPrice),
    `${item.gstRate}%`,
    formatINR(item.totalAmount),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: purple,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: darkText,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
    didDrawPage: () => {},
  });

  // Get Y position after table
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── TOTALS SECTION (right aligned) ────────────────────────
  const totalsX = pageWidth - margin - 70;
  const valX = pageWidth - margin;

  const drawTotalRow = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 9);
    doc.setTextColor(...(bold ? darkText : mutedText));
    doc.text(label, totalsX, y);
    doc.setTextColor(...darkText);
    doc.text(value, valX, y, { align: 'right' });
    y += bold ? 7 : 5;
  };

  drawTotalRow('Subtotal', formatINR(data.subtotal));

  if (data.discountAmount > 0) {
    drawTotalRow('Discount', `- ${formatINR(data.discountAmount)}`);
  }

  if (data.cgstTotal > 0) {
    drawTotalRow('CGST', formatINR(data.cgstTotal));
  }
  if (data.sgstTotal > 0) {
    drawTotalRow('SGST', formatINR(data.sgstTotal));
  }

  // Separator before grand total
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(totalsX, y, valX, y);
  y += 5;

  // Grand Total
  drawTotalRow('Grand Total', formatINR(data.grandTotal), true);

  if (data.amountPaid > 0 && data.amountPending > 0) {
    y += 2;
    drawTotalRow('Paid', formatINR(data.amountPaid));
    doc.setTextColor(220, 38, 38);
    drawTotalRow('Due', formatINR(data.amountPending));
  }

  // ── FOOTER ────────────────────────────────────────────────
  y += 10;

  // Thin line
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Thank you message
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  doc.text('Thank you for shopping with us! 🙏', pageWidth / 2, y, { align: 'center' });
  y += 7;

  // Powered by
  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text('Powered by ShoppIQ — Dukaan se Digital tak', pageWidth / 2, y, { align: 'center' });

  // ── SAVE / DOWNLOAD ───────────────────────────────────────
  const dateStr = new Date(data.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '');
  const filename = `ShoppIQ-${data.invoiceNumber}-${dateStr}.pdf`;

  doc.save(filename);
}
