import os

filepath = os.path.join(os.path.dirname(__file__), 'frontend', 'src', 'pages', 'admin', 'master', 'StudentAdmission.jsx')

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the pattern: ) : (\n                    <table className="hidden md:table w-full text-sm">
# And replace with: ) : (\n                    <>\n                    <table className="hidden md:table w-full text-sm">

old = (
    '                  ) : (\n'
    '                    <table className="hidden md:table w-full text-sm">'
)

new = (
    '                  ) : (\n'
    '                    <>\n'
    '                    <table className="hidden md:table w-full text-sm">'
)

if old in content:
    content = content.replace(old, new, 1)
    print("✓ Added opening fragment tag")
else:
    print("ERROR: Could not find opening pattern")
    # Debug: find close match
    idx = content.find(') : (')
    if idx != -1:
        print(f"Found ') : (' at position {idx}")
        print(repr(content[idx:idx+200]))

# Find the closing: the mobile cards div's </div> followed by \n                  )}
# And replace with: </div>\n                    </>\n                  )}
old_close = (
    '                    </div>\n'
    '                  )}'
)

new_close = (
    '                    </div>\n'
    '                    </>\n'
    '                  )}'
)

# But we need to be specific - this pattern appears in multiple places
# Let's find the first occurrence - that's the course selection
idx = content.find(old_close)
if idx != -1:
    content = content[:idx] + new_close + content[idx + len(old_close):]
    print("✓ Added closing fragment tag")
else:
    print("ERROR: Could not find closing pattern")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Fragment wrapper fixed!")
