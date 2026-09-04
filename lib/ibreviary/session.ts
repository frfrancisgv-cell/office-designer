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

  // 2) Fetch the reference-language sessions in parallel. English is used
  // for calendar parsing; Latin lets chant texts be matched directly to OCO
  // even when the user imports a translated office.
  const [enCookieStr, laCookieStr] = await Promise.all([
    lang === 'en' ? Promise.resolve(cookieStr) : fetchSessionCookie('en', day, month, year),
    lang === 'la' ? Promise.resolve(cookieStr) : fetchSessionCookie('la', day, month, year),
  ]);

  return {
    fetchHeaders: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': cookieStr,
    },
    enFetchHeaders: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': enCookieStr,
    },
    laFetchHeaders: {
      'User-Agent': 'Mozilla/5.0',
      'Cookie': laCookieStr,
    },
  };
}
