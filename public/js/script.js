let user_playlists = [];

async function savePlaylists(playlists){
  let parsed_playlists = JSON.parse(playlists);
  for (let i = 0; i < parsed_playlists.length; i++) {
    await user_playlists.push(parsed_playlists[0][i]);
    //console.log(user_playlists.playlists[i][0]);
  }
}
