(() => {
  'use strict';

  const STORAGE_PREFIX = 'tas:catapult:year8:v1:';

  const keyFor = (suffix) => {
    if (!/^[a-z0-9][a-z0-9:._-]*$/i.test(suffix)) {
      throw new TypeError('Storage suffix must contain only letters, numbers, colons, dots, underscores or hyphens.');
    }
    return `${STORAGE_PREFIX}${suffix}`;
  };

  const storage = Object.freeze({
    prefix: STORAGE_PREFIX,
    get(suffix) {
      try {
        return window.localStorage.getItem(keyFor(suffix));
      } catch (_error) {
        return null;
      }
    },
    set(suffix, value) {
      try {
        window.localStorage.setItem(keyFor(suffix), String(value));
        return true;
      } catch (_error) {
        return false;
      }
    },
    remove(suffix) {
      try {
        window.localStorage.removeItem(keyFor(suffix));
        return true;
      } catch (_error) {
        return false;
      }
    }
  });

  window.CATAPULT_COURSE = Object.freeze({
    courseId: 'year8-catapult',
    schemaVersion: 1,
    storage
  });

  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
})();
