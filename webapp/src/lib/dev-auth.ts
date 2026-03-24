const DEV_AUTH_BYPASS_FLAG = 'E2E_AUTH_BYPASS';
const LOCAL_APP_ENV = 'local';

export function isDevAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.APP_ENV === LOCAL_APP_ENV &&
    process.env[DEV_AUTH_BYPASS_FLAG] === 'true'
  );
}

export function getDevAuthSession() {
  return {
    userId: process.env.E2E_USER_ID ?? 'local-e2e-user',
    email: process.env.E2E_USER_EMAIL ?? 'e2e@example.com',
    accessToken:
      process.env.E2E_ACCESS_TOKEN ??
      'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJsb2NhbC1lMmUtdXNlciIsImVtYWlsIjoiZTJlQGV4YW1wbGUuY29tIn0.',
  };
}
