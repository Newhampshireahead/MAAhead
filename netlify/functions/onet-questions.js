// Fetches the official O*NET Mini Interest Profiler (30-question) content
// server-side, so the ONET_API_KEY never reaches the browser. Normalizes
// O*NET's response into { questions: [{index, area, text}], answerOptions:
// [{value, name}] } for the front end. On any failure, returns an empty
// result so blueprint.js can fall back to the local placeholder question
// set in interests.js rather than breaking the quiz.
//
// O*NET paginates this endpoint at 12 items/page regardless of the "_30"
// name, so this pages through start/end until 30 questions are collected.

const CACHE_MS = 1000 * 60 * 60 * 24;
let cache = null;
let cacheTime = 0;

const BASE = 'https://api-v2.onetcenter.org/mnm/interestprofiler';

exports.handler = async function () {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_MS) {
    return respond(cache);
  }

  const apiKey = (process.env.ONET_API_KEY || '').trim();
  if (!apiKey) {
    console.error('onet-questions: ONET_API_KEY env var is missing');
    return respond(empty());
  }

  try {
    const questions = [];
    let answerOptions = [];
    let start = 1;
    let pages = 0;

    while (pages < 6 && questions.length < 30) {
      pages += 1;
      const end = start + 11;
      const url = `${BASE}/questions_30?start=${start}&end=${end}`;
      const res = await fetch(url, {
        headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`onet-questions: HTTP ${res.status} from ${url}: ${body.slice(0, 500)}`);
        return respond(empty());
      }

      const data = await res.json();
      const rawQuestions = data.question || data.questions || [];
      const rawOptions = data.answer_option || data.answer_options || [];

      rawQuestions.forEach((q) => {
        questions.push({ index: q.index, area: (q.area || '').toLowerCase(), text: q.text });
      });
      if (rawOptions.length) answerOptions = rawOptions.map((o) => ({ value: o.value, name: o.name }));

      if (!rawQuestions.length) break; // API returned nothing more for this range
      start = end + 1;
    }

    if (!questions.length) {
      console.error('onet-questions: no questions collected across pages');
      return respond(empty());
    }

    console.log(`onet-questions: collected ${questions.length} questions across ${pages} page(s)`);

    const result = { questions, answerOptions };
    cache = result;
    cacheTime = now;
    return respond(result);
  } catch (err) {
    const cause = err && err.cause ? ` cause: ${err.cause.code || err.cause.message || err.cause}` : '';
    console.error(`onet-questions: threw: ${err.name || ''} ${err.message}${cause}`);
    return respond(empty());
  }
};

function empty() {
  return { questions: [], answerOptions: [] };
}

function respond(body) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
    body: JSON.stringify(body),
  };
}
