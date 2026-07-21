(function(){
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  const devMode = params.get('dev') === '1';

  const AREA_TO_LETTER = {
    realistic: 'R',
    investigative: 'I',
    artistic: 'A',
    social: 'S',
    enterprising: 'E',
    conventional: 'C',
  };

  // Active question/scale set for this render. Defaults to the local
  // placeholder content (interests.js); replaced with the live O*NET set
  // if /.netlify/functions/onet-questions returns a usable response.
  let activeQuestions = RIASEC_QUESTIONS;
  let activeScale = RIASEC_SCALE;
  let answers = new Array(activeQuestions.length).fill(null);

  function normalizeLiveQuestions(data){
    if (!data || !Array.isArray(data.questions) || data.questions.length !== 30) return null;
    const questions = data.questions.map(q => ({
      cat: AREA_TO_LETTER[q.area],
      text: q.text,
    }));
    if (questions.some(q => !q.cat || !q.text)) return null;

    let scale = RIASEC_SCALE;
    if (Array.isArray(data.answerOptions) && data.answerOptions.length){
      scale = data.answerOptions.map(o => ({ v: o.value, label: o.name }));
    }
    return { questions, scale };
  }

  function loadOnetQuestions(){
    return fetch('/.netlify/functions/onet-questions')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const normalized = normalizeLiveQuestions(data);
        if (normalized){
          activeQuestions = normalized.questions;
          activeScale = normalized.scale;
          answers = new Array(activeQuestions.length).fill(null);
        }
      })
      .catch(() => {});
      // Any failure here just leaves the local placeholder set active.
  }

  function show(stateId){
    ['stateVerifying', 'stateError', 'stateQuiz', 'stateDone'].forEach(id => {
      document.getElementById(id).hidden = (id !== stateId);
    });
  }

  function renderQuestions(){
    const wrap = document.getElementById('iqQuestions');
    wrap.innerHTML = '';
    document.getElementById('iqProgress').dataset.total = activeQuestions.length;
    activeQuestions.forEach((q, i) => {
      const row = document.createElement('div');
      row.className = 'iq-question';

      const text = document.createElement('span');
      text.className = 'iq-text';
      text.textContent = q.text;
      row.appendChild(text);

      const scale = document.createElement('div');
      scale.className = 'iq-scale';
      activeScale.forEach(opt => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'iq-opt';
        b.textContent = String(opt.v);
        b.title = opt.label;
        b.addEventListener('click', () => {
          answers[i] = opt.v;
          scale.querySelectorAll('.iq-opt').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          updateProgress();
        });
        scale.appendChild(b);
      });
      row.appendChild(scale);

      wrap.appendChild(row);
    });
  }

  function updateProgress(){
    const answered = answers.filter(a => a !== null).length;
    document.getElementById('iqProgress').textContent = `${answered} of ${activeQuestions.length} answered`;
    document.getElementById('iqSubmit').disabled = answered < activeQuestions.length;
  }

  function loadBudgetState(){
    try {
      const raw = sessionStorage.getItem('nhaBlueprintData');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function submitQuiz(){
    const totals = computeRiasecScores(answers, activeQuestions);
    const code = topRiasecCode(totals);
    const budgetState = loadBudgetState();

    document.getElementById('doneCode').textContent = code;
    show('stateDone');

    // generate-blueprint re-verifies payment server-side, builds the PDF,
    // and emails it. Fire-and-forget from the UI's perspective; any failure
    // here shouldn't strand the user since they've already seen confirmation.
    fetch('/.netlify/functions/generate-blueprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, totals, code, budgetState }),
    }).catch(() => {});
  }

  function startQuiz(){
    // Fetch the live O*NET question set (falls back to the local placeholder
    // set on any failure), then render whichever ended up active.
    loadOnetQuestions().then(() => {
      show('stateQuiz');
      renderQuestions();
      updateProgress();
    });
  }

  function verifyAndStart(){
    if (devMode){
      startQuiz();
      return;
    }
    if (!sessionId){
      show('stateError');
      return;
    }
    show('stateVerifying');
    fetch('/.netlify/functions/verify-purchase?session_id=' + encodeURIComponent(sessionId))
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data && data.paid){
          startQuiz();
        } else {
          show('stateError');
        }
      })
      .catch(() => show('stateError'));
  }

  document.getElementById('iqSubmit').addEventListener('click', submitQuiz);
  verifyAndStart();
})();
