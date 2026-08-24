(() => {
  'use strict';

  const moduleNumber = Number(document.body.dataset.module);
  const titles = window.CATAPULT_MODULES || [];
  const title = titles[moduleNumber - 1];

  if (!Number.isInteger(moduleNumber) || moduleNumber < 1 || moduleNumber > titles.length || !title) {
    document.body.dataset.moduleError = 'true';
    return;
  }

  document.querySelectorAll('[data-module-number]').forEach((element) => {
    element.textContent = String(moduleNumber);
  });
  document.querySelectorAll('[data-module-title]').forEach((element) => {
    element.textContent = title;
  });
  document.title = `Module ${moduleNumber}: ${title} | Catapult`;

  const slotDefinitions = [
    ['theory', 'Named theory sections', 'Stage 05', 'Verified Stage 01 source map and permitted fact boundary'],
    ['knowledge-checks-and-evidence', 'Knowledge checks and evidence', 'Stage 06', 'Final Stage 05 section identifiers'],
    ['presentation', 'Classroom presentation', 'Stage 07', 'Approved module concepts and current source ledger'],
    ['visuals', 'Purposeful visuals', 'Stage 08', 'Stage 01 visual target and concept-specific brief'],
    ['video', 'Video learning or equivalent', 'Stage 09', 'Validated module concept and watch-for purpose'],
    ['applied-activity', 'Applied Learning Activity', 'Stage 10', 'Named concept and practical/evidence connection'],
    ['folio-evidence', 'Folio evidence connection', 'Stage 11', 'Integrated prompts and stable storage contract']
  ];

  const slotList = document.querySelector('[data-slot-list]');
  if (slotList) {
    slotDefinitions.forEach(([slot, heading, owner, dependency]) => {
      const article = document.createElement('article');
      article.className = 'slot-card';
      article.dataset.slot = slot;

      const status = document.createElement('p');
      status.className = 'slot-status';
      status.textContent = 'Integrated in candidate v1.0.0';

      const slotHeading = document.createElement('h3');
      slotHeading.textContent = heading;

      const details = document.createElement('dl');
      const ownerTerm = document.createElement('dt');
      ownerTerm.textContent = 'Owner';
      const ownerDescription = document.createElement('dd');
      ownerDescription.textContent = owner;
      const dependencyTerm = document.createElement('dt');
      dependencyTerm.textContent = 'Dependency';
      const dependencyDescription = document.createElement('dd');
      dependencyDescription.textContent = dependency;
      details.append(ownerTerm, ownerDescription, dependencyTerm, dependencyDescription);

      article.append(status, slotHeading, details);
      slotList.append(article);
    });
  }

  const previous = document.querySelector('[data-previous]');
  if (previous) {
    if (moduleNumber === 1) {
      previous.hidden = true;
    } else {
      previous.href = `module-${String(moduleNumber - 1).padStart(2, '0')}.html`;
      previous.textContent = `← Module ${moduleNumber - 1}`;
    }
  }

  const next = document.querySelector('[data-next]');
  if (next) {
    if (moduleNumber === titles.length) {
      next.href = '../folio.html';
      next.textContent = 'Folio route →';
    } else {
      next.href = `module-${String(moduleNumber + 1).padStart(2, '0')}.html`;
      next.textContent = `Module ${moduleNumber + 1} →`;
    }
  }
})();
