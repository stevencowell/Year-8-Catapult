(() => {
  'use strict';

  const course = window.CATAPULT_COURSE;
  if (!course || !course.storage) return;

  const storage = course.storage;
  const statusFor = (field) => document.querySelector(`[data-save-status="${CSS.escape(field)}"]`);
  const checkStateKey = (checkId) => `check-state:${checkId}`;

  const setFieldMeta = (element, state) => {
    const key = element.dataset.saveKey;
    if (!key) return;
    const count = document.querySelector(`[data-character-count="${CSS.escape(key)}"]`);
    if (count) count.textContent = `${element.value.length} characters`;
    const status = statusFor(key);
    if (status && state) status.textContent = state;
  };

  const saveField = (element) => {
    const key = element.dataset.saveKey;
    if (!key) return;
    const saved = storage.set(`evidence:${key}`, element.value);
    setFieldMeta(element, saved ? 'Saved on this device' : 'Could not save on this device');
  };

  document.querySelectorAll('[data-save-key]').forEach((element) => {
    const key = element.dataset.saveKey;
    const saved = storage.get(`evidence:${key}`);
    if (saved !== null) element.value = saved;
    setFieldMeta(element, saved !== null ? 'Saved on this device' : 'Ready to save');

    let timer;
    element.addEventListener('input', () => {
      setFieldMeta(element, 'Saving…');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => saveField(element), 350);
    });
    element.addEventListener('blur', () => {
      window.clearTimeout(timer);
      saveField(element);
    });
  });

  const parseCheckState = (checkId) => {
    const raw = storage.get(checkStateKey(checkId));
    if (raw !== null) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.selected === 'string') return parsed;
      } catch (_error) {
        // Fall through to the legacy selected-option value.
      }
    }
    const selected = storage.get(`check:${checkId}`);
    return selected === null ? null : { selected, checked: false, correct: false };
  };

  const renderCheckResult = (form, selected, checked) => {
    const result = form.querySelector('[data-check-result]');
    form.classList.toggle('is-checked', Boolean(checked));
    form.dataset.checked = checked ? 'true' : 'false';
    if (!result) return;
    if (!checked || !selected) {
      result.className = 'check-result';
      result.textContent = '';
      return;
    }
    const correct = selected.dataset.correct === 'true';
    result.className = `check-result ${correct ? 'correct' : 'try-again'}`;
    result.innerHTML = `<strong>${correct ? 'That reasoning works.' : 'Not quite yet.'}</strong> ${selected.dataset.feedback || ''}`;
  };

  const updateSectionProgress = (section) => {
    if (!section) return;
    const forms = [...section.querySelectorAll('[data-check-id]')];
    const checked = forms.filter((form) => form.dataset.checked === 'true').length;
    const target = section.querySelector('[data-check-count]');
    if (target) target.textContent = `${checked} of ${forms.length} questions checked`;
  };

  document.querySelectorAll('[data-check-id]').forEach((form) => {
    const checkId = form.dataset.checkId;
    const state = parseCheckState(checkId);
    if (state) {
      const option = form.querySelector(`input[value="${CSS.escape(state.selected)}"]`);
      if (option) {
        option.checked = true;
        renderCheckResult(form, option, state.checked === true);
      }
    }

    form.addEventListener('change', () => {
      const selected = form.querySelector('input[type="radio"]:checked');
      if (!selected) return;
      storage.set(`check:${checkId}`, selected.value);
      storage.set(checkStateKey(checkId), JSON.stringify({ selected: selected.value, checked: false, correct: false }));
      renderCheckResult(form, selected, false);
      updateSectionProgress(form.closest('.section-learning'));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = form.querySelector('input[type="radio"]:checked');
      const result = form.querySelector('[data-check-result]');
      if (!selected) {
        if (result) {
          result.className = 'check-result needs-answer';
          result.textContent = 'Choose one answer first.';
          result.focus();
        }
        return;
      }

      const correct = selected.dataset.correct === 'true';
      storage.set(`check:${checkId}`, selected.value);
      storage.set(checkStateKey(checkId), JSON.stringify({ selected: selected.value, checked: true, correct }));
      renderCheckResult(form, selected, true);
      updateSectionProgress(form.closest('.section-learning'));
      if (result) result.focus();
    });
  });

  document.querySelectorAll('.section-learning').forEach(updateSectionProgress);

  document.querySelectorAll('[data-help-toggle]').forEach((button) => {
    const target = document.getElementById(button.getAttribute('aria-controls'));
    if (!target) return;
    button.addEventListener('click', () => {
      const willOpen = target.hidden;
      target.hidden = !willOpen;
      button.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) target.focus();
    });
  });

  document.querySelectorAll('[data-clear-section]').forEach((button) => {
    button.addEventListener('click', () => {
      const section = button.closest('.section-learning');
      if (!section) return;
      const title = section.closest('.theory-section')?.querySelector('.theory-copy h2')?.textContent?.trim() || 'this section';
      if (!window.confirm(`Clear the four question choices and written response for “${title}”? This cannot be undone.`)) return;

      section.querySelectorAll('[data-check-id]').forEach((form) => {
        const checkId = form.dataset.checkId;
        storage.remove(`check:${checkId}`);
        storage.remove(checkStateKey(checkId));
        form.reset();
        renderCheckResult(form, null, false);
        const helpButton = form.querySelector('[data-help-toggle]');
        const help = helpButton && document.getElementById(helpButton.getAttribute('aria-controls'));
        if (helpButton) helpButton.setAttribute('aria-expanded', 'false');
        if (help) help.hidden = true;
      });

      section.querySelectorAll('[data-save-key]').forEach((field) => {
        storage.remove(`evidence:${field.dataset.saveKey}`);
        field.value = '';
        setFieldMeta(field, 'Ready to save');
      });
      updateSectionProgress(section);
      button.focus();
    });
  });

  const sectionEvidenceText = (section) => {
    const theory = section.closest('.theory-section');
    const title = theory?.querySelector('.theory-copy h2')?.textContent?.trim() || 'Theory section';
    const lines = [title, '-'.repeat(title.length), ''];
    section.querySelectorAll('[data-check-id]').forEach((form, index) => {
      const prompt = form.querySelector('legend')?.textContent?.trim() || `Question ${index + 1}`;
      const selected = form.querySelector('input[type="radio"]:checked');
      const answer = selected?.closest('label')?.querySelector('span')?.textContent?.trim() || 'Not answered';
      const state = form.dataset.checked === 'true' ? 'Checked' : (selected ? 'Selected, not checked' : 'Not answered');
      lines.push(`Question ${index + 1}: ${prompt}`, `Response: ${answer}`, `Status: ${state}`, '');
    });
    const written = section.querySelector('[data-written-response]');
    const writtenTitle = section.querySelector('.section-written h3')?.textContent?.trim() || 'Longer response';
    const writtenPrompt = section.querySelector('[data-written-prompt]')?.textContent?.trim() || '';
    lines.push(writtenTitle, writtenPrompt, '', written?.value?.trim() || 'No written response saved.', '');
    return lines.join('\r\n');
  };

  const downloadText = (filename, text) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  document.querySelectorAll('[data-download-module]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-save-key]').forEach(saveField);
      const moduleNumber = String(document.body.dataset.module || '').padStart(2, '0');
      const moduleTitle = document.querySelector('.module-hero h1')?.textContent?.trim() || `Module ${moduleNumber}`;
      const sections = [...document.querySelectorAll('.section-learning')].map(sectionEvidenceText);
      const heading = [
        'Catapult — Formative learning evidence',
        moduleTitle,
        'Student-created practice evidence — not proof of submission.',
        `Downloaded: ${new Date().toLocaleString()}`,
        '',
      ].join('\r\n');
      downloadText(`year-8-catapult-module-${moduleNumber}-formative-evidence.txt`, `${heading}${sections.join('\r\n')}`);
    });
  });

  document.querySelectorAll('[data-video-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const videoId = button.dataset.videoId;
      const holder = document.getElementById(button.getAttribute('aria-controls'));
      if (!videoId || !holder) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0`;
      iframe.title = button.dataset.videoTitle || 'Lesson video';
      iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      holder.replaceChildren(iframe);
      holder.hidden = false;
      button.disabled = true;
      button.textContent = 'Video loaded';
    });
  });

  document.querySelectorAll('[data-print-page]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-save-key]').forEach(saveField);
      window.print();
    });
  });

  let printStates = [];
  let printMirrors = [];
  window.addEventListener('beforeprint', () => {
    printStates = [...document.querySelectorAll('.section-learning')].map((section) => ({ section, open: section.open }));
    printStates.forEach(({ section }) => { section.open = true; });
    printMirrors = [...document.querySelectorAll('textarea[data-save-key]')].map((field) => {
      const mirror = document.createElement('div');
      mirror.className = 'print-response';
      mirror.textContent = field.value.trim() || 'No response saved.';
      field.insertAdjacentElement('afterend', mirror);
      return mirror;
    });
  });
  window.addEventListener('afterprint', () => {
    printStates.forEach(({ section, open }) => { section.open = open; });
    printStates = [];
    printMirrors.forEach((mirror) => mirror.remove());
    printMirrors = [];
  });
})();
