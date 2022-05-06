const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
require('dotenv').config();
var request = require('request');
var querystring = require('querystring');
const spotifyWebApi = require('spotify-web-api-node');

//local storage
if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./scratch', Number.MAX_VALUE);
}

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));


const auth_url = "https://accounts.spotify.com/authorize";
const token_url = "https://accounts.spotify.com/api/token";
const redirect_url = "http://localhost:3000/access"; //TODO: mudar redirect_url quando pusermos o site online

let spotifyApi;

let user_playlists = [];
let user_savedTracks = [];

app.route("/")
  .get(function(req, res) {
    res.render("index", {});
    //res.sendFile(__dirname + "/public/html/index.html");
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

        //ir buscar informações do utilizador (aqui é apenas para ir buscar o id dele para uso futuro)
        spotifyApi.getMe()
          .then(function(data) {
            my_id = data.body.id;
          }, function(err) {
            console.log("Something went wrong!", err);
          });

        let limit = 50; //maximo aceite (o spotify tem um sistema de paginação em que só se consegue ir buscar 50 items de cada vez)

        //ir buscar playlists do utilizador
        spotifyApi.getUserPlaylists(my_id)
          .then(function(data) {
            let total_playlists = data.body.total;
            return total_playlists;
            console.log(data.body);
            let playlists = [];
            (data.body.items).map(playlist => {

            });
          }, function(err) {
            console.log('Something went wrong!', err);
          }).then(function(total_playlists) {
            let playlists;
            let savePlaylists = async function() {
              playlists = await getPlaylists(total_playlists, my_id, limit);
            }
            savePlaylists();
          });

        //ir buscar saved tracks do utilizador
        //até ao segundo then (exclusive) é só para ir buscar o número total de tracks
        //para depois poder utilizar na função lá de baixo
        spotifyApi.getMySavedTracks({
            limit: 1,
            offset: 0
          })
          .then(function(data) {
            let total_tracks = data.body.total;
            return total_tracks;
          }, function(err) {
            console.log('Something went wrong!', err);
          }).then(function(total_tracks) {
            let tracks;
            let saveTracks = async function() {
              tracks = await getSavedTracks(total_tracks, limit);
            }
            saveTracks();
          }).then(function() {
            res.redirect('/homeview');
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
    //console.log("Playlists: " + JSON.parse(localStorage.user_playlists)[0][0].name);
    //console.log("Tracks: " + JSON.parse(localStorage.user_savedTracks).length);

    res.render("homeview", {
      playlists: JSON.parse(localStorage.user_playlists)[0],
      savedTracks: JSON.parse(localStorage.user_savedTracks)
    });
    //res.sendFile(__dirname + "/public/html/homeview.html");
  });

//função para ir buscar e guardar as saved tracks do utilizador
async function getSavedTracks(total_tracks, limit) {
  let n_iterations = Math.ceil(total_tracks / limit);
  //console.log(n_iterations);
  for (let i = 0; i < n_iterations; i++) {
    await spotifyApi.getMySavedTracks({
        limit: limit,
        offset: i
      })
      .then(function(data) {
        //console.log(i);
        //console.log(data);
        let savedTracks = [];
        (data.body.items).map((track, j) => {
          if (user_savedTracks.length + savedTracks.length < total_tracks) {
            let filtered_track = {
              key: i * 50 + j,
              id: track.track.id,
              name: track.track.name,
              popularity: track.track.popularity,
              explicit: track.track.explicit,
              duration: track.track.duration_ms,
              artists: [],
              saved_date: track.added_at
            }
            let getArtists = async function() {
              let artists = [];
              await track.track.artists.map(artist => artists.push({
                id: artist.id,
                name: artist.name
              }));
              return artists;
            }
            let saveArtists = async function() {
              let artists = await getArtists();
              filtered_track.artists = artists;
            }
            saveArtists();
            savedTracks.push(filtered_track);
          }
        });
        return savedTracks;
      }, function(err) {
        console.log('Something went wrong!', err);
      }).then(function(savedTracks) {
        savedTracks.map(track => user_savedTracks.push(savedTracks));
        //console.log("User length: " + user_savedTracks.length);
      });
  }
  localStorage.setItem('user_savedTracks', JSON.stringify(user_savedTracks));
  //console.log(JSON.parse(localStorage.user_savedTracks)[0][0].artists);
  //console.log(JSON.parse(localStorage.user_savedTracks).length);
  user_savedTracks = [];
}


//função para ir buscar e guardar as playlists do utilizador
async function getPlaylists(total_playlists, user_id, limit) {
  let n_iterations = Math.ceil(total_playlists / limit);
  for (let i = 0; i < n_iterations; i++) {
    await spotifyApi.getUserPlaylists(user_id, {
        limit: limit,
        offset: i
      })
      .then(function(data) {
        let playlists = [];
        (data.body.items).map((playlist, j) => {
          if (user_playlists.length + playlists.length < total_playlists) {
            let filtered_playlist = {
              key: i * 50 + j,
              id: playlist.id,
              name: playlist.name,
              description: playlist.description,
              public: playlist.public,
              collaborative: playlist.collaborative
            }
            playlists.push(filtered_playlist);
          }
        });
        return playlists;
      }, function(err) {
        console.log('Something went wrong!', err);
      }).then(function(playlists) {
        playlists.map(track => user_playlists.push(playlists));
        //console.log("Playlists length: " + user_playlists.length);
      });
  }
  localStorage.setItem('user_playlists', JSON.stringify(user_playlists));
  //console.log(JSON.parse(localStorage.user_playlists));
  //console.log(JSON.parse(localStorage.user_playlists).length);
  user_playlists = [];
}



let port = process.env.PORT || 3000; //TODO: mudar para a porta correta do localhost (pode ser diferente de pessoa para pessoa, no meu caso é 3000)
app.listen(port, function(req, res) {
  console.log(`Server up and running on port ${port}.`);
});
