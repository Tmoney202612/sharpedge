// A11yUtils — accessibility helpers for Prime Edge Picks
class A11yUtils {

  // Add skip-to-content link for keyboard/screen reader users
  static addSkipLink() {
    if (document.querySelector('.skip-link')) return;
    const skip = document.createElement('a');
    skip.href = '#main-content';
    skip.className = 'skip-link';
    skip.textContent = 'Skip to main content';
    skip.style.cssText = 'position:absolute;top:-40px;left:0;background:var(--accent);color:#000;padding:8px 16px;z-index:9999;border-radius:0 0 6px 0;font-weight:700;transition:top 0.15s;';
    skip.addEventListener('focus', () => { skip.style.top = '0'; });
    skip.addEventListener('blur', () => { skip.style.top = '-40px'; });
    document.body.insertBefore(skip, document.body.firstChild);
  }

  // Announce messages to screen readers via aria-live region
  static announce(message, priority = 'polite') {
    let region = document.querySelector('[data-a11y-live]');
    if (!region) {
      region = document.createElement('div');
      region.setAttribute('data-a11y-live', '');
      region.setAttribute('aria-live', priority);
      region.setAttribute('aria-atomic', 'true');
      region.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
      document.body.appendChild(region);
    }
    region.setAttribute('aria-live', priority);
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = message; });
  }

  // Make interactive divs/spans fully keyboard accessible
  static makeInteractive(el, label, onClick) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', label);
    const handler = (e) => {
      if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick(e);
      }
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', handler);
    return el;
  }

  // Add visible focus styles for keyboard nav
  static addFocusStyles() {
    if (document.getElementById('a11y-focus-styles')) return;
    const style = document.createElement('style');
    style.id = 'a11y-focus-styles';
    style.textContent = `
      button:focus-visible,
      [role="button"]:focus-visible,
      input:focus-visible,
      select:focus-visible,
      textarea:focus-visible,
      a:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
        border-radius: 4px;
      }
      .tab-btn:focus-visible { outline-offset: -2px; }
    `;
    document.head.appendChild(style);
  }

  // Label all unlabelled inputs on the page
  static auditInputLabels() {
    document.querySelectorAll('input, select, textarea').forEach(input => {
      if (!input.id) return;
      const label = document.querySelector('label[for="' + input.id + '"]');
      if (!label && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        const placeholder = input.placeholder || input.id;
        input.setAttribute('aria-label', placeholder);
      }
    });
  }

  // Init all a11y helpers at once
  static init() {
    this.addSkipLink();
    this.addFocusStyles();
    this.auditInputLabels();
    this.announce('Prime Edge Picks loaded. Use Tab to navigate.');
  }
}

window.A11yUtils = A11yUtils;
document.addEventListener('DOMContentLoaded', () => A11yUtils.init());
