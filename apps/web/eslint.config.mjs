import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'next-env.d.ts'] },
  {
    rules: {
      // Browser popups are banned in the app (spec §3: in-app dialogs only).
      'no-alert': 'error',
      'no-restricted-globals': ['error', { name: 'confirm', message: 'Use ConfirmDialog from @hub/ui.' }],
    },
  },
];

export default config;
