const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix implicit any
      content = content.replace(/handleRequest\(err, user, info\)/g, "handleRequest(err: any, user: any, info: any)");
      content = content.replace(/async login\(@Body\(\) req\)/g, "async login(@Body() req: any)");
      content = content.replace(/async register\(@Body\(\) req\)/g, "async register(@Body() req: any)");
      content = content.replace(/getProfile\(@CurrentUser\(\) user\)/g, "getProfile(@CurrentUser() user: any)");
      content = content.replace(/\(membership\) =>/g, "(membership: any) =>");
      
      // Fix imports missing .js
      content = content.replace(/from '(\.[^']+)'/g, (match, p1) => {
        if (!p1.endsWith('.js')) {
          return `from '${p1}.js'`;
        }
        return match;
      });

      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir('./src');
