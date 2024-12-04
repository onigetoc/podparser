let http = require('http');
let https = require('https'); // Ajout de cet import manquant
let url = require('url');
let Feed = require('./rss');

const PORT = process.env.PORT || 8888; // Changer le port ici

function getFeedUrl(request) {
  return url.parse(request.url, true).query.url;
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

async function followRedirects(feedUrl, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const client = feedUrl.startsWith('https') ? https : http;
    console.log(`[DEBUG] Trying URL: ${feedUrl}`);

    client.get(feedUrl, (response) => {
      console.log(`[DEBUG] Status: ${response.statusCode}`);
      console.log(`[DEBUG] Headers:`, response.headers);
      
      if (response.statusCode >= 300 && response.statusCode < 400) {
        const location = response.headers.location;
        console.log(`[DEBUG] Found redirect to: ${location}`);
        if (maxRedirects === 0) {
          reject(new Error('Too many redirects'));
          return;
        }
        if (!location) {
          reject(new Error('Redirect without location header'));
          return;
        }
        const redirectUrl = new URL(location, feedUrl).href;
        followRedirects(redirectUrl, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      } else {
        resolve(feedUrl);
      }
    }).on('error', reject);
  });
}

function handleRequest(request, response) {
  console.log('Received request:', request.url);
  
  // Ignorer les requêtes favicon.ico
  if (request.url === '/favicon.ico') {
    response.writeHead(204); // No Content
    response.end();
    return;
  }

  // Gestion des requêtes OPTIONS pour CORS
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
      Feed.load(finalUrl, function(err, rss) {
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

let server = http.createServer(handleRequest); // Utiliser HTTP au lieu de HTTPS

server.listen(PORT, function() {
  console.log("Server started on %s", PORT);
});

