(() => {
  'use strict';

  const course = window.CATAPULT_COURSE;
  if (!course || !course.storage) return;
  const storage = course.storage;
  const prefix = course.storage.prefix;
  const stageFields = [...document.querySelectorAll('[data-folio-field]')];

  const updateProgress = () => {
    const completedStages = new Set(stageFields.filter((field) => field.value.trim().length >= 40).map((field) => field.dataset.stage));
    const out = document.querySelector('[data-folio-progress]');
    if (out) out.textContent = `${completedStages.size} of 8 stages have a substantial saved response`;
  };

  stageFields.forEach((field) => {
    const key = `folio:${field.dataset.folioField}`;
    const saved = storage.get(key);
    if (saved !== null) field.value = saved;
    let timer;
    field.addEventListener('input', () => {
      window.clearTimeout(timer);
      const status = field.closest('.folio-field')?.querySelector('[data-field-status]');
      if (status) status.textContent = 'Saving…';
      timer = window.setTimeout(() => {
        const ok = storage.set(key, field.value);
        if (status) status.textContent = ok ? 'Saved on this device' : 'Could not save';
        updateProgress();
      }, 350);
    });
  });

  document.querySelectorAll('[data-folio-image]').forEach((input) => {
    const stage = input.dataset.folioImage;
    const preview = document.querySelector(`[data-image-preview="${CSS.escape(stage)}"]`);
    const saved = storage.get(`folio:image:${stage}`);
    if (saved && preview) {
      preview.src = saved;
      preview.hidden = false;
    }
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      const image = new Image();
      const reader = new FileReader();
      reader.onload = () => { image.src = String(reader.result); };
      image.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', .78);
        const ok = storage.set(`folio:image:${stage}`, data);
        if (ok && preview) {
          preview.src = data;
          preview.hidden = false;
        }
        const status = input.closest('.image-evidence')?.querySelector('[data-image-status]');
        if (status) status.textContent = ok ? 'Photo saved on this device' : 'Photo is too large to save here. Keep the original and use the text field.';
      };
      reader.readAsDataURL(file);
    });
  });

  const backup = document.querySelector('[data-folio-backup]');
  backup?.addEventListener('click', () => {
    const data = { schema: 1, course: 'year8-catapult', created: new Date().toISOString(), fields: {} };
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(prefix)) data.fields[key] = window.localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `catapult-folio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  const restoreInput = document.querySelector('[data-folio-restore]');
  restoreInput?.addEventListener('change', async () => {
    const file = restoreInput.files?.[0];
    const status = document.querySelector('[data-restore-status]');
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.schema !== 1 || data.course !== 'year8-catapult' || typeof data.fields !== 'object') throw new Error('wrong backup');
      Object.entries(data.fields).forEach(([key, value]) => {
        if (key.startsWith(prefix) && typeof value === 'string') window.localStorage.setItem(key, value);
      });
      if (status) status.textContent = 'Backup restored. Reloading the folio…';
      window.setTimeout(() => window.location.reload(), 500);
    } catch (_error) {
      if (status) status.textContent = 'That file is not a valid Catapult folio backup.';
    }
  });

  document.querySelector('[data-folio-reset]')?.addEventListener('click', () => {
    const typed = window.prompt('To clear only this Catapult course evidence from this browser, type RESET. Make a backup first if you need one.');
    if (typed !== 'RESET') return;
    const keys=[];
    for (let i=0;i<window.localStorage.length;i+=1) { const key=window.localStorage.key(i); if(key?.startsWith(prefix)) keys.push(key); }
    keys.forEach((key)=>window.localStorage.removeItem(key));
    window.location.reload();
  });

  document.querySelectorAll('[data-print-folio]').forEach((button) => button.addEventListener('click', () => window.print()));
  updateProgress();
})();
