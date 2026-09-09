import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, ArrowLeft, Smile } from 'lucide-react';
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
  { label: ' आज की बिक्री', command: 'aaj ki bikri' },
  { label: ' Stock Check', command: 'stock check' },
  { label: ' Pending Payment', command: 'pending payment' },
  { label: ' नया बिल', command: 'naya bill' },
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

  // Subscribe to Firestore data
  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeInvoices(tenantId, setInvoices);
    const unsub2 = subscribeProducts(tenantId, setProducts);
    return () => { unsub1(); unsub2(); };
  }, [tenantId]);

  // Welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: 'welcome',
      text: `नमस्ते ${tenant?.ownerName || 'Boss'}! \n\nमैं ShoppIQ Bot हूँ — आपका डिजिटल दुकान सहायक।\n\nमुझसे कुछ भी पूछो — बिक्री, स्टॉक, बाकी पैसे, कुछ भी!\n\n नीचे बटन दबाओ या "help" लिखो सब कमांड देखने के लिए।`,
      sender: 'bot',
      timestamp: new Date(),
      quickReplies: defaultQuickReplies,
    };
    setMessages([welcomeMsg]);
  }, [tenant?.ownerName]);

  // Auto-scroll to bottom
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

    // Today's sales
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
        addBotMessage(' *आज की बिक्री*\n\nआज अभी तक कोई बिल नहीं बना।\n\n बिल बनाने के लिए "नया बिल" बोलो!');
      } else {
        addBotMessage(
          ` *आज की बिक्री*\n\n` +
          ` कुल बिक्री: *${formatINR(totalSales)}*\n` +
          ` बिलों की संख्या: *${billCount}*\n` +
          ` औसत बिल: *${formatINR(totalSales / billCount)}*\n\n` +
          `${billCount >= 10 ? ' शानदार! आज तो धमाल मचा दिया!' : ' चलो और बिल बनाओ!'}`
        );
      }
      return;
    }

    // Stock check
    if (cmd.includes('stock') || cmd.includes('maal') || cmd.includes('माल')) {
      const lowStock = products.filter(p => p.currentStock <= p.minimumStockAlert && p.isActive);
      const outOfStock = products.filter(p => p.currentStock === 0 && p.isActive);

      if (lowStock.length === 0 && outOfStock.length === 0) {
        addBotMessage(' *Stock Status*\n\n सब कुछ सही है! कोई प्रोडक्ट कम स्टॉक में नहीं है।\n\n बहुत बढ़िया!');
      } else {
        let msg = ' *Stock Alert*\n\n';
        if (outOfStock.length > 0) {
          msg += ' *स्टॉक खत्म:*\n';
          outOfStock.slice(0, 5).forEach(p => {
            msg += `  • ${p.name}\n`;
          });
          msg += '\n';
        }
        if (lowStock.length > 0) {
          msg += ' *कम स्टॉक:*\n';
          lowStock.slice(0, 5).forEach(p => {
            msg += `  • ${p.name} — ${p.currentStock} ${p.unit} बाकी\n`;
          });
        }
        msg += `\n कुल ${lowStock.length + outOfStock.length} प्रोडक्ट पर ध्यान दो!`;
        addBotMessage(msg);
      }
      return;
    }

    // Pending payments
    if (cmd.includes('pending') || cmd.includes('baaki') || cmd.includes('udhar') || cmd.includes('बाकी') || cmd.includes('उधार')) {
      const pendingInvoices = invoices.filter(inv => inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'partial' || inv.paymentStatus === 'overdue');
      const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.amountPending, 0);

      if (pendingInvoices.length === 0) {
        addBotMessage(' *बाकी भुगतान*\n\n कोई बाकी पैसा नहीं है!\n\n सब का भुगतान हो चुका है!');
      } else {
        let msg = ` *बाकी भुगतान*\n\n`;
        msg += ` कुल बाकी: *${formatINR(totalPending)}*\n`;
        msg += ` बाकी बिल: *${pendingInvoices.length}*\n\n`;
        msg += '*टॉप बाकीदार:*\n';
        pendingInvoices
          .sort((a, b) => b.amountPending - a.amountPending)
          .slice(0, 5)
          .forEach(inv => {
            msg += `  • ${inv.customerName}: ${formatINR(inv.amountPending)}\n`;
          });
        msg += `\n "भुगतान" पेज पर जाकर रिमाइंडर भेजो!`;
        addBotMessage(msg);
      }
      return;
    }

    // Top product
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
        addBotMessage(' *टॉप प्रोडक्ट*\n\nआज अभी तक कोई बिक्री नहीं हुई।\n\n पहला बिल बनाओ!');
      } else {
        let msg = ' *आज के टॉप प्रोडक्ट*\n\n';
        sorted.slice(0, 5).forEach((p, i) => {
          const medal = i === 0 ? '' : i === 1 ? '' : i === 2 ? '' : '  •';
          msg += `${medal} ${p.name}\n   ${p.qty} बेचे — ${formatINR(p.revenue)}\n`;
        });
        addBotMessage(msg);
      }
      return;
    }

    // New bill
    if (cmd.includes('naya bill') || cmd.includes('new bill') || cmd.includes('bill banao') || cmd.includes('बिल')) {
      addBotMessage(' *नया बिल*\n\nबिल बनाने के लिए बिलिंग पेज पर जा रहे हैं...\n\n 2 सेकंड में redirect होगा!');
      setTimeout(() => navigate('/billing/new'), 2000);
      return;
    }

    // Total customers
    if (cmd.includes('customer') || cmd.includes('grahak') || cmd.includes('ग्राहक')) {
      const uniqueCustomers = new Set(invoices.map(inv => inv.customerName).filter(Boolean));
      addBotMessage(` *ग्राहक जानकारी*\n\nकुल ग्राहक (बिल से): *${uniqueCustomers.size}*\n\n ज़्यादा details के लिए "ग्राहक" पेज देखो!`);
      return;
    }

    // Help / menu
    if (cmd.includes('help') || cmd.includes('menu') || cmd.includes('मदद')) {
      let msg = ' *ShoppIQ Bot Commands*\n\n';
      HELP_COMMANDS.forEach(c => {
        msg += `▸ *${c.cmd}*\n  ${c.desc}\n\n`;
      });
      msg += ' कोई भी कमांड लिखो या नीचे बटन दबाओ!';
      addBotMessage(msg);
      return;
    }

    // Report / summary
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

      // Top product
      const productSales: Record<string, number> = {};
      todayInvoices.forEach(inv => {
        inv.items?.forEach(item => {
          productSales[item.productName] = (productSales[item.productName] || 0) + item.totalAmount;
        });
      });
      const sortedProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]);
      const topProductName = sortedProducts.length > 0 ? sortedProducts[0][0] : 'None';

      const msg = ` Daily Report — ShoppIQ
━━━━━━━━━━━━━━━━━
 Aaj ki bikri: ₹${todaySales} (${invoiceCount} bills)
 Low stock: ${lowStockCount} products
💳 Pending payment: ₹${pendingTotal} (${pendingCount} invoices)
 Total customers: ${customerCount}
 Top product: ${topProductName}
━━━━━━━━━━━━━━━━━`;
      addBotMessage(msg);
      return;
    }

    // Unknown
    addBotMessage(
      ` समझ नहीं आया: "${input}"\n\n "help" लिखो सब कमांड देखने के लिए, या नीचे बटन दबाओ!`,
      defaultQuickReplies
    );
  };

  const handleSend = (text?: string) => {
    const msgText = text || inputText.trim();
    if (!msgText) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: msgText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Show typing indicator
    setIsTyping(true);

    // Process after delay (simulate typing)
    setTimeout(() => {
      setIsTyping(false);
      processCommand(msgText);
    }, 800 + Math.random() * 700);
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
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto" style={{ fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif" }}>
      {/* WhatsApp Header */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-t-lg" style={{ background: '#075E54' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="md:hidden text-gray-300 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-purple-700">
            <Bot size={22} className="text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#25D366] rounded-full border-2" style={{ borderColor: '#075E54' }} />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-semibold text-sm">ShoppIQ Bot </h3>
          <p className="text-[#8696A0] text-xs">
            {isTyping ? 'typing...' : 'online'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[#AEBAC1]">
          <Smile size={20} />
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
        style={{
          background: `#efeae2 url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-lg px-3 py-2 shadow-sm relative"
                style={{
                  background: msg.sender === 'user' ? '#DCF8C6' : '#FFFFFF',
                  borderTopLeftRadius: msg.sender === 'bot' ? '4px' : '8px',
                  borderTopRightRadius: msg.sender === 'user' ? '4px' : '8px',
                }}
              >
                {/* Message tail */}
                <div
                  className="absolute top-0 w-3 h-3"
                  style={{
                    ...(msg.sender === 'user'
                      ? { right: '-6px', borderLeft: '6px solid #DCF8C6', borderBottom: '6px solid transparent' }
                      : { left: '-6px', borderRight: '6px solid #FFFFFF', borderBottom: '6px solid transparent' }
                    ),
                  }}
                />

                {/* Bot name */}
                {msg.sender === 'bot' && (
                  <div className="text-[#7C3AED] text-xs font-semibold mb-1">ShoppIQ Bot</div>
                )}

                {/* Message text — preserve newlines and bold */}
                <div className="text-gray-900 text-sm leading-relaxed whitespace-pre-line">
                  {msg.text.split(/\*([^*]+)\*/g).map((part, i) =>
                    i % 2 === 1
                      ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex justify-end mt-1">
                  <span className="text-[10px] text-[#8696A0]">{formatTime(msg.timestamp)}</span>
                  {msg.sender === 'user' && (
                    <span className="text-[#53BDEB] text-[10px] ml-1">✓✓</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Replies */}
            {msg.quickReplies && msg.sender === 'bot' && (
              <div className="flex flex-wrap gap-2 mt-2 ml-2">
                {msg.quickReplies.map((qr) => (
                  <button
                    key={qr.command}
                    onClick={() => handleSend(qr.command)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-gray-50 active:scale-95"
                    style={{
                      background: 'rgba(124, 58, 237, 0.15)',
                      color: '#A78BFA',
                      border: '1px solid rgba(124, 58, 237, 0.3)',
                    }}
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-3 shadow-sm" style={{ background: '#FFFFFF' }}>
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce"  />
                <div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce"  />
                <div className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce"  />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex items-center gap-2 px-3 py-3 rounded-b-lg" style={{ background: '#F0F0F0' }}>
        <div className="flex-1 flex items-center rounded-full px-4 py-2.5 shadow-sm" style={{ background: '#FFFFFF' }}>
          <Smile size={20} className="text-[#8696A0] mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="यहाँ लिखो..."
            className="flex-1 bg-transparent text-gray-900 text-sm outline-none placeholder:text-[#8696A0]"
          />
        </div>
        <button
          onClick={() => handleSend()}
          disabled={!inputText.trim()}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
          style={{ background: '#00A884' }}
        >
          <Send size={18} className="text-white ml-0.5" />
        </button>
      </div>
    </div>
  );
}
