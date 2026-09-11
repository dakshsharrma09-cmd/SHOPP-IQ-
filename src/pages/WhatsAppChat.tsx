import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeInvoices, subscribeProducts } from '../lib/firestoreService';
import { formatINR } from '../lib/formatters';
import type { Invoice, Product } from '../types/firestore';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  quickReplies?: QuickReply[];
}

interface QuickReply {
  label: string;
  command: string;
}

const defaultQuickReplies: QuickReply[] = [
  { label: 'आज की बिक्री', command: 'aaj ki bikri' },
  { label: 'Stock Check', command: 'stock check' },
  { label: 'Pending Payment', command: 'pending payment' },
  { label: 'नया बिल', command: 'naya bill' },
];

const HELP_COMMANDS = [
  { cmd: 'aaj ki bikri / today sales', desc: 'आज की कुल बिक्री देखें' },
  { cmd: 'stock check', desc: 'कम स्टॉक वाले प्रोडक्ट देखें' },
  { cmd: 'pending payment', desc: 'बाकी भुगतान देखें' },
  { cmd: 'top product', desc: 'आज का सबसे बिकने वाला प्रोडक्ट' },
  { cmd: 'naya bill', desc: 'नया बिल बनाने जाएं' },
  { cmd: 'total customers', desc: 'कुल ग्राहकों की संख्या' },
  { cmd: 'help / menu', desc: 'सब कमांड देखें' },
];

