'use strict';

const limit = 20;

const xml2js = require('xml2js'),
      http = require('http'),
      https = require('https');

function fetchUrl(url, callback) {
  const client = url.startsWith('https') ? https : http;
  
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; RSSFeedParser/1.0)',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
  };

  client.get(url, options, (response) => {
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      if (response.statusCode !== 200) {
        return callback(new Error(`HTTP ${response.statusCode}`), null, null);
      }
      callback(null, response, data);
    });
  }).on('error', (err) => {
    callback(err, null, null);
  });
}

// Modification 1: dans la fonction cleanXML
function cleanXML(xml) {
  let cleanedXml = xml;
  cleanedXml = cleanedXml.replace(/<(\/?)(dc|itunes):([^>]+)>/g, '<$1$3>');
  return cleanedXml;
}

function extractImageFromDescription(description) {
  const imgMatch = description?.match(/<img.+src=['"](.*?)['"]/i);
  if (imgMatch && imgMatch[1]) {
    const imgSrc = imgMatch[1];
    // Ignore Feedburner images and gifs comme dans votre code PHP
    if (!imgSrc.match(/(feedburner\.com|\.gif)/i)) {
      return imgSrc;
    }
  }
  return null;
}

module.exports = {
  load: function(url, callback) {
    const $ = this;
    console.log('Fetching URL:', url);
    fetchUrl(url, function(error, response, xml) {
      if (!error && response.statusCode == 200) {
        // Nettoyer le XML avant le parsing
        const cleanedXml = cleanXML(xml);
        
        const parser = new xml2js.Parser({ 
          trim: true, 
          normalize: true, 
          mergeAttrs: true,
          explicitArray: true 
        });
        
        parser.parseString(cleanedXml, function(err, result) {
          if (err) {
            console.log('Error parsing XML:', err);
            callback(err, null);
            return;
          } else {
            console.log('Successfully parsed XML');
            var rss;
            try {
              rss = $.parser(result);
            } catch (parseError) {
              console.log('Error parsing RSS:', parseError);
              callback(parseError, null);
              return;
            }
            callback(null, rss);
          }
        });
      } else {
        console.log("Error fetching URL:", error);
        callback(new Error(
          'Error loading feed' +
          ((response && response.statusCode) ? (' : ' + response.statusCode) : '')
        ));
      }
    });
  },

  parser: function(json) {
    if (json.feed) {
      return this.parseAtom(json);
    }
    
    const list = json.rss?.channel ? 
      (Array.isArray(json.rss.channel) ? json.rss.channel[0] : json.rss.channel) 
      : null;
    
    if (!list) {
      throw new Error('Invalid RSS format');
    }

    const feed = {};
    const response = { status: 'ok', feed: feed, items: [] };

    // Gestion enrichie des images principales
    const mainimage = list.image?.[0]?.href?.[0] || 
                     list.image?.[0]?.url?.[0] || 
                     list['media:thumbnail']?.[0]?.url?.[0];

    if (mainimage) {
      feed.image = mainimage;
    }

    // Informations de base du channel
    feed.title = list.title?.[0] || '';
    feed.description = list.description?.[0] || '';
    feed.link = list.link?.[0] || '';
    feed.url = feed.link; // Garder url comme alias de link
    feed.author = list.author?.[0] || '';
    feed.playlistURL = list.link?.[0] || '';
    feed.language = list.language?.[0] || '';
    feed.lastBuildDate = list.lastBuildDate?.[0] || '';

    const parsedItems = [];
    if (list.item) {
      if (!Array.isArray(list.item)) {
        list.item = [list.item];
      }

      list.item.slice(0, limit).forEach(function(val, index) {
        const obj = {
          service: 'podcast',
          title: val.title?.[0] || '',
          description: val.description?.[0] || '',
          group: val.category?.[0] || '',
          author: val.creator?.[0] || val.author?.[0] || list.author?.[0] || '', // Notez l'ordre : creator en premier
          pubDate: val.pubDate?.[0] || ''
        };

        // URLs
        obj.url = val.link?.[0] || '';
        obj.playlistURL = list.link?.[0] || '';

        // Gestion enrichie des médias
        if (val.enclosure) {
          let enclosure = Array.isArray(val.enclosure) ? val.enclosure[0] : val.enclosure;
          obj.media_url = enclosure?.url?.[0] || '';
          obj.type = enclosure?.type?.[0] || '';
        } else if (val['media:content']) {
          obj.media_url = val['media:content']?.[0]?.url?.[0] || '';
          obj.type = val['media:content']?.[0]?.type?.[0] || '';
        }

        // Gestion enrichie des images (comme dans votre PHP)
        obj.thumbnail = 
          val.image?.[0]?.href?.[0] ||                          // Direct image
          val['media:thumbnail']?.[0]?.url?.[0] ||             // Media thumbnail
          val['media:content']?.[0]?.['media:thumbnail']?.[0]?.url?.[0] || // Nested media thumbnail
          extractImageFromDescription(obj.description) ||       // Image from description
          mainimage;                                           // Fallback to channel image

        // Content
        if (val['content:encoded']) {
          obj.content = val['content:encoded']?.[0];
        }

        parsedItems.push(obj);
      });
    }

    response.items = parsedItems;
    return response;

  },

  parseAtom: function(json) {
    const feed = json.feed;
    const response = { status: 'ok', feed: {}, items: [] };

    if (feed.title) {
      response.feed.title = feed.title[0];
    }
    if (feed.subtitle) {
      response.feed.description = feed.subtitle[0];
    }
    if (feed.link) {
      response.feed.link = feed.link[0].href || feed.link[0];
      response.feed.url = response.feed.link;
    }

    if (feed.entry) {
      feed.entry.slice(0, limit).forEach(function(val) {
        var obj = {};
        obj.service = 'atom';
        obj.title = val.title?.[0] || '';
        obj.description = val.content?.[0] || val.summary?.[0] || '';
        obj.url = val.link?.[0]?.href || val.link?.[0] || '';
        obj.link = obj.url;
        
        if (val.category) {
          obj.group = val.category[0]?.term || val.category[0];
        }

        if (val.published || val.updated) {
          obj.pubDate = val.published?.[0] || val.updated?.[0];
        }

        if (val.author) {
          obj.author = val.author[0]?.name?.[0] || val.author[0];
        }

        console.log('Parsed Atom entry:', obj);
        response.items.push(obj);
      });
    }

    return response;
  },

  read: function(url, callback) {
    return this.load(url, callback);
  }
};
