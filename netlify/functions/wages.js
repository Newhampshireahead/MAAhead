// Proxies CareerOneStop wage data for the free tool's career list, keeping
// the token hidden from the client. Shares its fetch logic and cache with
// generate-blueprint's targeted wage lookups via lib/wages.js.

const { CAREER_SOC, getWages } = require('./lib/wages.js');

exports.handler = async function () {
  const results = await getWages(Object.keys(CAREER_SOC));
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
