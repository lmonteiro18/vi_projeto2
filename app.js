//----------------------------------------------APP SETUP----------------------------------------------
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

localStorage.setItem('user_savedTracks', JSON.stringify([]));
localStorage.setItem('user_playlists', JSON.stringify([]));

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
let genres = ['pop', 'rock', 'classical', 'funk', 'rb', 'indie', 'country', 'jazz'];

//-----------------------PÁGINA DE INSERÇÃO DE CREDENCIAIS-----------------------
app.route("/")
  .get(function(req, res) {
    res.render("index", {});
    //res.sendFile(__dirname + "/public/html/index.html");
  });

//-----------------------PEDIDO DE AUTORIZAÇÃO AO UTILIZADOR PARA RECOLHER OS SEUS DADOS-----------------------
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

//-----------------------ACESSO À API DO SPOTIFY E REQUESIÇÃO DOS DADOS NECESSÁRIOS PARA IMPLEMENTAR A VISUALIZAÇÃO-----------------------
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
            //console.log(data.body);
            let playlists = [];
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
        spotifyApi.getMySavedTracks({
            limit: 1,
            offset: 0
          })
          .then(function(data) {
            //console.log("Data: ", data);
            let total_tracks = data.body.total;
            return total_tracks;
          }, function(err) {
            console.log('Something went wrong!', err);
          }).then(function(total_tracks) {
            //console.log("Total: ", total_tracks);
            let tracks;
            async function saveTracks() {
              tracks = await getSavedTracks(total_tracks, limit);
              //console.log(JSON.parse(localStorage.user_savedTracks));
              res.redirect('/homeview');
              //console.log("Tracks: ", tracks);
              //return tracks;
            }
            saveTracks();
          });
      } else if (response.statusCode === 403) {
        res.redirect('/refresh_token');
      }
    });
  });

//----------------------------------------------REQUESITAR REFRESH TOKEN----------------------------------------------
app.get('/refresh_token', function(req, res) {
  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer(spotifyApi.getClientId() + ':' + spotifyApi.getClientSecret()).toString('base64'))
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
});

//-----------------------VISUALIZAÇÃO (PASSAGEM DOS DADOS PARA O FRONTEND)-----------------------
app.route("/homeview")
  .get(function(req, res) {
    res.render("homeview", {
      playlists: JSON.parse(localStorage.user_playlists),
      savedTracks: JSON.parse(localStorage.user_savedTracks)
    });
  });


//função para ir buscar e guardar as saved tracks do utilizador
async function getSavedTracks(total_tracks, limit) {
  let n_iterations = Math.ceil(total_tracks / limit);
  //console.log(n_iterations);
  for (let i = 0; i < n_iterations; i++) {
    await processSavedTracks(i, limit, total_tracks);
  }
  //console.log("Saved Tracks: ", user_savedTracks);
  localStorage.setItem('user_savedTracks', JSON.stringify(user_savedTracks));
  //console.log(localStorage.user_savedTracks);
  //console.log(JSON.parse(localStorage.user_savedTracks).length);
  user_savedTracks = [];
}

//função para alterar os dados das saved tracks obtidas e retornar apenas o que é preciso
async function processSavedTracks(i, limit, total_tracks) {
  let offset = i * limit;
  return await spotifyApi.getMySavedTracks({
      limit: limit,
      offset: offset
    })
    .then(function(data) {
      //console.log(i);
      //console.log(data);
      let savedTracks = [];
      (data.body.items).map((track, j) => {
        //console.log("Track:", track);
        if (user_savedTracks.length + savedTracks.length < total_tracks) {
          let filtered_track = {
            key: offset + j,
            id: track.track.id,
            name: (track.track.id === "4hQYCCSzI1YJYymBvvbDMn") ? "DEUBODE" : track.track.name,
            popularity: track.track.popularity,
            explicit: track.track.explicit,
            duration: track.track.duration_ms,
            artists: track.track.artists,
            saved_date: track.added_at
          }

          filtered_track.artists.map((artist, j) => {
            let rand = Math.floor(Math.random() * 8);
            filtered_track.artists[j] = {
              id: artist.id,
              name: artist.name,
              genre: genres[rand]
            };
          });

          //TODO: descomentar se um dia quisermos fazer isto com os géneros verdadeiros dos artistas
          /*let getArtists = async function() {
            let artists = [];
            await track.track.artists.map(artist => {
              artists.push({
                id: artist.id,
                name: artist.name
              });
            });
            //console.log("Artists:", artists);
            return artists;
          }
          let saveArtists = async function() {
            let artists = await getArtists();
            //console.log("Artists:", artists);
            filtered_track.artists = artists;
          }
          saveArtists();*/
          savedTracks.push(filtered_track);
        }
      });
      return savedTracks;
    }, function(err) {
      console.log('Something went wrong!', err);
    }).then(function(savedTracks) {
      //console.log("Saved Tracks:", savedTracks);
      savedTracks.map(track => user_savedTracks.push(track));
      //console.log("User length: " + user_savedTracks.length);
    });
}


