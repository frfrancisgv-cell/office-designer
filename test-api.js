const http = require('http');
const req = http.request('http://localhost:4001/api/psalm-tone', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
req.write(JSON.stringify({
  action: 'point',
  text: 'dominare in medio inimicorum tuorum',
  tone: '8.',
  variant: 'G',
  lang: 'la'
}));
req.end();
