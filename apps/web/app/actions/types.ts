/** What a form action returns: an error code (translated by errors.<code>), or ok with an optional message key. */
export type FormState = {
  error?: string;
  ok?: boolean;
  message?: string;
  values?: Record<string, string>;
  data?: Record<string, string>;
};
