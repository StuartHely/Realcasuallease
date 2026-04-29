export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const DEFAULT_SESSION_WINDOW_MS = 1000 * 60 * 60 * 24; // 24 hours
export const SESSION_MAX_AGE_MS = parseInt(process.env.SESSION_MAX_AGE_MS || "", 10) || DEFAULT_SESSION_WINDOW_MS;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
