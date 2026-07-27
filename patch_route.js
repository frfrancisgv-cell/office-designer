const fs = require('fs');
let code = fs.readFileSync('app/api/ibreviary/route.ts', 'utf8');

// 1. Remove laFetchHeaders definition
code = code.replace(
`    const laFetchHeaders = new Headers(fetchHeaders);
    if (!laFetchHeaders.get('cookie')?.includes('lang=')) {
      laFetchHeaders.append('Cookie', \`lang=la\`);
    } else {
      laFetchHeaders.set('Cookie', laFetchHeaders.get('cookie')!.replace(/lang=[^;]+/, 'lang=la'));
    }`,
``);

// 2. Remove laFetchHeaders from Promise.all
code = code.replace(
`    const [mainResponse, response, laResponse] = await Promise.all([
      fetch(mainMenuUrl, { headers: enFetchHeaders, cache: 'no-store' }),
      fetch(ibreviaryUrl, { headers: fetchHeaders, cache: 'no-store' }),
      fetch(ibreviaryUrl, { headers: laFetchHeaders, cache: 'no-store' })
    ]);`,
`    const [mainResponse, response] = await Promise.all([
      fetch(mainMenuUrl, { headers: enFetchHeaders, cache: 'no-store' }),
      fetch(ibreviaryUrl, { headers: fetchHeaders, cache: 'no-store' })
    ]);`
);

// 3. Remove laHtml extraction
code = code.replace(
`    const mainHtml = await mainResponse.text();
    const html = await response.text();
    const laHtml = await laResponse.text();`,
`    const mainHtml = await mainResponse.text();
    const html = await response.text();
    const laHtml = '';`
);

fs.writeFileSync('app/api/ibreviary/route.ts', code, 'utf8');
