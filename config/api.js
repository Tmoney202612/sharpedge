// APIManager — centralized API calls with auth, retry, error handling
class APIManager {
  constructor() {
    this.endpoint = '/api';
    this.timeout = 5000;
    this.maxRetries = 3;
  }

  getHeaders(extra = {}) {
    const token = localStorage.getItem('auth_token');
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
      ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      ...extra
    };
  }

  async fetch(path, options = {}) {
    const url = this.endpoint + path;
    const maxRetries = options.maxRetries || this.maxRetries;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        const res = await window.fetch(url, {
          ...options,
          signal: controller.signal,
          headers: this.getHeaders(options.headers || {})
        });

        clearTimeout(timer);

        if (res.status === 401) {
          localStorage.removeItem('auth_token');
          return { success: false, error: 'Authentication expired', statusCode: 401 };
        }
        if (res.status === 429) {
          const retry = res.headers.get('Retry-After') || 60;
          return { success: false, error: 'Rate limited. Retry after ' + retry + 's', statusCode: 429 };
        }
        if (!res.ok) {
          throw new Error('HTTP ' + res.status + ': ' + res.statusText);
        }

        const data = await res.json();
        return { success: true, data };

      } catch (err) {
        const isLast = attempt === maxRetries;
        console.error('API attempt ' + attempt + '/' + maxRetries + ' failed:', err.message);
        if (!isLast && err.name !== 'AbortError') {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
          continue;
        }
        return { success: false, error: err.message, statusCode: 0 };
      }
    }
  }

  handleError(result) {
    if (!result.success) {
      console.error('API Error:', result.error);
      this.showErrorNotification(result.error || 'Unknown error');
    }
    return result.success;
  }

  showErrorNotification(msg) {
    const n = document.createElement('div');
    n.className = 'error-notification';
    n.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#ff4757;color:#fff;padding:12px 18px;border-radius:8px;z-index:9999;font-size:13px;';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 5000);
  }

  async getOdds(params) { return this.fetch('/odds', { method: 'GET', params }); }
  async checkMembership(email) { return this.fetch('/check-membership?email=' + encodeURIComponent(email)); }
  async submitBet(betData) { return this.fetch('/bets', { method: 'POST', body: JSON.stringify(betData) }); }
}

const apiManager = new APIManager();
