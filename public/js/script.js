let user_playlists = [];

let variable1 = document.getElementById("variable1").innerHTML;
let variable2 = document.getElementById("variable2").innerHTML;
console.log(variable1);
console.log(variable2);
let playlists = variable1;
let savedTracks = variable2;
console.log(JSON.parse(playlists));
console.log(JSON.parse(savedTracks));
/*try {
  console.log(JSON.parse(savedTracks));
} catch (err) {
  console.log(err);
} finally{
  console.log("Handled");
}*/

let treatedData;
let analisedDataTable;

//---------------------------------FUNÇÃO PARA TRATAMENTO DE DADOS---------------------------------
/*async function treatData() {
  return data = await d3.csv(dataFile, d3.autoType).then(tabela => {
    return tabela;
  });
}*/

//---------------------------------FUNÇÃO PARA ANÁLISE DE DADOS---------------------------------
/*function dataAnalysis(data) {
  let property_values;

  return property_values;
}*/

//---------------------------------FUNÇÃO PARA GUARDAR DADOS---------------------------------
/*async function saveData() {
  treatedData = await treatData();
  analisedDataTable = await dataAnalysis(treatedData);
}*/

//---------------------------------FUNÇÃO PARA USAR DADOS GUARDADOS---------------------------------
async function useData() {
  //await saveData();

  //console.log(analisedDataTable);

  /*let svg1 = d3.select("#Graph1").append("svg")
    .attr("width", "100%")
    .style("min-height", "100%")
    .style("background-color", "black");
  let svg2 = d3.select("#Graph2").append("svg")
    .attr("width", "100%")
    .style("min-height", "100%")
    .style("background-color", "black");

  let g1 = svg1.append("g");

  g1.append("");*/
}

useData();
