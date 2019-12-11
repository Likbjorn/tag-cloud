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
const r = 40;
const interactionRange = 80;
const gaussBlur = 5;

// mouse position storage
var mouse = {x: 0, y: 0}

var prev_node;

// create svg
const svg = d3.select("#svg_container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("text-anchor", "middle");

// add a blur filter
var blur_filter = svg.append("defs")
  .append("filter")
    .attr("id", "svg_blur")
  .append("feGaussianBlur")
    .attr("stdDeviation", gaussBlur);

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
      .attr("class", "tag_circles")
      .attr("id", d => d.title);
      // .attr("fill", defaultColor);

// and create a text label on it basing on title in data.nodes
nodes.append("text")
  .text(d => d.title)
  .style("pointer-events", "none");


// add force simulation
const simulation = d3.forceSimulation(data.nodes)
    .force("charge", d3.forceManyBody().strength(-1000))
    .force("radial", d3.forceRadial(height / 4, width / 2, height / 2))
    .force("link", d3.forceLink(data.links).id(d => d.title))
    .on("tick", ticked);

simulation.force("link").distance(100).strength(0);

simulation.force("radial").strength(.5)

svg.on("mousemove", handleSimOnMouseMove)

// add drag functionality
nodes.call(
  d3.drag()
      .on("start", dragStarted)
      .on("drag", dragged)
      .on("end", dragEnded)
  );

// handle user interaction
nodes.selectAll("circle")
  .on("click", handleBubbleOnMouseClick)


function ticked() {
  links.attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

  // translate node according to forces
  nodes.attr("transform", d => `translate(${d.x + 1}, ${d.y + 1})`);

  // find nearest node
  node = simulation.find(mouse.x, mouse.y, interactionRange);

  if (typeof(node) != "undefined") {
    // set node velocity towards cursor
    node.vx = (mouse.x - node.x)*0.05;
    node.vy = (mouse.y - node.y)*0.05;

    mouse_node_dist = Math.sqrt((mouse.x - node.x)**2 + (mouse.y - node.y)**2);
    blur_ratio = (interactionRange-mouse_node_dist)/(interactionRange-r)*gaussBlur;

    // blur it
    if (d3.select("#"+node.title) != d3.select(".hovered_circle")) {
      d3.select(".hovered_circle").classed("hovered_circle", false)
      //blur_ratio = gaussBlur;
      d3.select("#"+node.title).classed("hovered_circle", true);

      //remember last node
      prev_node = node;
    }
    blur_filter.attr("stdDeviation", blur_ratio <= gaussBlur ? blur_ratio : gaussBlur);
  } else if (typeof(prev_node) != "undefined") {
    d3.select("#"+prev_node.title).classed("hovered_circle", false);
  }
}


function handleBubbleOnMouseClick() {
  // TODO: do better styling here
  d3.select(this)
    .transition()
    .style("fill", "black")
    .transition()
    .style("fill", defaultColor)
}


function handleSimOnMouseMove() {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();

  mouse.x = d3.mouse(this)[0];
  mouse.y = d3.mouse(this)[1];
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
