(function () {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let activeModal = null;
  let returnFocus = null;
  let modalSnapshot = '';

  function controlsSnapshot(modal) {
    return JSON.stringify(Array.from(modal.querySelectorAll('input, select, textarea')).map(function (control) {
      return [control.id, control.type === 'checkbox' ? control.checked : control.value];
    }));
  }

  function setMessage(target, message, type) {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) return;
    element.textContent = message || '';
    element.dataset.state = type || (message ? 'info' : 'idle');
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.label = button.textContent;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = busyLabel || 'Memproses...';
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      if (button.dataset.label) button.textContent = button.dataset.label;
      delete button.dataset.label;
    }
  }

  function createCell(value, className) {
    const cell = document.createElement('td');
    cell.textContent = value == null || value === '' ? '-' : String(value);
    if (className) cell.className = className;
    return cell;
  }

  function createButton(label, className, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function formatDate(value, includeYear) {
    if (!value) return '-';
    const parts = String(value).slice(0, 10).split('-').map(Number);
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return String(value);
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return new Intl.DateTimeFormat('ms-MY', {
      day: 'numeric',
      month: 'long',
      year: includeYear === false ? undefined : 'numeric',
      timeZone: 'UTC'
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('ms-MY', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function validHttpUrl(value, options) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
      const parsed = new URL(raw, window.location.origin);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      if (options && options.internalOnly && parsed.origin !== window.location.origin) return null;
      return parsed.href;
    } catch (error) {
      return null;
    }
  }

  function showEmpty(emptyId, visible, message) {
    const empty = document.getElementById(emptyId);
    if (!empty) return;
    if (message) empty.textContent = message;
    empty.style.display = visible ? 'block' : 'none';
  }

  function showLoadError(emptyId, messageId, label, error) {
    showEmpty(emptyId, false);
    const detail = error && error.message ? ': ' + error.message : '.';
    setMessage(messageId, label + ' tidak dapat dimuatkan' + detail, 'error');
  }

  function bindTabs(options) {
    const buttons = Array.from(document.querySelectorAll(options.buttonSelector));
    const panes = Array.from(document.querySelectorAll(options.paneSelector));
    if (!buttons.length) return;
    const parameter = options.parameter || 'tab';

    function activate(button, moveFocus) {
      const tabName = button.dataset.tab;
      buttons.forEach(function (item) {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panes.forEach(function (pane) {
        const active = pane.id === 'pane-' + tabName;
        pane.classList.toggle('active', active);
        pane.hidden = !active;
      });
      const url = new URL(window.location.href);
      url.searchParams.set(parameter, tabName);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      if (moveFocus) button.focus();
      if (typeof options.onChange === 'function') options.onChange(tabName);
    }

    buttons.forEach(function (button, index) {
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'pane-' + button.dataset.tab);
      button.addEventListener('click', function () { activate(button, false); });
      button.addEventListener('keydown', function (event) {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + buttons.length) % buttons.length;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % buttons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = buttons.length - 1;
        activate(buttons[nextIndex], true);
      });
    });
    panes.forEach(function (pane) {
      pane.setAttribute('role', 'tabpanel');
      pane.tabIndex = 0;
    });

    const requested = new URLSearchParams(window.location.search).get(parameter);
    const initial = buttons.find(function (button) { return button.dataset.tab === requested; }) ||
      buttons.find(function (button) { return button.classList.contains('active'); }) || buttons[0];
    activate(initial, false);
  }

  function openModal(id, focusId) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    activeModal = overlay;
    returnFocus = document.activeElement;
    overlay.hidden = false;
    overlay.style.display = 'flex';
    modalSnapshot = controlsSnapshot(overlay);
    document.body.classList.add('admin-modal-open');
    const focusTarget = (focusId && document.getElementById(focusId)) || overlay.querySelector(focusableSelector);
    if (focusTarget) focusTarget.focus();
  }

  function modalIsDirty(overlay) {
    return overlay && controlsSnapshot(overlay) !== modalSnapshot;
  }

  function closeModal(id, options) {
    const overlay = document.getElementById(id);
    if (!overlay || overlay.hidden) return true;
    const force = options && options.force;
    if (!force && modalIsDirty(overlay) && !window.confirm('Perubahan belum disimpan. Tutup borang ini?')) return false;
    overlay.hidden = true;
    overlay.style.display = 'none';
    document.body.classList.remove('admin-modal-open');
    activeModal = null;
    modalSnapshot = '';
    if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
    returnFocus = null;
    return true;
  }

  function markModalSaved(id) {
    const overlay = document.getElementById(id);
    if (overlay) modalSnapshot = controlsSnapshot(overlay);
  }

  document.addEventListener('keydown', function (event) {
    if (!activeModal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal(activeModal.id);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(activeModal.querySelectorAll(focusableSelector)).filter(function (element) {
      return element.offsetParent !== null;
    });
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  document.addEventListener('click', function (event) {
    if (activeModal && event.target === activeModal) closeModal(activeModal.id);
  });

  window.adminUI = {
    bindTabs: bindTabs,
    closeModal: closeModal,
    createButton: createButton,
    createCell: createCell,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    markModalSaved: markModalSaved,
    openModal: openModal,
    setBusy: setBusy,
    setMessage: setMessage,
    showEmpty: showEmpty,
    showLoadError: showLoadError,
    validHttpUrl: validHttpUrl
  };
}());
