const NUMBER_OF_TAGS = 8; // default number of middle nodes

let r = 50, // px
    linkLength = 0.35, // relative to viewport height
    interactionRange = 80, // px
    attractionRate = 0.05, // how fast nodes are attracted to cursor
    charge = -0.1,
    exitDuration = 1000,
    enterDuration = 100,
    gaussBlur = 1.5,
    mouse = {x: 0, y: 0},
    width,
    height,
    svg, svgContainer,
    layers,
    prev_node,
    blur_filter,
    blur_ratio;

// get svgContainer <div> and init svg size
svgContainer = document.getElementById("svg_container");
width = svgContainer.clientWidth;
height = svgContainer.clientHeight;

// data; not in json file for dev purposes
let data = {};
data.foreground = {
    nodes: [
        {title: "Physics", r: 10},
        {title: "Biology", r: 8},
        {title: "Math", r: 12},
        {title: "Medicine", r: 9},
        {title: "Economy", r: 9},
        {title: "Statistics", r: 11},
        {title: "Chemistry", r: 10},
        {title: "History", r: 8},
        {title: "Literature", r: 11},
        {title: "Sombrero", r: 14},
        {title: "Space travels", r: 6},
        {title: "Lights deflect", r: 15},
        {title: "Deebs", r: 12},
    ],
    links: [
        {source: "Physics", target: "Math"},
        {source: "Physics", target: "Biology"},
        {source: "Biology", target: "Medicine"},
        {source: "Math", target: "Economy"},
        {source: "Math", target: "Statistics"},
        {source: "Physics", target: "Statistics"},
        {source: "Economy", target: "Statistics"},
        {source: "Chemistry", target: "Medicine"},
        {source: "Chemistry", target: "Physics"},
        {source: "History", target: "Literature"},
        {source: "History", target: "Economy"},
        {source: "Space travels", target: "Physics"},
        {source: "Sombrero", target: "Lights deflect"},
        {source: "Lights deflect", target: "Deebs"},
        {source: "Sombrero", target: "Deebs"}

    ]
};
data.background = createDummyData(NUMBER_OF_TAGS);
data.middle = createDummyData(NUMBER_OF_TAGS);

// placeholder for next layer tags
let subLayerTags = [
    "Astronomy",
    "Biophysics",
    "Mechanics",
    "Electricity",
    "Hydrodynamics",
    "Optics",
    "Magnetism",
    "Geophysics",
    "Sombrero",
    "Space travels",
    "Lights deflect",
    "Deebs",
];

data.foreground.nodes.forEach( i => i.id = i.title.replace(/ /g, ""));

initData(data.foreground);

// create svg - probably can be done in index.html
svg = d3.select("#svg_container")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "none")
    .attr("text-anchor", "middle")
    .classed("svg-content", true);

// add listener for resize

window.addEventListener("resize", onResize);

// create layers
layers = [];
layers.background = createLayer("background-layer", data.background);
layers.middle = createLayer("middle-layer", data.middle);
layers.foreground = createLayer("foreground-layer", data.foreground);

// init data and forces on layers
initForegroundLayer();
initMidLayer();

svg.on("mousemove", onMouseMove);

// add a blur filter
blur_filter = svg.append("defs")
    .append("filter")
    .attr("id", "svg_blur")
    .append("feGaussianBlur")
    .attr("stdDeviation", gaussBlur);

// simulation tick functions

function ticked() {
    // foreground layer

    // move each node according to forces
    layers.foreground.nodes.attr("transform", moveNode);

    // update links
    layers.foreground.links
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    // find nearest node
    let node = layers.foreground.simulation.find(mouse.x, mouse.y, interactionRange);

    if (node) {
        // set node velocity towards cursor
        node.vx = (mouse.x - node.x)*attractionRate;
        node.vy = (mouse.y - node.y)*attractionRate;

        mouse_node_dist = Math.sqrt((mouse.x - node.x)**2 + (mouse.y - node.y)**2);
        blur_ratio = (interactionRange-mouse_node_dist)/(interactionRange-r)*gaussBlur;

        // blur it
        if (d3.select("g.foreground-layer#"+node.id) != d3.select("g.foreground-layer > g > .hovered_circle")) {
            d3.select("g.foreground-layer > g > .hovered_circle").classed("hovered_circle", false);
            //blur_ratio = gaussBlur;
            d3.select("#"+node.id).classed("hovered_circle", true);
            prev_node = node;
        }
        blur_filter.attr("stdDeviation", blur_ratio <= gaussBlur ? blur_ratio : gaussBlur);
    } else if (prev_node) {
        d3.select("#"+prev_node.id).classed("hovered_circle", false);
    }
}


function tickedMid() {
    layers.middle.nodes.attr("transform", moveNode);

    // update links
    layers.middle.links
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

}

// event handlers

function onNodeClick() {
    // do pretty transition
    layers.foreground.group
        .selectAll("text") // text does not inherit opacity for some reason
        .transition()
        .duration(exitDuration)
        .attr("opacity", 0);
    layers.foreground.group
        .transition()
        .duration(exitDuration)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .remove();

    // promote middle layer
    layers.foreground.group = layers.middle.group.classed("middle-layer", false)
        .classed("foreground-layer", true);
    layers.foreground.data = layers.middle.data;
    layers.foreground.nodes = layers.middle.nodes;
    layers.foreground.links = layers.middle.links;

    // TODO: Add children data request and fill "title" attribute in data
    layers.foreground.data.nodes.forEach(function(node, i) {
        node.title = subLayerTags[i];
    });

    // create new middle layer
    layers.middle = createLayer(
        "middle-layer",
        createDummyData(NUMBER_OF_TAGS),
        afterCSS="background-layer");
    layers.middle.nodes.attr("transform", moveNode);

    // init layers
    initForegroundLayer();
    initMidLayer();
}


