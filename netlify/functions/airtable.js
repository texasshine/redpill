// ============================================================
// NETLIFY FUNCTION — Airtable Proxy
// File path: netlify/functions/airtable.js
//
// Environment variables required in Netlify dashboard:
//   AIRTABLE_API_KEY  → your Personal Access Token
//   AIRTABLE_BASE_ID  → e.g. appXXXXXXXXXXXXXX
// ============================================================

exports.handler = async (event) => {

  const API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = process.env.AIRTABLE_BASE_ID;

  const responseHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: responseHeaders, body: '' };
  }

  // Confirm env vars are present (values never logged)
  console.log('API_KEY present:', !!API_KEY);
  console.log('BASE_ID present:', !!BASE_ID);

  if (!API_KEY || !BASE_ID) {
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Missing Airtable credentials in environment variables.' })
    };
  }

  const AT_BASE = `https://api.airtable.com/v0/${BASE_ID}`;
  const atHeaders = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type':  'application/json'
  };

  try {

    // ── GET ──────────────────────────────────────────────────
    if (event.httpMethod === 'GET') {
      const { table, filter } = event.queryStringParameters || {};

      if (!table) {
        return {
          statusCode: 400,
          headers: responseHeaders,
          body: JSON.stringify({ error: 'table parameter required' })
        };
      }

      const url = `${AT_BASE}/${encodeURIComponent(table)}`
        + (filter ? `?filterByFormula=${encodeURIComponent(filter)}` : '');

      console.log('GET →', url);
      const res  = await fetch(url, { headers: atHeaders });
      const data = await res.json();
      return {
        statusCode: 200,
        headers: responseHeaders,
        body: JSON.stringify(data.records || [])
      };
    }

    // ── POST / PATCH ──────────────────────────────────────────
    if (event.httpMethod === 'POST' || event.httpMethod === 'PATCH') {
      const body   = JSON.parse(event.body || '{}');
      const { table, fields, id } = body;

      console.log('Table:', table);
      console.log('Fields received:', Object.keys(fields || {}));

      if (!table || !fields) {
        return {
          statusCode: 400,
          headers: responseHeaders,
          body: JSON.stringify({ error: 'table and fields are required' })
        };
      }

      const url    = `${AT_BASE}/${encodeURIComponent(table)}${id ? '/' + id : ''}`;
      const method = id ? 'PATCH' : 'POST';

      console.log(`${method} →`, url);
      const res  = await fetch(url, {
        method,
        headers: atHeaders,
        body: JSON.stringify({ fields })
      });

      const data = await res.json();
      console.log('Airtable response status:', res.status);

      return {
        statusCode: res.status,
        headers: responseHeaders,
        body: JSON.stringify(data)
      };
    }

    // ── Method not allowed ────────────────────────────────────
    return {
      statusCode: 405,
      headers: responseHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (err) {
    console.error('Function error:', err.message);
    return {
      statusCode: 500,
      headers: responseHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
