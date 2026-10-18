import type { Locale, Messages } from '@hub/i18n';

declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
    Formats: {
      dateTime: {
        short: Intl.DateTimeFormatOptions;
        long: Intl.DateTimeFormatOptions;
      };
    };
  }
}
