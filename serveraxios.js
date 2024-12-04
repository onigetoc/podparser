const http = require('http');  // Nécessaire pour createServer
const axios = require('axios');
const Feed = require('./rss');

const PORT = process.env.PORT || 8888;

function getFeedUrl(request) {
  const urlParams = new URL(request.url, 'http://localhost').searchParams;
  return urlParams.get('url');
}

function writeError(err, response) {
  console.log('Writing error response:', err);
  response.writeHead(500, {
    "Content-Type": "text/plain;charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.write(JSON.stringify({ error: err.message || err }) + "\n");
  response.end();
}

function writeJsonResponse(rss, response) {
  console.log('Writing JSON response');
  response.writeHead(200, {
    "Content-Type": "application/json;charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });
  response.write(JSON.stringify(rss, null, 2));
  response.end();
}

async function followRedirects(feedUrl) {
  try {
    console.log('[DEBUG] Trying URL:', feedUrl);
    const response = await axios.get(feedUrl, {
      maxRedirects: 5,
      validateStatus: status => status < 400
    });
    console.log('[DEBUG] Final URL:', response.request.res.responseUrl);
    return response.request.res.responseUrl || feedUrl;
  } catch (error) {
    console.error('[DEBUG] Axios error:', error.message);
    throw error;
  }
}

function handleRequest(request, response) {
  // Ignorer les requêtes favicon.ico
  if (request.url === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return;
  }

  let feedUrl = getFeedUrl(request);
  if (!feedUrl) {
    writeError('No URL provided', response);
    return;
  }

  console.log('Processing feed URL:', feedUrl);
  
  if (!/^https?:\/\//i.test(feedUrl)) {
    feedUrl = 'https://' + feedUrl;
  }

  followRedirects(feedUrl)
    .then(finalUrl => {
      console.log('Final URL after redirects:', finalUrl);
      Feed.load(finalUrl, (err, rss) => {
        if (err) {
          writeError(err, response);
        } else {
          writeJsonResponse(rss, response);
        }
      });
    })
    .catch(err => {
      writeError(err, response);
    });
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log("Server started on port %s", PORT);
});