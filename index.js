// data; not in json file for dev purposes
const data = {
  "nodes": [
    {index: 0, title: "Physics"},
    {index: 1, title: "Biology"},
    {index: 2, title: "Math"},
    {index: 3, title: "Medicine"},
    {index: 4, title: "Economy"},
    {index: 5, title: "Statistics"}
  ],
  "links": [
    {source: 0, target: 2},
    {source: 0, target: 1},
    {source: 1, target: 3},
    {source: 2, target: 4},
    {source: 2, target: 5},
    {source: 0, target: 5},
    {source: 4, target: 5},
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


var links = svg.append("g")
  .attr("class", "links")
  .attr("stroke", "grey")
  .attr("stroke-width", "2px")
  .selectAll("line")
  .data(data.links)
  .enter().append("line")
  .join(
    enter => enter.append("line"),
    update => update,
    exit => exit.remove()
  );


// Create svg groups for each node and bind it with data
// later we can add pretty objects to represent our nodes
var nodes = svg.selectAll(".node")
      .data( data.nodes )
    .join(
        enter => enter.append("g"),
        update => update,
        exit => exit.remove()
      )
      .attr("title", d => d.title)
      .attr("alpha". 0.5);

// append basic circle to each node
nodes.append("circle")
      .attr("r", r)
      .attr("fill", "green");

// and create a text label on it basing on title in data.nodes
nodes.append("text")
  .text(d => d.title);

// add force simulation
const simulation = d3.forceSimulation(data.nodes)
    .force("charge", d3.forceManyBody().strength(-100))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("link", d3.forceLink(data.links).distance(100));

simulation.on("tick", ticked);

function ticked() {
  links.attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  nodes.attr("transform", d => `translate(${d.x + 1}, ${d.y + 1})`);
}
