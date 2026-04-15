const {program} = require('commander')
const http = require('http')
const fs = require('fs')
const { XMLBuilder } = require('fast-xml-parser')

program
  .requiredOption('-i, --input <path>', 'шлях до вхідного файлу')
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера');

program.parse(process.argv);

const options = program.opts();

if (!fs.existsSync(options.input)) {
  console.error('Cannot find input file');
  process.exit(1);
}

const server = http.createServer((req, res) => {

  const parsedUrl = new URL(req.url, `http://${options.host}:${options.port}`);
  const showMfo = parsedUrl.searchParams.get('mfo') === 'true';
  const onlyNormal = parsedUrl.searchParams.get('normal') === 'true';

  fs.readFile(options.input, 'utf-8', (err, fileData) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Cannot read input file');
      return;
    }

    const banks = JSON.parse(fileData);

    let result = banks;
    if (onlyNormal) {
      result = result.filter(bank => bank.COD_STATE === 1);
    }

    const bankObjects = result.map(bank => {
      const obj = {};
      if (showMfo) obj.mfo_code = bank.MFO;
      obj.name = bank.SHORTNAME;
      if (onlyNormal) obj.state_code = bank.COD_STATE;
      return obj;
    });

    const builder = new XMLBuilder({
      arrayNodeName: 'bank',
      format: true,
    });

    const xmlBody = builder.build(bankObjects);
    const xml = `<banks>\n${xmlBody}</banks>`;

    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xml);
  });
});

server.listen(Number(options.port), options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}`);
});