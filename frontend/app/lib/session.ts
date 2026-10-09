/** Where a verified customer's session token is kept between visits (server sessions last 30 days). */
const SESSION_KEY = 'foodcart.customer';

export function storedSession() {
  try {
    return localStorage.getItem(SESSION_KEY) ?? '';
  } catch {
    return '';
  }
}

export function storeSession(token: string) {
  try {
    if (token) localStorage.setItem(SESSION_KEY, token);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Private mode or blocked storage: the customer just verifies again next time.
  }
}