//função para ir buscar e guardar as playlists do utilizador
async function getPlaylists(total_playlists, user_id, limit) {
  let n_iterations = Math.ceil(total_playlists / limit);
  for (let i = 0; i < n_iterations; i++) {
    let offset = i * limit;
    await spotifyApi.getUserPlaylists(user_id, {
        limit: limit,
        offset: offset
      })
      .then(async function(data) {
          let playlists = [];
          let playlist_list = data.body.items;

          for (let i = 0; i < playlist_list.length; i++) {
            //if (i < 1) { //TODO: tirar quando for para correr o programa a sério
            let get_playlist_info = async function() {
              return await getPlaylistInfo(playlist_list[i].id, limit);
            }
            let playlist_info = await get_playlist_info();
            //console.log("Playlist Info:", playlist_info);


            if (user_playlists.length + playlists.length < total_playlists) {
              let filtered_playlist = {
                key: i,
                id: playlist_list[i].id,
                name: playlist_list[i].name,
                description: playlist_list[i].description,
                public: playlist_list[i].public,
                collaborative: playlist_list[i].collaborative,
                followers: playlist_info.followers,
                tracks: playlist_info.tracks
              }
              await playlists.push(filtered_playlist);
            }
            //}
          }
          //console.log("Playlist Info:", playlists);
          return playlists;
        },
        function(err) {
          console.log('Something went wrong!', err);
        }).then(function(playlists) {
        //console.log("Playlists:", playlists);
        playlists.map(playlist => user_playlists.push(playlist));
        //console.log("Playlists length: " + user_playlists.length);
      });
  }
  //console.log(user_playlists);
  localStorage.setItem('user_playlists', JSON.stringify(user_playlists));
  //console.log(JSON.parse(localStorage.user_playlists));
  //console.log(JSON.parse(localStorage.user_playlists).length);
  user_playlists = [];
}

async function getPlaylistInfo(id, limit) {
  let playlist_info = {};
  await spotifyApi.getPlaylist(id).then(async function(playlist_data) {
    //console.log("Playlist Data:", playlist_data);
    playlist_info.followers = playlist_data.body.followers.total;
    playlist_info.tracks = playlist_data.body.tracks.items;
    //console.log("Playlist Tracks:", playlist_info.tracks);

    for (let i = 0; i < playlist_info.tracks.length; i++) {
      let arranged_track = await getPlaylistTrackInfo(i, playlist_info.tracks[i].track);
      playlist_info.tracks[i] = arranged_track;
    }

    //console.log("Info Playlist Tracks:", playlist_info);
  });
  return playlist_info;
}

async function getPlaylistTrackInfo(i, track) {
  //console.log("Track:", track);

  let filtered_track = {
    key: i,
    id: track.id,
    name: track.name,
    popularity: track.popularity,
    explicit: track.explicit,
    duration: track.duration_ms,
    artists: track.artists
  };

  filtered_track.artists.map((artist, j) => {
    let rand = Math.floor(Math.random() * 8);
    filtered_track.artists[j] = {
      id: artist.id,
      name: artist.name,
      genre: genres[rand]
    };
  });

  //TODO: descomentar se um dia quisermos fazer isto com os géneros verdadeiros dos artistas
  /*let getArtists = async function(artists) {
    let artist_ids = [];
    await artists.map(function(artist) {
      artist_ids.push(artist.id);
    });

    let artists_info = await getArtistsInfo(artist_ids);
    //console.log("Artist Info:", artists_info);


    //console.log("Artists:", artists);
    return artists_info;
  }
  let saveArtists = async function(artists) {
    let all_artists = await getArtists(artists);
    //console.log("Artists:", artists);
    filtered_track.artists = all_artists;
  }
  saveArtists(track.artists);*/

  return filtered_track;
}

async function getArtistsInfo(artist_ids) {
  async function fetch_artists() {
    let status = 0;
    let all_artists_info = [];
    //while (status !== 200) {
    async function get_artists_info(artist_ids) {
      let artists_info = await spotifyApi.getArtists(artist_ids)
        .then(async data => {
          if (data.statusCode === 200) {
            console.log("Success");
            let artists = data.body.artists;
            //console.log("Artists:", artists);
            let all_info = [];
            artists.map(artist => {
              let only_needed_artist_info = {
                id: artist.id,
                name: artist.name,
                popularity: artist.popularity,
                followers: artist.followers.total,
                genres: artist.genres
              };
              all_info.push(only_needed_artist_info);
            });

            console.log(all_info);
            return all_info;
          } else {
            console.log("Failure");
            status = data.statusCode;
            console.log("Status:", status);
          }
        });
    }
    tryFetchAgain(artist_ids);

    async function tryFetchAgain(artist_ids) {
      all_artists_info = await get_artists_info(artist_ids);
    }
    //}
    console.log("All Artists Info", all_artists_info);
    return all_artists_info;
  }
  let artists = await fetch_artists();
  //console.log("Fetch Artist:", artist);
  return artists;
}


//-----------------------DEFINIÇÃO DA PORTA DO SERVIDOR E START DO MESMO-----------------------
let port = process.env.PORT || 3000; //TODO: mudar para a porta correta do localhost (pode ser diferente de pessoa para pessoa, no meu caso é 3000)
app.listen(port, function(req, res) {
  console.log(`Server up and running on port ${port}.`);
});
