const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
var request = require('request');
var querystring = require('querystring');
const spotifyWebApi = require('spotify-web-api-node');


const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));


const auth_url = "https://accounts.spotify.com/authorize";
const token_url = "https://accounts.spotify.com/api/token";
const redirect_url = "http://localhost:3000/access";

let spotifyApi;

let user_playlists;

app.route("/")
  .get(function(req, res) {
    res.sendFile(__dirname + "/public/html/index.html");
  });

app.route("/auth")
  .post(function(req, res) {
    spotifyApi = new spotifyWebApi({
      clientId: req.body.client_id,
      clientSecret: req.body.client_secret,
      redirectUri: redirect_url
    });

    let scopes = [
      'playlist-read-private',
      'user-library-read',
      'user-follow-read',
      'user-top-read',
      'playlist-read-collaborative',
      'user-read-private'
    ];

    let authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    //console.log("Authorize Url: " + authorizeURL);
    res.redirect(authorizeURL);

    /*res.redirect(auth_url + querystring.stringify({
      response_type: 'code',
      client_id: spotifyApi.getClientId(),
      scope: scopes,
      redirect_uri: spotifyApi.getRedirectURI()
    }));*/
  });

app.route("/access")
  .get(function(req, res) {
    let code = req.query.code;
    //console.log("Code: " + code);

    let authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_url,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(spotifyApi.getClientId() + ':' + spotifyApi.getClientSecret()).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: {
            'Authorization': 'Bearer ' + access_token
          },
          json: true
        };

        let my_id;

        spotifyApi.getMe()
          .then(function(data) {
            //console.log(data.body);
            my_id = data.body.id;
            //console.log("My ID: " + my_id);
          }, function(err) {
            //console.log("Something went wrong!", err);
          });

        spotifyApi.getUserPlaylists(my_id)
          .then(function(data) {
            //console.log('Retrieved playlists', data.body);
            user_playlists = data.body.items;
            //console.log("Playlists: " + user_playlists);
            res.redirect('/homeview');
          }, function(err) {
            //console.log('Something went wrong!', err);
          });


      }
    });
  });

/*app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});*/

app.route("/homeview")
  .get(function(req, res) {
    user_playlists.map((playlist) => console.log(playlist.name));
    res.sendFile(__dirname + "/public/html/homeview.html");
  });


let port = process.env.PORT || 3000;
app.listen(port, function(req, res) {
  console.log(`Server up and running on port ${port}.`);
});
