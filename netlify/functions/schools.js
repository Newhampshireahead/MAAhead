// Proxies College Scorecard so the free tool can show real MA schools per
// career without exposing the API key client-side. Shares its fetch logic
// and cache with generate-blueprint's targeted lookups via lib/schools.js.

const { CAREER_CIP4, getSchools } = require('./lib/schools.js');

exports.handler = async function () {
  const results = await getSchools(Object.keys(CAREER_CIP4));
  return respond(results);
};

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