function onMouseMove() {
    if (!d3.event.active) restartSimulations();

    mouse.x = d3.mouse(this)[0];
    mouse.y = d3.mouse(this)[1];
}


function onResize() {
    //get current svg-container size
    width = svgContainer.clientWidth;
    height = svgContainer.clientHeight;

    // resize viewport
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    // change sim parameters

    layers.foreground.simulation.force("center")
        .x(width/2)
        .y(height/2);
    layers.foreground.simulation.force("link")
        .distance(height*linkLength);

    layers.middle.simulation.force("center")
        .x(width/2)
        .y(height/2);
    layers.middle.simulation.force("link")
        .distance(height*linkLength);

    restartSimulations();
}


function dragStarted (d) {
    if (!d3.event.active) restartSimulations();
    d.fx = d.x;
    d.fy = d.y;
}


function dragged(d) {
    mouse.x = d3.event.x;
    mouse.y = d3.event.y;

    d.fx = d3.event.x;
    d.fy = d3.event.y;
}


function dragEnded(d) {
    if (!d3.event.active) layers.foreground.simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}


function moveNode(d) {
    // move node to position (SVG coordinates)

    // set svg borders
    if (d.x > width - d.r) d.x = width - d.r;
    if (d.y > height - d.r) d.y = height - d.r;
    if (d.x < d.r) d.x = d.r;
    if (d.y < d.r) d.y = d.r;

    // return position
    return `translate(${d.x}, ${d.y})`;
}


function initForegroundLayer() {
    // and create a text label on it basing on title in data.nodes
    let data = layers.foreground.data;
    let nodes = layers.foreground.nodes;

    nodes.attr("title", d => d.title);
    nodes.select("circle").attr("id", d => d.id);

    nodes.append("text")
        .text(d => d.title);

    // add drag functionality
    nodes.call(
        d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded)
    );

    // handle user interaction
    nodes.selectAll("circle")
        .on("click", onNodeClick);

    // add force layers.foreground.simulation
    layers.foreground.simulation = d3.forceSimulation(data.nodes)
        .force("charge", d3.forceManyBody().strength(charge*height))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink(data.links).id(d => d.title))
        .force("collide", d3.forceCollide(r).strength(0.5))
        .on("tick", ticked);

    layers.foreground.simulation
        .force("link")
        .distance(height*linkLength)
        .strength(0.5);
}


function initMidLayer() {
    let data = layers.middle.data;
    let nodes = layers.middle.nodes;

    layers.middle.simulation = d3.forceSimulation(data.nodes)
        .force("charge", d3.forceManyBody().strength(charge*height))
        .force("collide", d3.forceCollide(r).strength(0.5))
        .force("center", d3.forceCenter(width/2, height/2))
        .force("link", d3.forceLink(data.links).id(d => d.title))
        .on("tick", tickedMid);
    layers.middle.simulation
        .force("link")
        .distance(height*linkLength)
        .strength(0.5);
}


function createLayer(layerCSS, data, afterCSS=null) {
    let group;
    if (afterCSS) {
        group = svg.insert("g", `g.${afterCSS} + *`);
    } else {
        group = svg.append("g");
    }
    group.classed(layerCSS, true)
        .append("g")
        .classed("link", true);

    let links = group.select("g.link")
        .selectAll("line")
        .data(data.links)
        .join(
            enter => enter.append("line"),
            update => update,
            exit => exit.remove()
        );

    // Create svg groups for each node and bind it with data
    let nodes = group.selectAll("g.node")
        .data(data.nodes)
        .join(
            enter => enter.append("g"),
            update => update,
            exit => exit.remove()
        )
        .attr("transform", moveNode);

    // append basic circle to each node
    nodes.append("circle")
        .transition().duration(enterDuration)
        .attr("r", d => d.r ? d.r : r) //if nodes.r provided use it, else default
        .attr("class", "tag_circles");

    return {
        group: group,
        nodes: nodes,
        links: links,
        data: data,
    };
}


function createDummyData(n=NUMBER_OF_TAGS) {
    // create data with random node coordinates
    let data = {nodes: [], links: []};
    for (let i = 0; i < n; i++) {
        let x = getRandomInt(0, width),
            y = getRandomInt(0, height),
            rad = getRandomInt(r, r+20);
        data.nodes.push({
            x: x,
            y: y,
            r: rad
        });
    }

    createDummyLinks(data);

    return data;
}


function createDummyLinks(data, probability=0.2) {
    data.links = [];

    for (let i = 0; i < data.nodes.length - 1; i++) {
        for (let j = i + 1; j < data.nodes.length; j++) {
            if (Math.random() <= probability) {
                data.links.push({
                    source: data.nodes[i],
                    target: data.nodes[j]}
                );
            }
        }
    }
}


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function initData(data) {
    // add missing properties if any
    data.nodes.forEach(function(node) {
        node.x = node.x ? node.x : width/2;
        node.y = node.y ? node.y : height/2;
        node.r = node.r ? node.r : r;
    });
    return data;
}


function restartSimulations() {
    layers.middle.simulation.alphaTarget(0.3).restart();
    layers.foreground.simulation.alphaTarget(0.3).restart();
}
