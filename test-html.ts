import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

(async () => {
    const laOptionsBody = new URLSearchParams({ lang: 'en', giorno: '12', mese: '7', anno: '2026', ok: 'ok' });
    const laOptionsResponse = await fetch("https://www.ibreviary.com/m2/opzioni.php?b=1", {
       method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: laOptionsBody.toString(), redirect: 'manual'
    });
    
    let allCookies = laOptionsResponse.headers.get('set-cookie') || '';
    if (typeof laOptionsResponse.headers.raw === 'function') {
        const raw = laOptionsResponse.headers.raw();
        if (raw['set-cookie']) {
            allCookies = raw['set-cookie'].join(';');
        }
    }
    const match = allCookies.match(/PHPSESSID=[^;]+/);
    const cookieStr = match ? match[0] : '';
    console.log("Cookie:", cookieStr);
    
    const res = await fetch("https://www.ibreviary.com/m2/breviario.php?s=vespri", {
      headers: { "Cookie": cookieStr }
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    const text = $('#contenuto .inner').text().substring(0, 1000);
    console.log("English Vesper Text Sample:", text);
})();
