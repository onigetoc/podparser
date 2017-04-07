
// Invoke 'strict' JavaScript mode
'use strict';
 var  util = require('util'),
      xml2js = require('xml2js'),
      request = require('request');


function copyEntry(obj){
   var result = {};
   for (var x in obj) {
       result[x] = obj[x][0];
   }
   return result;
}


module.exports = {
    load: function(url, callback){
      var $ = this;
      request({
            url: url,
            headers: {
              //'User-Agent': 'RSS Reader',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:45.0) Gecko/20100101 Firefox/45.0',
              'accept': 'text/html,application/xhtml+xml'
              //'accept': '*/*'
            },
            pool: false,
            followRedirect: true

          }, function (error, response, xml) {
                if (!error && response.statusCode == 200) {
                  var parser = new xml2js.Parser({trim: false, normalize: true, mergeAttrs: true});
                  parser.addListener("error", function(err) {
                      callback(err, null);
                  });
                  parser.parseString(xml, function (err, result) {
                    if(err){
                      callback(err, null);
                      return;
                    }
                    else{
                      var rss = $.parser(result);
                      callback(null, rss);
                    }
                  });
                }
                else{
                  console.log("Error", error);
                  callback(new Error(
                      'Error loading feed' + 
                      ((response && response.statusCode)?  (' : ' + response.statusCode) : '')
                  ));
                  this.emit('error', new Error('Bad status code'));
                }
              });

    },
    parser: function(json){
        var list = json.rss.channel;
        var rss = {item:[]};
        if(util.isArray(json.rss.channel))
          list = json.rss.channel[0]; 

         if (list.title) {
            rss.title = list.title[0];
         }
         if (list.description) {
             rss.description = list.description[0];
         }
         if (list.link) {
             rss.url = list.link[0];
         }
         if (list.item) {
           if (!util.isArray(list.item)) {
             list.item = [list.item];
           }
           list.item.forEach(function(val){
             var obj = {};
             obj.service = 'podcast';
             obj.title = !util.isNullOrUndefined(val.title)?val.title[0]:'';
             obj.description = !util.isNullOrUndefined(val.description)?val.description[0]:'';
             // GC Add content:encoded
             if (val['content:encoded']) {
               obj.content = val['content:encoded'];
             }
             obj.url = obj.link = !util.isNullOrUndefined(val.link)?val.link[0]:'';
            
             if (val.category) {
               obj.group = val.category[0];
             }

             if (val.pubDate) {
               //obj.created = Date.parse(val.pubDate[0]);
               obj.pubDate = val.pubDate[0];
             }
              if (val['media:content']) {
               obj.media = val.media || {};
               obj.media.content = val['media:content'];
             }
             if (val['media:thumbnail']) {
                obj.media = val.media || {};
                obj.media.thumbnail = val['media:thumbnail'];
                //obj.thumb_square = val.media.thumbnail[0].url[0];
                obj.thumb_square = 'TEST_IMAGE';
             }
                obj.thumb_square = val.media.content['media:thumbnail'][0].url[0];
            
             if (val['itunes:duration']){
                 obj.duration = val['itunes:duration'][0];
             }
            // GC
             //if (val['media:thumbnail']) {
               //obj.media = val.media.thumbnail || {};
               //obj.thumb_square = val.media.thumbnail.url[0];
               //obj.thumb_square = 'TEST_IMAGE';
             //}
             if(!util.isArray(val.enclosure)){
                  obj.media_url = val.enclosure[0].url[0];
                  obj.type = val.enclosure[0].type[0];
                }
             else if(val.enclosure){
                if(val.enclosure.length == 1){
                  obj.media_url = val.enclosure[0].url[0];
                  obj.type = val.enclosure[0].type[0];
                }

              }

              rss.item.push(obj);

           });

         }
         return rss;

    },
    read: function(url, callback){
      return this.load(url, callback);
    }

};
