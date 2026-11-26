/** The session is only used server-side, so page scripts never need the cookie. */
export const SESSION_COOKIE_OPTIONS = { httpOnly: true } as const;

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 72;
export const MAX_WATCHLIST = 50;
export const PENDING_TTL_HOURS = 48;

export const LOGIN_ATTEMPTS = {
  email: { max: 20, windowSeconds: 600 },
  password: { max: 10, windowSeconds: 600 },
} as const;

export const ACCOUNT_LINK_TTL_MINUTES = 30;

export const ACCOUNT_LIMITS = {
  link: { max: 3, windowSeconds: 600 },
  confirm: { max: 10, windowSeconds: 600 },
  bug: { max: 5, windowSeconds: 3600 },
} as const;
