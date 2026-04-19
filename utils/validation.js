// FormValidator — input validation for bet tracker forms
class FormValidator {
  static validateOdds(value) {
    const s = String(value).trim();
    if (/^[+-]\d+$/.test(s)) {
      const n = parseInt(s);
      if (n === 0 || n === 100 || n === -100) return { valid: false, error: 'Odds cannot be 0, +100, or -100' };
      return { valid: true, value: s, decimal: n > 0 ? 1 + n/100 : 1 + 100/Math.abs(n) };
    }
    if (/^\d+\.\d{2}$/.test(s)) {
      const d = parseFloat(s);
      if (d < 1.01) return { valid: false, error: 'Decimal odds must be above 1.00' };
      return { valid: true, value: s, decimal: d };
    }
    return { valid: false, error: 'Enter odds like +150, -110, or 2.50' };
  }

  static validateStake(value) {
    const n = parseFloat(value);
    if (isNaN(n) || !isFinite(n)) return { valid: false, error: 'Stake must be a number' };
    if (n <= 0) return { valid: false, error: 'Stake must be greater than 0' };
    if (n > 1000000) return { valid: false, error: 'Stake cannot exceed $1,000,000' };
    return { valid: true, value: n };
  }

  static validateGame(value) {
    const s = String(value).trim();
    if (s.length < 3) return { valid: false, error: 'Game name too short' };
    if (s.length > 100) return { valid: false, error: 'Game name too long' };
    if (!/^[a-zA-Z0-9\s\-\.()&]+$/.test(s)) return { valid: false, error: 'Game contains invalid characters' };
    return { valid: true, value: s };
  }

  static validateBetForm(data) {
    const errors = {};
    const game = this.validateGame(data.game);
    const odds = this.validateOdds(data.odds);
    const stake = this.validateStake(data.stake);
    if (!game.valid) errors.game = game.error;
    if (!odds.valid) errors.odds = odds.error;
    if (!stake.valid) errors.stake = stake.error;
    if (Object.keys(errors).length) return { valid: false, errors };
    return { valid: true, data: { game: game.value, odds: odds.value, stake: stake.value } };
  }

  static showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.style.borderColor = '#ff4757';
    field.setAttribute('aria-invalid', 'true');
    const prev = field.parentElement.querySelector('.field-error');
    if (prev) prev.remove();
    const err = document.createElement('div');
    err.className = 'field-error';
    err.style.cssText = 'color:#ff4757;font-size:11px;margin-top:4px;';
    err.textContent = message;
    field.parentElement.appendChild(err);
  }

  static clearError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.style.borderColor = '';
    field.setAttribute('aria-invalid', 'false');
    const err = field.parentElement.querySelector('.field-error');
    if (err) err.remove();
  }

  static clearAll(fieldIds) {
    fieldIds.forEach(id => this.clearError(id));
  }
}

window.FormValidator = FormValidator;
