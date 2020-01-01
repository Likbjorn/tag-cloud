const NUMBER_OF_TAGS = 8; // default number of middle nodes

let r = 10, // px
    dr = 10, // max increment to random radius, px
    linkLength = 0.35, // relative to viewport height
    interactionRange = 80, // px
    attractionRate = 0.5, // how fast nodes are attracted to cursor
    velocityDecay = 0.1,
    charge = -0.1,
    chargeDistance = 100, // max node to node interaction distance, px
    linkStrength = 0.2,
    exitDuration = 1000,
    enterDuration = 100,
    gaussBlur = 1.5,
    mouse = {x: 0, y: 0},
    alphaTarget = 0.2, // simulation parameters
    alphaInitial = 0.2,
    alphaDecay = 0, // let simulation never end
    width,
    height,
    svg, svgContainer,
    layers,
    nearestNodes,
    blur_filter_svg,
    blur_filter_mid,
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

initData(data.foreground);

// create svg - probably can be done in index.html
svg = d3.select("#svg_container")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "none")
    .attr("text-anchor", "left")
    .classed("svg-content", true);

// add listener for resize

window.addEventListener("resize", onResize);

// create layers
layers = {};
layers.background = createLayer("background-layer", data.background);
layers.middle = createLayer("middle-layer", data.middle);
layers.foreground = createLayer("foreground-layer", data.foreground);

// init data and forces on layers
initForegroundLayer();
initMidLayer();

svg.on("mousemove", onMouseMove);

// add a blur filter for circles
blur_filter_svg = svg.append("defs")
    .append("filter")
    .attr("id", "svg_blur")
    .append("feGaussianBlur")
    .attr("stdDeviation", gaussBlur);

// add a blur filter for middle layer
blur_filter_mid = svg.append("defs")
    .append("filter")
    .attr("id", "mid_blur")
    .append("feGaussianBlur")
    .attr("stdDeviation", 10);

// simulation tick functions