export default function WhatsAppChat() {
  const { tenant, tenantId } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeInvoices(tenantId, setInvoices);
    const unsub2 = subscribeProducts(tenantId, setProducts);
    return () => { unsub1(); unsub2(); };
  }, [tenantId]);

  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      text: `नमस्ते ${tenant?.ownerName || 'Boss'}! \n\nमैं ShoppIQ Bot हूँ — आपका डिजिटल दुकान सहायक।\n\nमुझसे कुछ भी पूछो — बिक्री, स्टॉक, बाकी पैसे, कुछ भी!\n\nनीचे बटन दबाओ या "help" लिखो सब कमांड देखने के लिए।`,
      sender: 'bot',
      timestamp: new Date(),
      quickReplies: defaultQuickReplies,
    };
    setMessages([welcomeMsg]);
  }, [tenant?.ownerName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addBotMessage = (text: string, quickReplies?: QuickReply[]) => {
    const msg: ChatMessage = {
      id: `bot-${Date.now()}`,
      text,
      sender: 'bot',
      timestamp: new Date(),
      quickReplies: quickReplies || defaultQuickReplies,
    };
    setMessages(prev => [...prev, msg]);
  };

  const processCommand = (input: string) => {
    const cmd = input.toLowerCase().trim();

    if (cmd.includes('aaj ki bikri') || cmd.includes('today sales') || cmd.includes('aaj') || cmd.includes('bikri')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayInvoices = invoices.filter(inv => {
        const invDate = inv.invoiceDate?.seconds ? new Date(inv.invoiceDate.seconds * 1000) : new Date();
        return invDate >= today;
      });
      const totalSales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const billCount = todayInvoices.length;

      if (billCount === 0) {
        addBotMessage('*आज की बिक्री*\n\nआज अभी तक कोई बिल नहीं बना।\n\nबिल बनाने के लिए "नया बिल" बोलो!');
      } else {
        addBotMessage(
          `*आज की बिक्री*\n\n` +
          `कुल बिक्री: *${formatINR(totalSales)}*\n` +
          `बिलों की संख्या: *${billCount}*\n` +
          `औसत बिल: *${formatINR(totalSales / billCount)}*\n\n` +
          `${billCount >= 10 ? 'शानदार! आज तो धमाल मचा दिया!' : 'चलो और बिल बनाओ!'}`
        );
      }
      return;
    }

    if (cmd.includes('stock') || cmd.includes('maal') || cmd.includes('माल')) {
      const lowStock = products.filter(p => p.currentStock <= p.minimumStockAlert && p.isActive);
      const outOfStock = products.filter(p => p.currentStock === 0 && p.isActive);

      if (lowStock.length === 0 && outOfStock.length === 0) {
        addBotMessage('*Stock Status*\n\nसब कुछ सही है! कोई प्रोडक्ट कम स्टॉक में नहीं है।\n\nबहुत बढ़िया!');
      } else {
        let msg = '*Stock Alert*\n\n';
        if (outOfStock.length > 0) {
          msg += '*स्टॉक खत्म:*\n';
          outOfStock.slice(0, 5).forEach(p => {
            msg += ` • ${p.name}\n`;
          });
          msg += '\n';
        }
        if (lowStock.length > 0) {
          msg += '*कम स्टॉक:*\n';
          lowStock.slice(0, 5).forEach(p => {
            msg += ` • ${p.name} — ${p.currentStock} ${p.unit} बाकी\n`;
          });
        }
        msg += `\nकुल ${lowStock.length + outOfStock.length} प्रोडक्ट पर ध्यान दो!`;
        addBotMessage(msg);
      }
      return;
    }

    if (cmd.includes('pending') || cmd.includes('baaki') || cmd.includes('udhar') || cmd.includes('बाकी') || cmd.includes('उधार')) {
      const pendingInvoices = invoices.filter(inv => inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'partial' || inv.paymentStatus === 'overdue');
      const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amountPending, 0);

      if (pendingInvoices.length === 0) {
        addBotMessage('*बाकी भुगतान*\n\nकोई बाकी पैसा नहीं है!\n\nसब का भुगतान हो चुका है!');
      } else {
        let msg = `*बाकी भुगतान*\n\n`;
        msg += `कुल बाकी: *${formatINR(totalPending)}*\n`;
        msg += `बाकी बिल: *${pendingInvoices.length}*\n\n`;
        msg += '*टॉप बाकीदार:*\n';
        pendingInvoices
          .sort((a, b) => b.amountPending - a.amountPending)
          .slice(0, 5)
          .forEach(inv => {
            msg += ` • ${inv.customerName}: ${formatINR(inv.amountPending)}\n`;
          });
        msg += `\n"भुगतान" पेज पर जाकर रिमाइंडर भेजो!`;
        addBotMessage(msg);
      }
      return;
    }

    if (cmd.includes('top product') || cmd.includes('best') || cmd.includes('sabse zyada') || cmd.includes('सबसे')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayInvoices = invoices.filter(inv => {
        const invDate = inv.invoiceDate?.seconds ? new Date(inv.invoiceDate.seconds * 1000) : new Date();
        return invDate >= today;
      });

      const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
      todayInvoices.forEach(inv => {
        inv.items?.forEach(item => {
          if (!productSales[item.productName]) {
            productSales[item.productName] = { name: item.productName, qty: 0, revenue: 0 };
          }
          productSales[item.productName].qty += item.quantity;
          productSales[item.productName].revenue += item.totalAmount;
        });
      });

      const sorted = Object.values(productSales).sort((a, b) => b.revenue - a.revenue);

      if (sorted.length === 0) {
        addBotMessage('*टॉप प्रोडक्ट*\n\nआज अभी तक कोई बिक्री नहीं हुई।\n\nपहला बिल बनाओ!');
      } else {
        let msg = '*आज के टॉप प्रोडक्ट*\n\n';
        sorted.slice(0, 5).forEach((p) => {
          msg += `• ${p.name}\n  ${p.qty} बेचे — ${formatINR(p.revenue)}\n`;
        });
        addBotMessage(msg);
      }
      return;
    }

    if (cmd.includes('naya bill') || cmd.includes('new bill') || cmd.includes('bill banao') || cmd.includes('बिल')) {
      addBotMessage('*नया बिल*\n\nबिल बनाने के लिए बिलिंग पेज पर जा रहे हैं...\n\n2 सेकंड में redirect होगा!');
      setTimeout(() => navigate('/billing/new'), 2000);
      return;
    }

    if (cmd.includes('customer') || cmd.includes('grahak') || cmd.includes('ग्राहक')) {
      const uniqueCustomers = new Set(invoices.map(inv => inv.customerName).filter(Boolean));
      addBotMessage(`*ग्राहक जानकारी*\n\nकुल ग्राहक (बिल से): *${uniqueCustomers.size}*\n\nज़्यादा details के लिए "ग्राहक" पेज देखो!`);
      return;
    }

    if (cmd.includes('help') || cmd.includes('menu') || cmd.includes('मदद')) {
      let msg = '*ShoppIQ Bot Commands*\n\n';
      HELP_COMMANDS.forEach(c => {
        msg += `▸ *${c.cmd}*\n  ${c.desc}\n\n`;
      });
      msg += 'कोई भी कमांड लिखो या नीचे बटन दबाओ!';
      addBotMessage(msg);
      return;
    }

    if (cmd.includes('report') || cmd.includes('summary')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayInvoices = invoices.filter(inv => {
        const invDate = inv.invoiceDate?.seconds ? new Date(inv.invoiceDate.seconds * 1000) : new Date();
        return invDate >= today;
      });
      const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      const invoiceCount = todayInvoices.length;
      const lowStockCount = products.filter(p => p.currentStock <= p.minimumStockAlert && p.isActive).length;
      const pendingInvoices = invoices.filter(inv => inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'partial' || inv.paymentStatus === 'overdue');
      const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + inv.amountPending, 0);
      const pendingCount = pendingInvoices.length;
      const customerCount = new Set(invoices.map(inv => inv.customerName).filter(Boolean)).size;

      const productSales: Record<string, number> = {};
      todayInvoices.forEach(inv => {
        inv.items?.forEach(item => {
          productSales[item.productName] = (productSales[item.productName] || 0) + item.totalAmount;
        });
      });
      const sortedProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]);
      const topProductName = sortedProducts.length > 0 ? sortedProducts[0][0] : 'None';

      const msg = `Daily Report — ShoppIQ
━━━━━━━━━━━━━━━━━
Aaj ki bikri: ₹${todaySales} (${invoiceCount} bills)
Low stock: ${lowStockCount} products
Pending payment: ₹${pendingTotal} (${pendingCount} invoices)
Total customers: ${customerCount}
Top product: ${topProductName}
━━━━━━━━━━━━━━━━━`;
      addBotMessage(msg);
      return;
    }

    addBotMessage(
      `समझ नहीं आया: "${input}"\n\n"help" लिखो सब कमांड देखने के लिए, या नीचे बटन दबाओ!`,
      defaultQuickReplies
    );
  };

  const handleSend = (text?: string) => {
    const msgText = text || inputText.trim();
    if (!msgText) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: msgText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      processCommand(msgText);
    }, 600 + Math.random() * 400);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto bg-gray-50 border-x border-gray-200" style={{ fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif" }}>
      <div className="flex items-center gap-3 px-4 py-3 bg-[#075E54]">
        <button onClick={() => navigate('/dashboard')} className="md:hidden text-white/80 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="relative">
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-200">
            <Bot size={18} className="text-gray-700" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#25D366] rounded-full border-2 border-[#075E54]" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-medium text-sm">ShoppIQ Bot</h3>
          <p className="text-white/70 text-xs">
            {isTyping ? 'typing...' : 'online'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[#efeae2]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded px-3 py-1.5 shadow-sm relative text-sm"
                style={{
                  background: msg.sender === 'user' ? '#DCF8C6' : '#FFFFFF',
                  borderRadius: '6px'
                }}
              >
                {msg.sender === 'bot' && (
                  <div className="text-gray-500 text-[11px] font-medium mb-0.5">ShoppIQ Bot</div>
                )}
                <div className="text-gray-900 leading-relaxed whitespace-pre-line">
                  {msg.text.split(/\*([^*]+)\*/g).map((part, i) =>
                    i % 2 === 1
                      ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>
                <div className="flex justify-end mt-0.5">
                  <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
                  {msg.sender === 'user' && (
                    <span className="text-[#53BDEB] text-[10px] ml-1">✓✓</span>
                  )}
                </div>
              </div>
            </div>

            {msg.quickReplies && msg.sender === 'bot' && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 ml-1">
                {msg.quickReplies.map((qr) => (
                  <button
                    key={qr.command}
                    onClick={() => handleSend(qr.command)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-md px-3 py-2 shadow-sm bg-white text-gray-400 text-xs">
              typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center gap-2 px-2 py-2 bg-[#F0F0F0]">
        <div className="flex-1 flex items-center rounded-md px-3 py-2 bg-white border border-gray-200">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-gray-900 text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-[#00A884] hover:bg-[#008f6f] disabled:opacity-50 text-white"
        >
          <Send size={16} className="ml-0.5" />
        </button>
      </div>
    </div>
  );
}
