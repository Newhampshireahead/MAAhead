(function(){
  const state = {
    region: DEFAULT_REGION,
    selections: {},
    careerFilter: 'all',
    autoLoans: false,
  };

  CATEGORIES.forEach(cat => { state.selections[cat.id] = cat.def; });

  function fmt(n){
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  // Massachusetts adds a flat 5% state income tax on top of the federal+FICA
  // blended rate below, plus a 4% surtax on the portion of income above the
  // "Millionaire's Tax" threshold ($1,107,750 for 2026, adjusted annually for
  // inflation by the MA Dept. of Revenue) — recheck this figure yearly.
  const MA_SURTAX_THRESHOLD = 1107750;
  const MA_FLAT_RATE = 0.05;
  const MA_SURTAX_RATE = 0.04;

  function bracketRate(gross){
    let rate;
    if (gross < 30000) rate = 0.13;
    else if (gross < 55000) rate = 0.16;
    else if (gross < 90000) rate = 0.19;
    else if (gross < 130000) rate = 0.22;
    else rate = 0.25;

    rate += MA_FLAT_RATE;
    if (gross > MA_SURTAX_THRESHOLD) rate += MA_SURTAX_RATE;
    return rate;
  }

  function requiredSalary(monthlyTakeHome){
    const annualNet = monthlyTakeHome * 12;
    let gross = annualNet;
    for (let i = 0; i < 6; i++){
      const rate = bracketRate(gross);
      gross = annualNet / (1 - rate);
    }
    return gross;
  }

  function autoLoanFor(career){
    if (career.level === 'noDegree') return 0;
    if (career.level === 'twoYear') return 160;
    if (career.grad) return 700;
    return 400;
  }

  function currentRegion(){
    return REGIONS.find(r => r.id === state.region) || REGIONS[0];
  }

  function categoryMonthly(cat, optIndex){
    const opt = cat.options[optIndex];
    if (cat.percent) return null;
    if (!cat.regional) return opt.v;
    return Math.round((opt.v * currentRegion().mult) / 10) * 10;
  }

  function computeBudget(overrideStudentLoanMonthly){
    const savingsCat = CATEGORIES.find(c => c.percent);
    const pct = savingsCat.options[state.selections[savingsCat.id]].pct;

    let nonSavings = 0;
    CATEGORIES.forEach(cat => {
      if (cat.percent) return;
      let monthly = categoryMonthly(cat, state.selections[cat.id]);
      if (cat.id === 'studentloans' && overrideStudentLoanMonthly !== undefined){
        monthly = overrideStudentLoanMonthly;
      }
      nonSavings += monthly;
    });

    const takeHome = nonSavings / (1 - pct);
    const savingsAmount = takeHome - nonSavings;
    return { nonSavings, pct, savingsAmount, monthlyTotal: takeHome, salary: requiredSalary(takeHome) };
  }

  function renderRegions(){
    const grid = document.getElementById('regionGrid');
    const rentBase = CATEGORIES.find(c => c.id === 'rent').options[1].v; // "Studio or 1-bedroom"
    grid.innerHTML = '';
    REGIONS.forEach(r => {
      const rentEstimate = Math.round((rentBase * r.mult) / 10) * 10;
      const btn = document.createElement('button');
      btn.className = 'region-card' + (r.id === state.region ? ' active' : '');
      btn.innerHTML = `<span class="r-name">${r.name}</span><span class="r-towns">${r.towns}</span><span class="r-rent mono">1-bedroom ~ ${fmt(rentEstimate)}/mo</span>`;
      btn.addEventListener('click', () => {
        state.region = r.id;
        renderRegions();
        renderAll();
      });
      grid.appendChild(btn);
    });
  }

  function renderGroups(){
    const container = document.getElementById('groupsContainer');
    container.innerHTML = '';
    GROUPS.forEach(group => {
      const block = document.createElement('div');
      block.className = 'group-block';
      const title = document.createElement('div');
      title.className = 'group-title';
      title.textContent = group;
      block.appendChild(title);

      CATEGORIES.filter(c => c.group === group).forEach(cat => {
        block.appendChild(renderCategory(cat));
      });

      container.appendChild(block);
    });
  }

  function renderCategory(cat){
    const wrap = document.createElement('div');
    wrap.className = 'category';
    wrap.id = 'cat-' + cat.id;

    const label = document.createElement('div');
    label.className = 'category-label';
    label.textContent = cat.label;
    wrap.appendChild(label);

    const note = document.createElement('div');
    note.className = 'category-note';
    note.innerHTML = cat.note;
    wrap.appendChild(note);

    const options = document.createElement('div');
    options.className = 'options';

    cat.options.forEach((opt, idx) => {
      const pill = document.createElement('button');
      pill.className = 'option-pill' + (state.selections[cat.id] === idx ? ' active' : '');
      pill.setAttribute('aria-pressed', state.selections[cat.id] === idx ? 'true' : 'false');

      let valueHtml = '';
      if (cat.percent){
        valueHtml = `<span class="o-value mono">${Math.round(opt.pct * 100)}%</span>`;
      } else {
        const monthly = categoryMonthly(cat, idx);
        valueHtml = `<span class="o-value mono">${monthly === 0 ? '$0' : fmt(monthly) + '/mo'}</span>`;
      }

      pill.innerHTML = `<span class="o-title">${opt.t}</span><span class="o-desc">${opt.d}</span>${valueHtml}`;
      pill.addEventListener('click', () => {
        state.selections[cat.id] = idx;
        renderGroups();
        renderAll();
      });
      options.appendChild(pill);
    });

    wrap.appendChild(options);

    if (cat.percent){
      const live = document.createElement('div');
      live.className = 'savings-live';
      live.id = 'savingsLive';
      wrap.appendChild(live);
    }

    return wrap;
  }

  function renderNumberPanel(budget){
    document.getElementById('regionLabelInline').textContent = currentRegion().name;
    document.getElementById('monthlyTotal').textContent = fmt(budget.monthlyTotal);
    document.getElementById('salaryNeeded').textContent = fmt(budget.salary);

    const live = document.getElementById('savingsLive');
    if (live){
      live.innerHTML = `Right now that's <span class="mono">${fmt(budget.savingsAmount)}/mo</span> going into savings.`;
    }
  }

  function renderBottomBar(budget){
    document.getElementById('bbRegion').textContent = currentRegion().name;
    document.getElementById('bbMonthly').textContent = fmt(budget.monthlyTotal);
    document.getElementById('bbSalary').textContent = fmt(budget.salary);
  }

  function renderCareers(budget){
    const grid = document.getElementById('careersGrid');
    grid.innerHTML = '';

    const studentLoanCat = CATEGORIES.find(c => c.id === 'studentloans');
    const manualLoanMonthly = studentLoanCat.options[state.selections.studentloans].v;

    let list = MA_CAREERS.slice();
    if (state.careerFilter === 'grad'){
      list = list.filter(c => c.grad === true);
    } else if (state.careerFilter !== 'all'){
      list = list.filter(c => c.level === state.careerFilter);
    }

    list.forEach(career => {
      let salaryForCareer = budget.salary;
      if (state.autoLoans){
        const perCareerBudget = computeBudget(autoLoanFor(career));
        salaryForCareer = perCareerBudget.salary;
      }

      const diff = career.wage - salaryForCareer;
      const covers = diff >= 0;
      const badgeText = covers
        ? `Covers it, ${fmt(diff)} to spare`
        : `Short by ${fmt(Math.abs(diff))}`;

      const card = document.createElement('div');
      card.className = 'career-card';
      card.innerHTML = `
        <span class="c-title">${career.t}</span>
        <span class="c-wage mono">${fmt(career.wage)}/yr</span>
        <span class="c-path">${career.path}</span>
        <span class="fit-badge ${covers ? 'cover' : 'short'}">${badgeText}</span>
      `;
      grid.appendChild(card);
    });
  }

  function renderAll(){
    const budget = computeBudget();
    renderNumberPanel(budget);
    renderBottomBar(budget);
    renderCareers(budget);
  }

  function initFilters(){
    document.querySelectorAll('.filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.careerFilter = btn.dataset.filter;
        renderAll();
      });
    });
  }

  function initAutoLoanSwitch(){
    const sw = document.getElementById('autoLoanSwitch');
    sw.addEventListener('click', () => {
      state.autoLoans = !state.autoLoans;
      sw.classList.toggle('on', state.autoLoans);
      sw.setAttribute('aria-pressed', state.autoLoans ? 'true' : 'false');
      renderAll();
    });
  }

  function captureBlueprintState(){
    const budget = computeBudget();
    const data = {
      region: state.region,
      selections: state.selections,
      monthlyTotal: budget.monthlyTotal,
      salaryNeeded: budget.salary,
      savedAt: Date.now(),
    };
    try { sessionStorage.setItem('nhaBlueprintData', JSON.stringify(data)); } catch (e) {}
  }

  function initBlueprintCta(){
    const cta = document.getElementById('blueprintCta');
    cta.addEventListener('click', () => {
      // Snapshot the user's region/budget/salary now, before they leave for
      // Stripe Checkout, so blueprint.html can read it back via
      // sessionStorage once they land on the post-purchase quiz.
      captureBlueprintState();

      const fallbackToScroll = () => {
        document.getElementById('step-blueprint').scrollIntoView({ behavior: 'smooth' });
      };

      // If checkout fails for any reason, fail quietly back to the scroll
      // behavior rather than stranding the user on a broken click.
      const originalLabel = cta.textContent;
      cta.disabled = true;
      cta.textContent = 'Loading…';
      fetch('/.netlify/functions/create-checkout-session', { method: 'POST' })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          if (data && data.url){
            window.location.href = data.url;
          } else {
            fallbackToScroll();
          }
        })
        .catch(() => fallbackToScroll())
        .finally(() => { cta.disabled = false; cta.textContent = originalLabel; });
    });
  }

  function loadLiveWages(){
    fetch('/.netlify/functions/wages')
      .then(res => res.ok ? res.json() : null)
      .then(live => {
        if (!live) return;
        let changed = false;
        MA_CAREERS.forEach(career => {
          const match = live[career.id];
          if (match && match.median){
            career.wage = match.median;
            changed = true;
          }
        });
        if (changed) renderAll();
      })
      .catch(() => {});
  }

  function initShare(){
    const shareBtn = document.getElementById('shareBtn');
    const copyBtn = document.getElementById('copyLinkBtn');
    const shareData = {
      title: 'MA Ahead',
      text: 'See what it actually costs to live your life in Massachusetts, and which careers can pay for it.',
      url: 'https://maahead.com/',
    };

    // navigator.share opens the OS-native share sheet on mobile, which
    // includes Instagram, Messages, WhatsApp, etc. automatically. There's
    // no web API for a direct "share to Instagram" button, this is the
    // closest real equivalent. Desktop browsers without it fall back to
    // opening a Twitter/X share intent instead.
    if (navigator.share){
      shareBtn.addEventListener('click', () => {
        navigator.share(shareData).catch(() => {});
      });
    } else {
      shareBtn.textContent = 'Share on X →';
      shareBtn.addEventListener('click', () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        window.open(url, '_blank', 'noopener');
      });
    }

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(shareData.url).then(() => {
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = original; }, 1800);
      }).catch(() => {});
    });
  }

  renderRegions();
  renderGroups();
  initFilters();
  initAutoLoanSwitch();
  initBlueprintCta();
  initShare();
  renderAll();
  loadLiveWages();
})();
