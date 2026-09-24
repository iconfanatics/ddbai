import re

with open('frontend/src/pages/agent/Clients.tsx', 'r') as f:
    content = f.read()

# Replace hardcoded placeholders with dummy options
content = content.replace(
    '<select className="w-full border-gray-300 rounded p-2 border text-sm"><option>All users</option></select>',
    '<select className="w-full border-gray-300 rounded p-2 border text-sm bg-white"><option>All users</option><option>Nirupam Nirupam</option><option>Sany Sany</option></select>'
)

content = content.replace(
    '<select className="w-full border-gray-300 rounded p-2 border text-sm"><option>All statuses</option></select>',
    '<select className="w-full border-gray-300 rounded p-2 border text-sm bg-white"><option>All statuses</option><option>Face Verification Pending</option><option>Processing</option><option>Completed</option></select>'
)

content = content.replace(
    '<select className="w-full border-gray-300 rounded p-2 border text-sm"><option>All</option></select>',
    '<select className="w-full border-gray-300 rounded p-2 border text-sm bg-white"><option>All</option><option>Yes</option><option>No</option></select>'
)

with open('frontend/src/pages/agent/Clients.tsx', 'w') as f:
    f.write(content)
