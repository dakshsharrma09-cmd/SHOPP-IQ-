import re

# Customers.tsx
with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Customers.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = re.sub(r'\{/\* Header Banner \*/\}.*?<div className="grid grid-cols-2', 
r'''{/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            {t('customers')} 
          </h1>
          <p className="text-gray-500 text-sm">{language === 'hi' ? 'Apne grahakon aur unke khate manage karein' : 'Manage your customers and their accounts'}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-md bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 transition-all text-sm font-bold w-fit">
          <Plus size={15} /> {language === 'hi' ? 'Naya Grahak' : 'New Customer'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2''', c, flags=re.DOTALL)
with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Customers.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

# Payments.tsx
with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Payments.tsx', 'r', encoding='utf-8') as f:
    p = f.read()
p = re.sub(r'\{/\* Header Banner \*/\}.*?\{/\* Tabs \*/\}', 
r'''{/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            {t('payments')} 
          </h1>
          <p className="text-gray-500 text-sm">{language === 'hi' ? 'Apne len-den aur bakaaya rashi manage karein' : 'Manage your transactions and outstandings'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-lg">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Outstanding</span>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatINR(totalOutstanding)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}''', p, flags=re.DOTALL)
with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Payments.tsx', 'w', encoding='utf-8') as f:
    f.write(p)

# Expenses.tsx
with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Expenses.tsx', 'r', encoding='utf-8') as f:
    e = f.read()
e = re.sub(r'\{/\* Header Banner \*/\}.*?\{/\* Stats Cards \*/\}', 
r'''{/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            Expenses 
          </h1>
          <p className="text-gray-500 text-sm">{language === 'hi' ? 'खर्चे ट्रैक करो' : 'Track your expenses'}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 btn-primary text-white px-4 py-2 rounded-md font-medium">
          <Plus size={18} /> {language === 'hi' ? 'खर्चा जोड़ें' : 'Add Expense'}
        </button>
      </div>

      {/* Stats Cards */}''', e, flags=re.DOTALL)
with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Expenses.tsx', 'w', encoding='utf-8') as f:
    f.write(e)

# Loyalty.tsx
with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Loyalty.tsx', 'r', encoding='utf-8') as f:
    l = f.read()
l = re.sub(r'<div className="p-8 rounded-lg bg-gradient-to-r.*?</p>\s*</div>\s*</div>', 
r'''<div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          {t('loyalty')} 
        </h1>
        <p className="text-gray-500 text-sm uppercase">लॉयल्टी कार्यक्रम</p>
      </div>''', l, flags=re.DOTALL)
with open('/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Loyalty.tsx', 'w', encoding='utf-8') as f:
    f.write(l)