function ticked() {
    // foreground layer

    // move each node according to forces
    layers.foreground.nodes.attr("transform", moveNode);

    // debug coords
    layers.foreground.nodes.select("#coords")
        .text(d => `x=${Math.round(d.x)}; y=${Math.round(d.y)}`);

    // remove highlight from all nodes
    d3.selectAll("g.foreground-layer > g > .hovered_circle").classed("hovered_circle", false);

    // update links
    layers.foreground.links
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    // find nearest node
    nearestNodes = findAll(mouse.x, mouse.y, interactionRange, layers.foreground.simulation, 3);


    if (nearestNodes) {
        nearestNodes.forEach(function(node){
            // set node velocity towards cursor
            moveToCursor(node, attractionRate);
            d3.select("#"+node.id).classed("hovered_circle", true);

            mouse_node_dist = Math.sqrt((mouse.x - node.x)**2 + (mouse.y - node.y)**2);
            blur_ratio = (interactionRange-mouse_node_dist)/(interactionRange-r)*gaussBlur;

            // blur it
            blur_filter_svg.attr("stdDeviation", blur_ratio <= gaussBlur ? blur_ratio : gaussBlur);
        });
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

    // find nearest node
    let nearestNodes = findAll(mouse.x, mouse.y, interactionRange, layers.middle.simulation, 3);

    if (nearestNodes) {
        nearestNodes.forEach(function(node) {
            // set node velocity towards cursor
            moveToCursor(node, -attractionRate);
        });
    }
}

// event handlers

function onNodeClick(node) {
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
    layers.foreground = layers.middle;
    layers.foreground.group = layers.middle.group.classed("middle-layer", false)
        .classed("foreground-layer", true);

    requestData(node); // request new data basing on clicked node

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
        .x(width / 2)
        .y(height / 2);
    layers.foreground.simulation.force("link")
        .distance(height*linkLength);

    layers.middle.simulation.force("center")
        .x(width / 2)
        .y(height / 2);
    layers.middle.simulation.force("link")
        .distance(height*linkLength);
}


function dragStarted(d) {
    d.fx = d.x;
    d.fy = d.y;
}


function dragged(d) {
    mouse.x = d3.event.x;
    mouse.y = d3.event.y;

    d.fx = mouse.x;
    d.fy = mouse.y;
}


function dragEnded(d) {
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
        .text(d => d.title)
        .attr("x", 10)
        .attr("y", -15);

    nodes.append("text")
        .attr("id", "coords")
        .attr("dy", 20)
        .text(d => `x=${Math.round(d.x)}; y=${Math.round(d.y)}`);

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

    // add simulation
    simulation = initSimulation(data)
        .on("tick", ticked);
    layers.foreground.simulation = simulation;
}


function initMidLayer() {
    let data = layers.middle.data;
    let nodes = layers.middle.nodes;

    simulation = initSimulation(data)
        .on("tick", tickedMid);
    layers.middle.simulation = simulation;
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


function requestData(node) {
    // placeholder
    console.log("Requesting child tags of " + node.title);
    // TODO: Add children data request and fill "title" attribute in data
    layers.foreground.data.nodes.forEach(function(node, i) {
        node.title = subLayerTags[i];
    });
    initData(layers.foreground.data); // update IDs basing on titles
}


function createDummyData(n=NUMBER_OF_TAGS) {
    // create data with random node coordinates
    let data = {nodes: [], links: []};
    for (let i = 0; i < n; i++) {
        data.nodes.push({title: "placeholder"+i});
    }
    initData(data);

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


function initData(data) {
    // add missing properties if any
    data.nodes.forEach(function(node) {
        node.x = node.x ? node.x : getRandomInt(0, width);
        node.y = node.y ? node.y : getRandomInt(0, height);
        node.r = node.r ? node.r : getRandomInt(r, r+dr);
        node.id = node.title ? node.title.replace(/ /g, "") : null;
    });
    return data;
}


function moveToCursor(node, attractionRate) {
    node.vx += attractionRate*Math.sin((mouse.x - node.x)*Math.PI/interactionRange);
    node.vy += attractionRate*Math.sin((mouse.y - node.y)*Math.PI/interactionRange);
}


function moveRandom(node) {

}


function initSimulation(data) {
    // initialize simulation for foreground and middle layers
    // as it is pretty much the same
    let simulation = d3.forceSimulation(data.nodes)
        .force("charge", d3.forceManyBody().strength(charge*height))
        .force("center", d3.forceCenter(width/2, height/2))
        .force("link", d3.forceLink(data.links).id(d => d.title))
        .alpha(alphaInitial)
        .alphaDecay(alphaDecay)
        .velocityDecay(velocityDecay);
    simulation
        .force("link")
        .distance(height*linkLength)
        .strength(linkStrength);
    simulation
        .force("charge")
        .strength(charge*height)
        .distanceMax(chargeDistance);
    return simulation;
}


function restartSimulations() {
    layers.middle.simulation.alphaTarget(alphaTarget).restart();
    layers.foreground.simulation.alphaTarget(alphaTarget).restart();
}


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function findAll(x, y, radius, simulation, quantity = 0) {
    nodes = simulation.nodes();
    let i = 0,
        n = nodes.length,
        dx,
        dy,
        d2,
        node,
        closest,
        innerRadius;

    if (n < quantity) return nodes.concat();
    if (quantity) closest = [];

    if (radius == null) radius = Infinity;
    else radius *= radius;

    for (i = 0; i < n; ++i) {
        node = nodes[i];
        dx = x - node.x;
        dy = y - node.y;
        d2 = dx * dx + dy * dy;
        if (d2 < radius) {
            if (quantity > 1) {
                if (!closest.length) {
                    closest.push(node);
                    innerRadius = d2;
                } else {
                    if (d2 < innerRadius) {
                        innerRadius = d2;
                        closest.unshift(node);
                        if (closest.length >= quantity) {
                            d2 = closest[closest.length - 1];
                            radius = d2.x * d2.x + d2.y * d2.y;
                        }
                    } else {
                        closest.push(node);
                        if (closest.length >= quantity) radius = d2;
                    }
                }
            } else {
                closest = quantity ? [node] : node;
                radius = d2;
            }
        }
    }

    return closest;
}
