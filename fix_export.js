const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/agent/Clients.tsx', 'utf8');

code = code.replace(
  "\\\`\\\"\\\${c.notes?.replace('Target: ', '') || ''}\\\"\\\`,",
  "\\\`\\\"\\\${c.targetCountry || ''}\\\"\\\`,"
);

fs.writeFileSync('frontend/src/pages/agent/Clients.tsx', code);
