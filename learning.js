(() => {
  'use strict';

  const course = window.CATAPULT_COURSE;
  if (!course || !course.storage) return;

  const storage = course.storage;
  const statusFor = (field) => document.querySelector(`[data-save-status="${CSS.escape(field)}"]`);

  const saveField = (element) => {
    const key = element.dataset.saveKey;
    if (!key) return;
    const saved = storage.set(`evidence:${key}`, element.value);
    const status = statusFor(key);
    if (status) status.textContent = saved ? 'Saved on this device' : 'Could not save on this device';
  };

  document.querySelectorAll('[data-save-key]').forEach((element) => {
    const key = element.dataset.saveKey;
    const saved = storage.get(`evidence:${key}`);
    if (saved !== null) element.value = saved;

    let timer;
    element.addEventListener('input', () => {
      const count = document.querySelector(`[data-character-count="${CSS.escape(key)}"]`);
      if (count) count.textContent = `${element.value.length} characters`;
      const status = statusFor(key);
      if (status) status.textContent = 'Saving…';
      window.clearTimeout(timer);
      timer = window.setTimeout(() => saveField(element), 350);
    });
    element.dispatchEvent(new Event('input'));
  });

  document.querySelectorAll('[data-check-id]').forEach((form) => {
    const checkId = form.dataset.checkId;
    const result = form.querySelector('[data-check-result]');
    const saved = storage.get(`check:${checkId}`);
    if (saved !== null) {
      const option = form.querySelector(`input[value="${CSS.escape(saved)}"]`);
      if (option) option.checked = true;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = form.querySelector('input[type="radio"]:checked');
      if (!selected) {
        if (result) {
          result.className = 'check-result needs-answer';
          result.textContent = 'Choose one answer first.';
          result.focus();
        }
        return;
      }

      storage.set(`check:${checkId}`, selected.value);
      const correct = selected.dataset.correct === 'true';
      if (result) {
        result.className = `check-result ${correct ? 'correct' : 'try-again'}`;
        result.innerHTML = `<strong>${correct ? 'That reasoning works.' : 'Not quite yet.'}</strong> ${selected.dataset.feedback || ''}`;
        result.focus();
      }
    });
  });

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
    button.addEventListener('click', () => window.print());
  });
})();
