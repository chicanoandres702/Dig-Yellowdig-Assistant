(function (global) {
  global.DigSidebarComponents = global.DigSidebarComponents || {};
  const ns = global.DigSidebarComponents;
  ns.components = ns.components || {};

  function createDraftEditor(opts = {}) {
    const root = document.createElement('div');
    root.className = 'draft-root panel-box';

    const label = document.createElement('div');
    label.className = 'panel-label';
    label.textContent = opts.label || 'Draft';

    const inner = document.createElement('div');
    inner.className = 'panel-inner';

    const textarea = document.createElement('textarea');
    textarea.id = opts.textareaId || 'dig-draft-mainPrompt';
    textarea.className = 'draft-textarea';
    textarea.placeholder = opts.placeholder || 'Write your draft here...';

    inner.appendChild(textarea);

    const btnRow = document.createElement('div');
    btnRow.className = 'panel-actions';

    const send = document.createElement('button');
    send.className = 'imm-btn';
    send.id = opts.sendId || 'dig-draft-btn-reply';
    send.textContent = opts.sendLabel || 'Reply';

    const yellow = document.createElement('button');
    yellow.className = 'imm-btn mark-btn';
    yellow.id = opts.yellowId || 'dig-draft-btn-yellowdig';
    yellow.textContent = opts.yellowLabel || 'Yellowdig';

    btnRow.appendChild(send);
    btnRow.appendChild(yellow);

    root.appendChild(label);
    root.appendChild(inner);
    root.appendChild(btnRow);

    return {
      root,
      textarea,
      setText: (t) => { textarea.value = t; },
      getText: () => textarea.value,
      onSend: (fn) => { send.addEventListener('click', fn); },
      onYellow: (fn) => { yellow.addEventListener('click', fn); }
    };
  }

  function createTextarea(opts = {}) {
    const textarea = document.createElement('textarea');
    textarea.id = opts.textareaId || 'dig-draft-mainPrompt';
    textarea.className = opts.className || 'draft-textarea';
    textarea.rows = opts.rows || 5;
    textarea.placeholder = opts.placeholder || 'Write your draft here...';
    return textarea;
  }

  ns.components.Draft = ns.components.Draft || {};
  ns.components.Draft.create = createDraftEditor;
  ns.components.Draft.createTextarea = createTextarea;
})(window);
