import React from 'react';
import { formatINR } from '../lib/formatters';

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface InvoiceReceiptData {
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  invoiceNumber: string;
  date: string;
  paymentMethod: string;
  storeName?: string;
  storeAddress?: string;
  gstin?: string;
}

interface InvoiceReceiptProps {
  data: InvoiceReceiptData | null;
  layout?: 'thermal' | 'a4';
}

export const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({ data, layout = 'thermal' }) => {
  if (!data) return null;

  return (
    <div className={`print-receipt ${layout}`}>
      <div className="print-header">
        <div className="print-store-name">{data.storeName || 'ShoppIQ Store'}</div>
        <div>{data.storeAddress || 'Store Address'}</div>
        {data.gstin && <div>GSTIN: {data.gstin}</div>}
      </div>

      <div className="print-divider" />

      <div>
        <div>Bill No: {data.invoiceNumber}</div>
        <div>Date: {data.date}</div>
        <div>Customer: {data.customerName} {data.customerPhone ? `(${data.customerPhone})` : ''}</div>
      </div>

      <div className="print-divider" />

      <table className="print-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td>{formatINR(Math.round(item.totalAmount))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-divider" />

      <div className="print-totals">
        <div className="print-total-row">
          <span>Subtotal:</span>
          <span>{formatINR(Math.round(data.subtotal))}</span>
        </div>
        {data.discount > 0 && (
          <div className="print-total-row">
            <span>Discount:</span>
            <span>-{formatINR(Math.round(data.discount))}</span>
          </div>
        )}
        <div className="print-total-row">
          <span>CGST:</span>
          <span>{formatINR(Math.round(data.cgst))}</span>
        </div>
        <div className="print-total-row">
          <span>SGST:</span>
          <span>{formatINR(Math.round(data.sgst))}</span>
        </div>
        
        <div className="print-total-row print-grand-total">
          <span>Total:</span>
          <span>{formatINR(Math.round(data.grandTotal))}</span>
        </div>
      </div>

      <div className="print-divider" />

      <div>Payment: {data.paymentMethod.toUpperCase()}</div>

      <div className="print-footer">
        <div>Thank you for shopping!</div>
        <div>Visit again</div>
        <div className="print-barcode">
          ||||| || ||| || ||||||
        </div>
      </div>
    </div>
  );
};
