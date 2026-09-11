import re
import os

files = [
    "src/pages/Payments.tsx",
    "src/pages/Expenses.tsx",
    "src/pages/Loyalty.tsx",
    "src/pages/Analytics.tsx"
]

def remove_emojis(text):
    for emoji in ['❤️', '🇮🇳', '✅', '⚠️', '💡', '🟢', '🟡', '🔴', '👑', '🏆', '⭐️', '🎁', '🎉']:
        text = text.replace(emoji, '')
    return text

for file_path in files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. PAGE HEADER
    content = re.sub(r'<h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">',
                     r'<h1 className="text-lg font-semibold text-gray-900">', content)
    content = re.sub(r'<h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">',
                     r'<h1 className="text-lg font-semibold text-gray-900">', content)
    content = re.sub(r'<p className="text-gray-500 text-sm[^"]*">',
                     r'<p className="text-xs text-gray-500 mt-0.5">', content)

    # 2. STAT CARDS: Plain
    # Analytics stat cards
    content = re.sub(
        r'<div[^>]*className="[^"]*p-5 rounded-lg bg-white border border-gray-200 shadow-sm relative overflow-hidden[^"]*"[^>]*style={{ borderLeft: `4px solid \$\{s\.borderColor\}` }}>\s*<div className="flex items-center justify-between mb-2">\s*<div className="w-9 h-9 rounded-md flex items-center justify-center"[^>]*>[\s\S]*?</div>\s*<Trend pct=\{s\.pct\} />\s*</div>\s*<div className="text-2xl font-bold font-stat text-gray-900">\{s\.value\}</div>\s*<div className="text-xs text-gray-500 mt-1">\{s\.title\}</div>\s*</div>',
        r'<div className="p-3 border border-gray-200 rounded-md">\n              <div className="flex items-center justify-between mb-1">\n                <div className="flex items-center gap-1.5 text-xs text-gray-500">\n                  <s.icon size={16} />\n                  {s.title}\n                </div>\n                <Trend pct={s.pct} />\n              </div>\n              <div className="text-xl font-semibold text-gray-900">{s.value}</div>\n            </div>',
        content
    )
    # Loyalty stat cards
    content = re.sub(
        r'<div key=\{s\.label\} className={`p-4 rounded-lg bg-white border border-gray-200 border-l-\[3px\] \$\{s\.borderColor\}`}>\s*<div className="w-8 h-8 rounded-md flex items-center justify-center mb-2 bg-gray-50">\s*<s\.icon size=\{16\} className="text-gray-500" />\s*</div>\s*<div className="text-xl font-bold text-gray-900">\{s\.value\}</div>\s*<div className="text-xs text-gray-500 font-medium mt-0\.5">\{s\.label\}</div>\s*</div>',
        r'<div key={s.label} className="p-3 border border-gray-200 rounded-md">\n            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">\n              <s.icon size={16} />\n              {s.label}\n            </div>\n            <div className="text-xl font-semibold text-gray-900">{s.value}</div>\n          </div>',
        content
    )
    # Expenses stat cards
    content = re.sub(
        r'<div className="bg-white border border-gray-200 rounded-lg p-5 bg-gradient-to-br from-[^ ]+ to-[^ ]+ border-[^"]+">\s*<div className="[^"]*text-sm font-semibold tracking-wide uppercase mb-1">([^<]+)</div>\s*<div className="text-2xl font-bold font-heading">([^<]+)</div>\s*</div>',
        r'<div className="p-3 border border-gray-200 rounded-md">\n          <div className="text-xs text-gray-500 mb-1">\1</div>\n          <div className="text-xl font-semibold text-gray-900">\2</div>\n        </div>',
        content
    )
    
    # 3. CHARTS
    content = re.sub(r'radius={\[0, \d+, \d+, 0\]}', r'radius={[0, 0, 0, 0]}', content)
    content = re.sub(r'contentStyle={{[^}]+}}', r"contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }}", content)
    content = re.sub(r'<defs>[\s\S]*?</defs>', r'', content)
    content = re.sub(r'fill="url\(#[^)]+\)"', r'fill="#7C3AED"', content)
    
    # 4. TABLES
    # header row
    content = content.replace('bg-gray-50 bg-gray-50/50', 'bg-gray-50')
    content = re.sub(r'<th className="px-4 py-3 text-left text-xs font-medium text-gray-500[^"]*">', r'<th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">', content)
    content = re.sub(r'<th className="px-4 py-3 text-right text-xs font-medium text-gray-500[^"]*">', r'<th className="px-3 py-2 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">', content)
    content = re.sub(r'<th className="px-4 py-3 text-center text-xs font-medium text-gray-500[^"]*">', r'<th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">', content)
    # rows
    content = content.replace('border-b border-gray-50 border-gray-200 table-row-hover', 'border-b border-gray-100 hover:bg-gray-50')
    content = content.replace('border-b border-gray-50 table-row-hover', 'border-b border-gray-100 hover:bg-gray-50')
    content = content.replace('px-4 py-3', 'px-3 py-2')

    # 5. TABS
    content = re.sub(
        r'<div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-4">\s*\{\(\[\'recent\', \'outstanding\'\] as const\)\.map\(t2 => \(\s*<button key=\{t2\} onClick=\{\(\) => setTab\(t2\)\}\s*className=\{cn\(\'px-4 py-2 rounded-lg text-sm font-medium transition-all\',\s*tab === t2 \? \'bg-white text-brand-purple shadow\' : \'text-gray-500\'\)\}>',
        r'<div className="flex gap-4 border-b border-gray-200 mb-4">\n        {(["recent", "outstanding"] as const).map(t2 => (\n          <button key={t2} onClick={() => setTab(t2)}\n            className={cn("pb-2 text-sm font-medium border-b-2 transition-colors",\n              tab === t2 ? "border-brand-purple text-brand-purple" : "border-transparent text-gray-500 hover:text-gray-700")}>',
        content
    )

    # 6. REMOVE specific classes and emojis
    content = remove_emojis(content)
    content = content.replace('glass-card', '')
    content = content.replace('animate-fade-in', '')
    content = content.replace('animate-slide-up', '')
    content = re.sub(r'style={{ animationDelay: `[^`]+` }}', '', content)
    content = re.sub(r'bg-gradient-to-[a-z]+ from-[^ ]+ to-[^ ]+', '', content)
    
    # 7. INPUTS/BUTTONS & 8. PADDING
    content = content.replace('rounded-xl', 'rounded-md')
    content = content.replace('rounded-lg', 'rounded-md')
    content = content.replace('p-6', 'p-3')
    content = content.replace('p-5', 'p-3')
    content = content.replace('mb-6', 'mb-4')
    content = content.replace('gap-5', 'gap-3')
    
    # 9. Clean up decorative containers in headers
    content = re.sub(r'<div className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-md">', r'<div>', content)
    
    # Update Vyapaar score section
    content = re.sub(
        r'<div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">\s*<h2 className="text-lg font-heading font-semibold text-gray-900 mb-4">',
        r'<div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">\n        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">',
        content
    )

    # Replace section headers to uppercase text-sm
    content = re.sub(
        r'<h2 className="text-lg font-heading font-semibold text-gray-900([^>]*)">',
        r'<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide\1">',
        content
    )
    content = re.sub(
        r'<h3 className="font-heading font-bold text-gray-900 text-gray-900 mb-4">',
        r'<h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">',
        content
    )
    content = re.sub(
        r'<h2 className="font-heading font-semibold text-gray-900 text-gray-900 mb-4">',
        r'<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">',
        content
    )
    content = re.sub(
        r'<h2 className="font-heading font-semibold text-gray-900 text-gray-900">',
        r'<h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">',
        content
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

