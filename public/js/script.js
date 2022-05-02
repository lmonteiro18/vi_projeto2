let client_id = "855793d2a9054fff95e9868a4ada03ce";
let client_secret = "c1171bfdcd834c5599976d2b8a06403c";

const auth_url = "https://accounts.spotify.com/authorize";
const token_url = "https://accounts.spotify.com/api/token";
const redirect_url = "http://localhost:3000/";

let id;
let secret;


window.onLoad = onPageLoad();

function onPageLoad(){
  if(window.location.search.length>0){
    let code = getCode();
    getAccess();
  }
}

function reqAuth() {
  id = document.getElementById("ClientID").value;
  secret = document.getElementById("ClientSecret").value;

  let url = auth_url;
  //url += `?client_id=${process.env.CLIENT_ID}`;
  url += `?client_id=${id}`;
  url += `&response_type=code`;
  url += `&redirect_uri=${redirect_url}`;
  url += `&show_dialog=true`;
  url += `&scope=playlist-read-private user-library-read user-follow-read user-top-read playlist-read-collaborative user-read-private`;

  location.assign(url);
}

function getCode(){
  let searchString = window.location.search;
  console.log(window.location.search);
}

function preventSubmit(e){
  e.preventDefault();
}
