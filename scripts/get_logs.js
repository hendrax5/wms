const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('echo "!Hspnet2026" | sudo -S docker logs wms-app', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
      .on('data', data => process.stdout.write(data))
      .stderr.on('data', data => process.stderr.write(data));
  });
}).connect({
  host: '10.16.124.133',
  port: 2245,
  username: 'nocion',
  password: '!Hspnet2026'
});
