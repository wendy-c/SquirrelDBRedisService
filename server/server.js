/*
Cacheing most recent links, including title, img url and excerpt for render landing page
*/

var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var CORS = require('cors');
var redis = require('redis');
var axios = require('axios');


var app = express();
var client = redis.createClient(6379, '127.0.0.1');

app.use(CORS());

client.on('error', function(err) {
  console.log('Error' + err);
});

//////////testing//////////
// client.set("string key", "wendy", redis.print);

// client.get("username", function(error, value) {
//   if (error) {
//     console.log(error);
//   }
//   console.log('This is the value:', value);
// });
//////////

var mostRecentLinks = [];
//get most recent articles (url) from DB 
//set up worker to update every 20min
var getRecentFromDB = function() {

  axios.get('http://localhost:8888/redis')
  .then((res) => {
    
    //store in mostRecentLinks, should return 20 links
    //YAY getting stuff back
    mostRecentLinks = res.data;
    //make api call to readibilty, cache info ro redis 
    // console.log('what is links', mostRecentLinks );
    mostRecentLinks.forEach((entry, index) => {
      // console.log('in forEach this entry:', entry);
      axios.get('https://readability.com/api/content/v1/parser?url=' + entry.url + '/&token=ea069fd819bb249c3f5a3b38bbd39b3622ab1ea9')
        .then((res) => {
          var url = res.data.url;
          var author = res.data.author;
          var excerpt = res.data.excerpt;
          var image = res.data.lead_image_url;
          var title = res.data.title;
          console.log('getting readability', url, image);

          client.hmset('links:' + index, 
            [
              'url', url,
              'author', author,
              'excerpt', excerpt,
              'image', image,
              'title', title
            ], redis.print);
        })
        .catch((err) => {
          console.log('There is an error in redis cache talking to readibility, it\'s a sad day! D=');
        });
    });
  })
  .catch((err) => {
    console.log('There is an error in redis cache, it\'s a sad day! D=');
  });

};

// setInterval(getRecentFromDB, 10000);

// getRecentFromDB();


//client make request to :3333, send back most recent articles info
app.get('/getMostRecent', function(req, res) {
  
  var promiseQueue = [];
    // var redisPromise = new Promise(function(resolve, reject) {
  for (var i = 0; i < 50; ++i) {

    var linkPromise = new Promise((resolve, reject) => {
      client.hgetall('links:' + i, function(error, value) {
        if (error) {
          console.log('There is an error fetching for cached stuff, it\'s a sad day! D=', error);
        }
        // console.log('getting cached stuff back!', value);
        resolve(value);
      });   
    }); 
    promiseQueue.push(linkPromise);
  }
  Promise.all(promiseQueue).then((data) => {
    res.send(data);
  });
});


////////// storing temp facebook user info //////////
app.post('/fbcallback', function(req, res) {
  
  var fbid = req.body.fbid;
  var fbname = req.body.fbname;
  var avatar = req.body.avatar;

  client.hmset('user:0', [
    'fbid', fbid,
    'fbname', fbname,
    'avatar', avatar
  ], redis.print);

});

app.get('/fbcallback', function(req, res) {
  client.hgetall('user:0', function(error, value) {
    if (error) {
      console.log('There is an error fetching for cached facebook user, it\'s a sad day! D=', error);
    }
    res.send(value);
  });
});

app.post('/storeState', function(req, res) {
  
  var username = req.body.username;
  var password = req.body.password;
  var confirmPassword = req.body.confirmPassword;
  var message = req.body.message;
  var fbView = req.body.fbView;
  var confirmView = req.body.confirmView;
  var fbid = req.body.fbid;
  var displayName = req.body.displayName;
  var avatar = req.body.avatar;

  client.hmset('state:0', [
    'username', username,
    'password', password,
    'confirmPassword', confirmPassword,
    'message', message,
    'fbView', fbView,
    'confirmView', confirmView,
    'fbid', fbid,
    'displayName', displayName,
    'avatar', avatar
  ], redis.print);

  res.send('stored!');
});

app.get('/storeState', function(req, res) {
  client.hgetall('state:0', function(error, value) {
    if (error) {
      console.log(error);
      res.send('invalid');
    } else {
      res.send(value);
    }
  });
});

////////////////////////////////////////////////////




app.listen('3333', function() {
  console.log('listening on 3333!');
});
