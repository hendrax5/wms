const { Client } = require('ssh2');
const fs = require('fs');

// Read local .env or create a default one
let envContent = '';
try {
  envContent = fs.readFileSync('.env', 'utf8');
  // Update localhost to wms-db for production
  envContent = envContent.replace(/localhost:3306/g, 'wms-db:3306');
  envContent = envContent.replace(/root:@/g, 'root:wmspassword@');
  envContent += '\nMYSQL_ROOT_PASSWORD=wmspassword\nAPP_PORT=3000\n';
} catch (err) {
  envContent = `DATABASE_URL="mysql://root:wmspassword@wms-db:3306/wms_2026"
NEXTAUTH_SECRET="super-secret-key-for-wms-2026-development"
NEXTAUTH_URL="http://10.16.124.133:3000"
APP_PORT=3000
MYSQL_ROOT_PASSWORD=wmspassword
MYSQL_DATABASE=wms_2026`;
}

// Escape backticks, quotes, and newlines for the echo command
const escapedEnvContent = envContent
  .replace(/\\/g, '\\\\')
  .replace(/\$/g, '\\$')
  .replace(/"/g, '\\"')
  .replace(/`/g, '\\`');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  const cmds = [
    'echo "!Hspnet2026" | sudo -S chown -R nocion:nocion /home/nocion/wms',
    'cd /home/nocion/wms',
    `echo "${escapedEnvContent}" > .env`,
    'git config --global user.email "admin@wms.local"',
    'git config --global user.name "WMS Server"',
    'git pull origin main --rebase=false',
    'echo "!Hspnet2026" | sudo -S docker compose up -d --build'
  ].join(' && ');

  console.log('Executing commands...');
  conn.exec(cmds, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '10.16.124.133',
  port: 2245,
  username: 'nocion',
  password: '!Hspnet2026'
});
