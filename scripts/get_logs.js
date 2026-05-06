const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('echo "!Hspnet2026" | sudo -S docker compose -f /home/nocion/wms/docker-compose.yml logs --tail 50 wms-app', (err, stream) => {
    stream.on('data', d => process.stdout.write(d))
          .stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '10.16.124.133',
  port: 2245,
  username: 'nocion',
  password: '!Hspnet2026'
});
