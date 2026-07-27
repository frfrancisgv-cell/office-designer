export async function fetchSessionCookie(
  lang: string,
  day: string,
  month: string,
  year: string
): Promise<string> {
  const optionsBody = new URLSearchParams({
    lang,
    giorno: day,
    mese: month,
    anno: year,
    ok: 'ok',
  });

  const response = await fetch('https://www.ibreviary.com/m2/opzioni.php?b=1', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Referer': 'https://www.ibreviary.com/m2/opzioni.php?b=1',
      'User-Agent': 'Mozilla/5.0',
    },
    body: optionsBody.toString(),
    cache: 'no-store',
    redirect: 'manual',
  });

  let cookieStr = '';
  const setCookieHeaders = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [];

  let allCookies = setCookieHeaders.join(';');
  if (!allCookies) {
    allCookies = response.headers.get('set-cookie') || '';
  }

  const match = allCookies.match(/PHPSESSID=[^;]+/);
  if (match) {
    cookieStr = match[0];
  } else if (Reflect.has(response.headers, 'raw')) {
    // fallback for node-fetch if used under the hood
    const raw = (response.headers as any).raw();
    if (raw['set-cookie']) {
      const cMatch = raw['set-cookie'].join(';').match(/PHPSESSID=[^;]+/);
      if (cMatch) cookieStr = cMatch[0];
    }
  }

  return cookieStr;
}

export async function getIBreviarySessions(
  lang: string,
  day: string,
  month: string,
  year: string
) {
  // 1) Fetch main language cookie
  const cookieStr = await fetchSessionCookie(lang, day, month, year);

  // 2) Fetch Latin cookie for GABC notes
  const laCookieStr = await fetchSessionCookie('la', day, month, year);

  // 3) Fetch English cookie for deriving context based on text matching
  let enCookieStr = cookieStr;
  if (lang !== 'en') {
    enCookieStr = await fetchSessionCookie('en', day, month, year);
  }

  return {
    fetchHeaders: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookieStr,
    },
    laFetchHeaders: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': laCookieStr || cookieStr,
    },
    enFetchHeaders: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': enCookieStr,
    },
  };
}
