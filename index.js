// data; not in json file for dev purposes
data = {
  "nodes": [
    {"id": 1, "title": "Physics"},
    {"id": 2, "title": "Biology"},
    {"id": 3, "title": "Math"},
    {"id": 4, "title": "Medicine"},
    {"id": 5, "title": "Economy"}
  ],
  "links": [
    {"source": 1, "target": 3},
    {"source": 1, "target": 2},
    {"source": 2, "target": 4},
    {"source": 3, "target": 5}
  ]
}

// constants
const width = 600, height = 400;
const r = 30;

// create svg
const svg = d3.select("#svg_container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("text-anchor", "middle");

// prepare data
initData(data);

// Create svg groups for each node and bind it with data
// later we can add pretty objects to represent our nodes
const nodes = svg.selectAll('.node')
      .data( data.nodes )
    .enter().append('g')
      .attr('title', d => d.title)
      .attr("transform", d => `translate(${d.x + 1},${d.y + 1})`);

// append basic circle to each node
nodes.append('circle')
      .attr('r', r)
      .attr('fill', "green");

// and create a text label on it basing on title in data.nodes
nodes.append('text')
  .text(d => d.title)

var simulation = d3.forceSimulation(data.nodes)
    .force('charge', d3.forceManyBody().strength(-20))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .on('tick', ticked);

function initData(data) {
  // Set random start position
  data.nodes.forEach(function(nodes) {
    nodes.x = randomIntFromInterval(r, width - r);
    nodes.y = randomIntFromInterval(r, height - r);
  })
}


function randomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}


function ticked() {
  // create <g>roup for each node

  nodes.data(data.nodes)
    .attr("transform", d => `translate(${d.x + 1}, ${d.y + 1})`)
}
