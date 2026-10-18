import { messagesFor, pickLocale } from '@hub/i18n';
import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

// No locale in the URL (spec §2.4): the choice lives in a cookie (and the profile), else the browser's language.
export default getRequestConfig(async () => {
  const locale = pickLocale((await cookies()).get('hub_locale')?.value, (await headers()).get('accept-language'));
  return {
    locale,
    messages: messagesFor(locale),
    timeZone: 'Asia/Kuala_Lumpur',
    // One clock for server and browser, so relative times ("5 minutes ago") render the same on both.
    now: new Date(),
    formats: {
      dateTime: {
        short: { day: 'numeric', month: 'short', year: 'numeric' },
        long: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
      },
    },
  };
});
