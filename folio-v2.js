(() => {
  'use strict';

  const course = window.CATAPULT_COURSE;
  if (!course || !course.storage) return;
  const storage = course.storage;
  const prefix = course.storage.prefix;
  const folioPrefix = `${prefix}folio:`;
  const stageFields = [...document.querySelectorAll('[data-folio-field]')];
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const maxInputBytes = 5_000_000;

  const readFieldValue = (field) => field.type === 'checkbox' ? (field.checked ? 'checked' : '') : field.value;
  const applyFieldValue = (field, value) => {
    if (field.type === 'checkbox') field.checked = value === 'checked';
    else field.value = value;
  };

  const openImageDb = () => new Promise((resolve, reject) => {
    const request = indexedDB.open('tas-catapult-year8-folio', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { keyPath: 'stage' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const imageGet = async (stage) => {
    const db = await openImageDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('images', 'readonly').objectStore('images').get(String(stage));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  };

  const imagePut = async (record) => {
    const db = await openImageDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('images', 'readwrite').objectStore('images').put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  };

  const imageAll = async () => {
    const db = await openImageDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('images', 'readonly').objectStore('images').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  };

  const imageClear = async () => {
    const db = await openImageDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction('images', 'readwrite').objectStore('images').clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  };

  const download = (content, type, filename) => {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const htmlEscape = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const updateProgress = () => {
    const stageTotals = new Map();
    stageFields.forEach((field) => {
      const value = readFieldValue(field).trim();
      stageTotals.set(field.dataset.stage, (stageTotals.get(field.dataset.stage) || 0) + value.length);
    });
    const completedStages = [...stageTotals.values()].filter((total) => total >= 40).length;
    const out = document.querySelector('[data-folio-progress]');
    if (out) out.textContent = `${completedStages} of 8 stages have a substantial saved response`;
  };

  stageFields.forEach((field) => {
    const key = `folio:${field.dataset.folioField}`;
    const saved = storage.get(key);
    if (saved !== null) applyFieldValue(field, saved);
    let timer;
    field.addEventListener('input', () => {
      window.clearTimeout(timer);
      const status = field.closest('.folio-stage')?.querySelector('[data-stage-status]');
      if (status) status.textContent = 'Saving…';
      timer = window.setTimeout(() => {
        const ok = storage.set(key, readFieldValue(field));
        if (status) status.textContent = ok ? `Saved on this browser at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Could not save';
        updateProgress();
      }, 350);
    });
  });

  document.querySelectorAll('[data-image-caption]').forEach((field) => {
    const stage = field.dataset.imageCaption;
    const saved = storage.get(`folio:caption:${stage}`);
    if (saved !== null) field.value = saved;
    field.addEventListener('input', () => storage.set(`folio:caption:${stage}`, field.value));
  });

  document.querySelectorAll('[data-folio-image]').forEach(async (input) => {
    const stage = input.dataset.folioImage;
    const preview = document.querySelector(`[data-image-preview="${CSS.escape(stage)}"]`);
    try {
      const saved = await imageGet(stage);
      if (saved?.data && preview) {
        preview.src = saved.data;
        preview.hidden = false;
      }
    } catch (_error) {
      const status = input.closest('.image-evidence')?.querySelector('[data-image-status]');
      if (status) status.textContent = 'Image storage is not available in this browser. Keep the original photo.';
    }

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      const status = input.closest('.image-evidence')?.querySelector('[data-image-status]');
      if (!file) return;
      if (!allowedTypes.has(file.type) || file.size > maxInputBytes) {
        if (status) status.textContent = 'Choose a JPG, PNG or WebP image no larger than 5 MB.';
        input.value = '';
        return;
      }
      const image = new Image();
      const reader = new FileReader();
      reader.onload = () => { image.src = String(reader.result); };
      image.onload = async () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', .78);
        try {
          await imagePut({ stage: String(stage), data, type: 'image/jpeg', updated: new Date().toISOString() });
          if (preview) {
            preview.src = data;
            preview.hidden = false;
          }
          if (status) status.textContent = 'Photo saved on this browser';
        } catch (_error) {
          if (status) status.textContent = 'This browser could not save the photo. Keep the original and use the text response.';
        }
      };
      reader.readAsDataURL(file);
    });
  });

  const getFolioFields = () => {
    const fields = {};
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(folioPrefix)) fields[key] = window.localStorage.getItem(key);
    }
    return fields;
  };

  const stageContext = () => [...document.querySelectorAll('[data-folio-stage-title]')].map((stage) => ({
    id: stage.id,
    title: stage.dataset.folioStageTitle,
    prompt: stage.dataset.folioStagePrompt
  }));

  document.querySelector('[data-folio-backup]')?.addEventListener('click', async () => {
    const data = {
      schema: 1,
      course: 'year8-catapult',
      created: new Date().toISOString(),
      boundary: 'Browser-local folio backup; not proof of submission',
      stages: stageContext(),
      fields: getFolioFields(),
      images: await imageAll()
    };
    download(JSON.stringify(data, null, 2), 'application/json', `catapult-folio-backup-${new Date().toISOString().slice(0, 10)}.json`);
  });

  document.querySelector('[data-folio-export]')?.addEventListener('click', async () => {
    const images = new Map((await imageAll()).map((item) => [String(item.stage), item]));
    const sections = [...document.querySelectorAll('[data-folio-stage-title]')].map((stage, index) => {
      const stageNumber = String(index + 1);
      const responses = [...stage.querySelectorAll('[data-folio-field]')].map((field) => ({
        label: field.dataset.folioLabel || 'Response',
        value: readFieldValue(field)
      })).filter((item) => item.value.trim());
      const caption = storage.get(`folio:caption:${stageNumber}`) || '';
      const image = images.get(stageNumber);
      const responseHtml = responses.length ? responses.map((item) => `<h3>${htmlEscape(item.label)}</h3><div class="response">${htmlEscape(item.value).replace(/\n/g, '<br>')}</div>`).join('') : '<div class="response"><em>No response saved.</em></div>';
      return `<section><h2>${index + 1}. ${htmlEscape(stage.dataset.folioStageTitle)}</h2><p class="prompt">${htmlEscape(stage.dataset.folioStagePrompt)}</p>${responseHtml}${image?.data ? `<figure><img src="${image.data}" alt="Student evidence for stage ${index + 1}"><figcaption>${htmlEscape(caption || 'No caption saved.')}</figcaption></figure>` : ''}</section>`;
    }).join('');
    const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Catapult folio evidence</title><style>body{max-width:900px;margin:0 auto;padding:32px;font:16px/1.55 Arial,sans-serif;color:#17232b}header{border-bottom:4px solid #184f5e}section{padding:24px 0;border-bottom:1px solid #cad4d8}.prompt{font-weight:bold}.response{white-space:normal;padding:16px;background:#f3f6f7;border-left:5px solid #efb84c}img{max-width:100%;max-height:520px;object-fit:contain}figcaption{color:#53636d}@media print{body{padding:0}section{break-inside:avoid}}</style></head><body><header><h1>My Catapult design folio</h1><p>Student-created evidence export — not proof of submission</p><p>Created ${htmlEscape(new Date().toLocaleString())}</p></header>${sections}</body></html>`;
    download(html, 'text/html', `catapult-folio-evidence-${new Date().toISOString().slice(0, 10)}.html`);
  });

  const restoreInput = document.querySelector('[data-folio-restore]');
  restoreInput?.addEventListener('change', async () => {
    const file = restoreInput.files?.[0];
    const status = document.querySelector('[data-restore-status]');
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.schema !== 1 || data.course !== 'year8-catapult' || typeof data.fields !== 'object' || !Array.isArray(data.images)) throw new Error('wrong backup');
      const validFieldEntries = Object.entries(data.fields).filter(([key, value]) => key.startsWith(folioPrefix) && typeof value === 'string');
      const validImages = data.images.filter((item) => item && typeof item.stage === 'string' && typeof item.data === 'string' && item.data.startsWith('data:image/'));
      if (validFieldEntries.length !== Object.keys(data.fields).length || validImages.length !== data.images.length) throw new Error('invalid fields');
      validFieldEntries.forEach(([key, value]) => window.localStorage.setItem(key, value));
      for (const image of validImages) await imagePut(image);
      if (status) status.textContent = 'Backup restored. Reloading the folio…';
      window.setTimeout(() => window.location.reload(), 500);
    } catch (_error) {
      if (status) status.textContent = 'That file is not a valid Catapult folio backup.';
    }
  });

  document.querySelector('[data-folio-reset]')?.addEventListener('click', async () => {
    const typed = window.prompt('To clear only this Catapult folio from this browser, type RESET. Download a backup first if you need one.');
    if (typed !== 'RESET') return;
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(folioPrefix)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    await imageClear();
    window.location.reload();
  });

  document.querySelectorAll('[data-print-folio]').forEach((button) => button.addEventListener('click', () => window.print()));
  updateProgress();
})();
