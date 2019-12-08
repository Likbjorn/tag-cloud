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
    {source: "Physics", target: "Math"},
    {source: "Physics", target: "Biology"},
    {source: "Biology", target: "Medicine"},
    {source: "Math", target: "Economy"},
    {source: "Math", target: "Statistics"},
    {source: "Physics", target: "Statistics"},
    {source: "Economy", target: "Statistics"},
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

// create links and group for them
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
      .attr("title", d => d.title);

// append basic circle to each node
nodes.append("circle")
      .attr("r", r)
      .attr("fill", "green");

// and create a text label on it basing on title in data.nodes
nodes.append("text")
  .text(d => d.title);

// add force simulation
const simulation = d3.forceSimulation(data.nodes)
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceRadial(height / 4, width / 2, height / 2))
    .force("link", d3.forceLink(data.links).id(d => d.title));

simulation.on("tick", ticked);
simulation.force("link").distance(150);

nodes.call(
  d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded)
  );

// handle user interaction
nodes.selectAll("circle")
  .on("mouseover", handleBubbleOnMouseOver)
  .on("mouseout", handleBubbleOnMouseOut)


function ticked() {
  links.attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  nodes.attr("transform", d => `translate(${d.x + 1}, ${d.y + 1})`);
}


function handleBubbleOnMouseOver() {
  // TODO: do better styling here
  d3.select(this)
    .attr("fill", "darkgreen");
}


function handleBubbleOnMouseOut () {
  // TODO: do better styling here
  d3.select(this)
    .attr("fill", "green");
}


function dragStarted (d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}


function dragged(d) {
  d.fx = d3.event.x;
    d.fy = d3.event.y;
}

function dragEnded(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}
