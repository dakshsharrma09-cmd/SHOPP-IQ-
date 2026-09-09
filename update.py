import re

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # General replacements
    content = content.replace('rounded-2xl', 'rounded-lg')
    content = content.replace('rounded-3xl', 'rounded-lg')
    
    # buttons/inputs rounded-xl -> rounded-md
    # but we need to keep rounded-xl on modals/slide-overs
    # let's be careful. Let's replace 'rounded-xl' with 'rounded-md' in button and input tags.
    # A simpler way is to replace all rounded-xl with rounded-md and manually fix modals if needed,
    # or just regex match button/input/select/textarea classes
    content = re.sub(r'(<button[^>]*className="[^"]*)rounded-xl', r'\1rounded-md', content)
    content = re.sub(r'(<input[^>]*className="[^"]*)rounded-xl', r'\1rounded-md', content)
    content = re.sub(r'(<textarea[^>]*className="[^"]*)rounded-xl', r'\1rounded-md', content)
    content = re.sub(r'(<select[^>]*className="[^"]*)rounded-xl', r'\1rounded-md', content)
    
    # cards
    content = content.replace('glass-card card-glow', 'bg-white border border-gray-200 rounded-lg')
    content = content.replace('glass-card', 'bg-white border border-gray-200 rounded-lg')
    content = content.replace('shadow-2xl', 'shadow-lg')
    content = content.replace('shadow-xl', '')
    
    # Replace shadow-lg -> remove or use border border-gray-200 (if not already bordered)
    # We can just replace 'shadow-lg' with 'border border-gray-200'
    content = content.replace('shadow-lg', 'border border-gray-200')
    
    # hover states
    content = re.sub(r'hover:-translate-y-\d+', '', content)
    content = re.sub(r'hover:scale-105', 'hover:bg-gray-50', content)
    content = re.sub(r'active:scale-95', '', content)
    
    # Headers -> flat
    # customers
    content = content.replace('bg-gradient-to-r from-purple-50 to-pink-50', '')
    content = content.replace('border-2 border-brand-purple', '')
    content = content.replace('bg-surface-bg', '')
    
    # page titles
    content = content.replace('text-3xl', 'text-2xl')
    content = content.replace('text-[28px]', 'text-2xl')
    
    # remove style blocks
    content = re.sub(r'<style>\{`[^`]*`\}</style>', '', content, flags=re.DOTALL)
    
    # remove fade-in-up class and style={{ animationDelay... }}
    content = content.replace('fade-in-up', '')
    content = re.sub(r'style=\{\{\s*animationDelay[^}]+\}\}', '', content)
    content = re.sub(r',\s*animationDelay:[^,}]*', '', content)
    
    # Inline style font-stat...
    content = content.replace("fontSize: '32px'", "")
    
    # Remove emojis
    emojis = ['📦','📈','🏆','🧾','⚡','🙏','🎲','✍️','🏷️','🏪','📊','📄','👥','⭐','🎁','💸','💰','🎉','🚀','✅','💾']
    for emoji in emojis:
        content = content.replace(emoji, '')
        
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

for f in ['/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Customers.tsx',
          '/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Payments.tsx',
          '/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Expenses.tsx',
          '/Users/daksh/Documents/SHOPP IQ OFFICIAL/src/pages/Loyalty.tsx']:
    process_file(f)

