const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  // Pass the password to sudo via echo and pipe
  const cmds = [
    'echo "!Hspnet2026" | sudo -S chown -R nocion:nocion /home/nocion/wms',
    'cd /home/nocion/wms',
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
