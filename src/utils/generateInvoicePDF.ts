import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InvoicePDFData {
  invoiceNumber: string;
  invoiceDate: string;
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

// ── PDF-safe formatters (no Unicode symbols, no emojis) ─────
function formatAmount(amount: number): string {
  const num = parseFloat(String(amount)) || 0;
  return 'Rs. ' + num.toFixed(2);
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  const num = digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits;
  if (num.length === 10) {
    return '+91 ' + num.slice(0, 5) + ' ' + num.slice(5);
  }
  return '+91 ' + num;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function paymentLabel(method: string): string {
  switch (method) {
    case 'cash': return 'Cash';
    case 'upi': return 'UPI';
    case 'credit': return 'Credit';
    case 'card': return 'Card';
    case 'mixed': return 'Mixed';
    default: return method;
  }
}

export function generateInvoicePDF(data: InvoicePDFData): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Colors as RGB arrays
  const purple: [number, number, number] = [109, 40, 217];
  const darkText: [number, number, number] = [31, 41, 55];
  const mutedText: [number, number, number] = [107, 114, 128];

  // ── HEADER ────────────────────────────────────────────────
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
    doc.text('Phone: ' + formatPhone(data.businessPhone), margin, y);
    y += 4;
  }
  if (data.businessAddress) {
    const addrLines = doc.splitTextToSize(data.businessAddress, 90);
    doc.text(addrLines, margin, y);
    y += addrLines.length * 4;
  }
  if (data.gstin) {
    doc.text('GSTIN: ' + data.gstin, margin, y);
    y += 4;
  }

  // Invoice details (right)
  const rightX = pageWidth - margin;
  let ry = 28;
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  doc.text('Invoice #: ' + data.invoiceNumber, rightX, ry, { align: 'right' });
  ry += 5;
  doc.text('Date: ' + formatDate(data.invoiceDate), rightX, ry, { align: 'right' });
  ry += 5;
  doc.text('Payment: ' + paymentLabel(data.paymentMethod), rightX, ry, { align: 'right' });

  y = Math.max(y, ry) + 8;

  // Separator
  doc.setDrawColor(...purple);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── BILL TO ───────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...purple);
  doc.text('BILL TO', margin, y);
  y += 5;

  const isWalkIn = !data.customerName || data.customerName === 'Walk-in Customer';

  if (isWalkIn) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(...mutedText);
    doc.text('Walk-in Customer', margin, y);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...darkText);
    doc.text(data.customerName, margin, y);
  }
  y += 5;

  if (data.customerPhone && !isWalkIn) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...mutedText);
    doc.text('Phone: ' + formatPhone(data.customerPhone), margin, y);
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
    formatAmount(item.unitPrice),
    item.gstRate + '%',
    formatAmount(item.totalAmount),
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
      font: 'helvetica',
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: darkText,
      font: 'helvetica',
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── TOTALS (right aligned) ────────────────────────────────
  const totalsX = pageWidth - margin - 75;
  const valX = pageWidth - margin;

  const drawRow = (label: string, value: string, bold = false, fontSize = 10) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(...(bold ? darkText : mutedText));
    doc.text(label, totalsX, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...darkText);
    doc.text(value, valX, y, { align: 'right' });
    y += bold ? 7 : 5.5;
  };

  drawRow('Subtotal', formatAmount(data.subtotal));

  if (data.discountAmount > 0) {
    drawRow('Discount', '- ' + formatAmount(data.discountAmount));
  }

  // Show GST with rate hint if possible
  if (data.cgstTotal > 0) {
    drawRow('CGST', formatAmount(data.cgstTotal));
  }
  if (data.sgstTotal > 0) {
    drawRow('SGST', formatAmount(data.sgstTotal));
  }

  // Line above grand total
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(totalsX, y, valX, y);
  y += 5;

  // Grand Total — bold, larger
  drawRow('Grand Total', formatAmount(data.grandTotal), true, 13);

  // Payment status if partial
  if (data.amountPaid > 0 && data.amountPending > 0) {
    y += 2;
    drawRow('Paid', formatAmount(data.amountPaid));
    doc.setTextColor(220, 38, 38);
    drawRow('Due', formatAmount(data.amountPending));
  }

  // ── FOOTER ────────────────────────────────────────────────
  y += 12;

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...darkText);
  doc.text('Thank you for shopping with us!', pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(8);
  doc.setTextColor(...mutedText);
  doc.text('Powered by ShoppIQ - Dukaan se Digital tak', pageWidth / 2, y, { align: 'center' });

  // ── SAVE ──────────────────────────────────────────────────
  const dateStr = formatDate(data.invoiceDate).replace(/ /g, '');
  const filename = 'ShoppIQ-' + data.invoiceNumber + '-' + dateStr + '.pdf';
  doc.save(filename);
}
