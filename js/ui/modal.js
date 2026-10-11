/* =====================================================================
   modal.js — Custom Modal / Dialog System
   কাজী মোশাররফ টাওয়ার ভবন মালিক সমিতি
   
   কেন নিজের modal? — কারণ browser-এর confirm() / prompt() কখনো
   block হয়ে যায়, এবং design সুন্দর হয় না। এই modal পূর্ণ control দেয়।
   ===================================================================== */

/* ============ DOM Helpers ============ */
const $ = id => document.getElementById(id);

/* ============ Internal State ============ */
let activeResolver = null;
let activeKeyHandler = null;

/* ============ Public API ============ */

/**
 * Custom modal দেখান
 * 
 * @param {Object} options
 * @param {string} options.title - Modal title (required)
 * @param {string} [options.msg] - Modal message
 * @param {Array} [options.fields] - Input fields array
 * @param {string} [options.ok] - OK button text
 * @param {string} [options.cancel] - Cancel button text
 * @returns {Promise<Array|string|null>}
 *   - fields থাকলে: array of values (string[])
 *   - fields না থাকলে: '' (OK) বা null (Cancel)
 */
export function ask({ title, msg = '', fields = [], ok = 'ঠিক আছে', cancel = 'বাতিল' }) {
  return new Promise((resolve) => {
    const overlay = $('modalOv');
    const titleEl = $('modalTitle');
    const msgEl = $('modalMsg');
    const fieldsEl = $('modalFields');
    const okBtn = $('modalOk');
    const cancelBtn = $('modalCancel');
    const box = overlay?.querySelector('.modal-box');

    if (!overlay || !titleEl || !fieldsEl || !okBtn || !cancelBtn) {
      // Fallback — browser native
      console.warn('Custom modal not found, using native');
      if (fields.length === 0) {
        resolve(confirm(title + (msg ? '\n\n' + msg : '')) ? '' : null);
      } else {
        const values = fields.map(f => prompt(f.label || f.ph || title, f.value ?? ''));
        if (values.some(v => v === null)) resolve(null);
        else resolve(values);
      }
      return;
    }

    /* ---- Store resolver ---- */
    activeResolver = resolve;

    /* ---- Set title & message ---- */
    titleEl.textContent = title || '';
    if (msgEl) {
      msgEl.textContent = msg || '';
      msgEl.hidden = !msg;
    }

    /* ---- Render fields ---- */
    fieldsEl.innerHTML = '';
    fields.forEach((f, i) => {
      const fieldId = 'modalField' + i;
      
      // Label
      if (f.label) {
        const lbl = document.createElement('label');
        lbl.htmlFor = fieldId;
        lbl.textContent = f.label;
        fieldsEl.appendChild(lbl);
      }
      
      // Input / Select
      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        input.id = fieldId;
        (f.options || []).forEach(([value, text]) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = text;
          if (value === f.value) opt.selected = true;
          input.appendChild(opt);
        });
      } else if (f.type === 'textarea') {
        input = document.createElement('textarea');
        input.id = fieldId;
        input.rows = 3;
        input.placeholder = f.ph || '';
        if (f.value !== undefined) input.value = f.value;
      } else {
        input = document.createElement('input');
        input.id = fieldId;
        input.type = f.type || 'text';
        input.placeholder = f.ph || '';
        if (f.type === 'number') {
          input.step = 'any';
          input.min = '0';
          input.inputMode = 'decimal';
        }
        if (f.value !== undefined && f.value !== null) input.value = f.value;
        input.autocomplete = 'off';
      }
      
      input.style.marginBottom = '12px';
      fieldsEl.appendChild(input);
    });

    /* ---- Set button labels ---- */
    okBtn.textContent = ok;
    cancelBtn.textContent = cancel;

    /* ---- Show modal ---- */
    overlay.hidden = false;

    /* ---- Focus first field / ok button ---- */
    setTimeout(() => {
      const firstInput = fieldsEl.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
      else okBtn.focus();
    }, 50);

    /* ---- Handler: OK ---- */
    const handleOk = () => {
      const values = fields.map((_, i) => {
        const el = $('modalField' + i);
        return el ? el.value : '';
      });
      closeModal(fields.length === 0 ? '' : values);
    };

    /* ---- Handler: Cancel ---- */
    const handleCancel = () => {
      closeModal(null);
    };

    /* ---- Handler: Keyboard ---- */
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleOk();
      }
    };

    /* ---- Attach handlers ---- */
    okBtn.onclick = handleOk;
    cancelBtn.onclick = handleCancel;
    overlay.onclick = (e) => {
      if (e.target === overlay) handleCancel();
    };
    document.addEventListener('keydown', keyHandler);
    activeKeyHandler = keyHandler;

    /* ---- Animation ---- */
    if (box) {
      box.style.animation = 'none';
      setTimeout(() => {
        box.style.animation = '';
      }, 10);
    }
  });
}

/**
 * Modal বন্ধ করুন
 */
function closeModal(result) {
  const overlay = $('modalOv');
  if (overlay) overlay.hidden = true;
  
  // Cleanup keyboard handler
  if (activeKeyHandler) {
    document.removeEventListener('keydown', activeKeyHandler);
    activeKeyHandler = null;
  }
  
  // Resolve promise
  if (activeResolver) {
    const r = activeResolver;
    activeResolver = null;
    r(result);
  }
}

/**
 * Confirm dialog (simplified ask)
 * @returns {Promise<boolean>}
 */
export async function confirmAction(title, msg = '', okText = 'হ্যাঁ') {
  const r = await ask({ title, msg, ok: okText });
  return r !== null;
}

/**
 * Alert dialog (simplified ask)
 * @returns {Promise<void>}
 */
export async function alertAction(title, msg = '') {
  await ask({ title, msg, ok: 'ঠিক আছে' });
}

/**
 * Prompt dialog (single input)
 * @returns {Promise<string|null>}
 */
export async function promptAction(title, opts = {}) {
  const r = await ask({
    title,
    msg: opts.msg || '',
    fields: [{
      label: opts.label || '',
      type: opts.type || 'text',
      ph: opts.ph || '',
      value: opts.value ?? '',
    }],
    ok: opts.ok || 'ঠিক আছে',
  });
  return r ? r[0] : null;
}
