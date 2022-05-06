let user_playlists = [];

let variable = document.getElementById("variablesEJS").innerHTML.split("|");
console.log(variable);
let playlists = JSON.parse(variable[0]);
let savedTracks = JSON.parse(variable[1]);
console.log(playlists);
console.log(savedTracks);

/*async function savePlaylists(playlists){
  let parsed_playlists = JSON.parse(playlists);
  for (let i = 0; i < parsed_playlists.length; i++) {
    await user_playlists.push(parsed_playlists[0][i]);
    //console.log(user_playlists.playlists[i][0]);
  }
}*/

/*<script>
  let user_playlists = [];

  async function savePlaylists(playlists) {
    //let parsed_playlists = [...<%- JSON.parse(playlists)[0] %>] ;
    for (let i = 0; i < parsed_playlists.length; i++) {
      await user_playlists.push(parsed_playlists[0][i]);
      //console.log(user_playlists.playlists[i][0]);
    }
  }

  savePlaylists(<%- JSON.parse(playlists) %>);
  console.log(user_playlists);
</script>*/

/*<script>
  //console.log(`${<%- JSON.stringify(playlists[0][0].name) %>}`);
  savePlaylists( < % -JSON.stringify(playlists[0]) % > );
</script>*/
