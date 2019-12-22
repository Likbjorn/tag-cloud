// data; not in json file for dev purposes
let foregroundData = {
    nodes: [
        {title: "Physics", r: 50},
        {title: "Biology", r: 40},
        {title: "Math", r: 60},
        {title: "Medicine", r: 45},
        {title: "Economy", r: 45},
        {title: "Statistics", r: 55},
        {title: "Chemistry", r: 50},
        {title: "History", r: 40},
        {title: "Literature", r: 55},
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
    ]
};

let subLayerTags = [
    "Astronomy",
    "Biophysics",
    "Mechanics",
    "Electricity",
    "Hydrodynamics",
    "Optics",
    "Magnetism",
    "Geophysics",
];

const NUMBER_OF_TAGS = 8;

let width = 1024,
    height = 480,
    r = 50,
    interactionRange = 80,
    gaussBlur = 5,
    mouse = {x: 0, y: 0},
    svg,
    foregroundLayer, middleLayer, backgroundLayer,
    nodes, midNodes, backNodes,
    links, midLinks, backLinks,
    simulationForeground, simulationMiddle, simulationBack,
    blur_filter,
    blur_ratio;

const backgroundData = createDummyData(NUMBER_OF_TAGS);

let midData;
// set random initial positions
midData = createDummyData(NUMBER_OF_TAGS);

initData(foregroundData);

// create svg - probably can be done in index.html
svg = d3.select("#svg_container")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMinYMid meet")
    .attr("text-anchor", "middle")
    .classed("svg-content", true);

// create layers
[backgroundLayer, backNodes, backLinks] = createLayer(
    svg,
    "background-layer",
    backgroundData
);
[middleLayer, midNodes, midLinks] = createLayer(
    svg,
    "middle-layer",
    midData
);
[foregroundLayer, nodes, links] = createLayer(svg,
    "foreground-layer",
    foregroundData
);

// init data and forces on layers
initForegroundLayer(foregroundData);
initMidLayer(midData);

svg.on("mousemove", handleSimOnMouseMove);

// add a blur filter
blur_filter = svg.append("defs")
    .append("filter")
    .attr("id", "svg_blur")
    .append("feGaussianBlur")
    .attr("stdDeviation", gaussBlur);

function ticked() {
    // foreground layer

    // move each node according to forces
    nodes.attr("transform", moveNode);

    // update links
    links.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    // find nearest node
    let node = simulationForeground.find(mouse.x, mouse.y, interactionRange);

    if (node) {
        // set node velocity towards cursor
        node.vx = (mouse.x - node.x)*0.05;
        node.vy = (mouse.y - node.y)*0.05;

        mouse_node_dist = Math.sqrt((mouse.x - node.x)**2 + (mouse.y - node.y)**2);
        blur_ratio = (interactionRange-mouse_node_dist)/(interactionRange-r)*gaussBlur;

        // blur it
        if (d3.select("g.foreground-layer#"+node.title) != d3.select("g.foreground-layer > g > .hovered_circle")) {
            d3.select("g.foreground-layer > g > .hovered_circle").classed("hovered_circle", false);
            //blur_ratio = gaussBlur;
            d3.select("#"+node.title).classed("hovered_circle", true);
            prev_node = node;
        }
        blur_filter.attr("stdDeviation", blur_ratio <= gaussBlur ? blur_ratio : gaussBlur);
    } else if (typeof(prev_node) != "undefined") {
        d3.select("#"+prev_node.title).classed("hovered_circle", false);
    }
}


function tickedMid() {
    midNodes.attr("transform", moveNode);

    // update links
    midLinks.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

}


function handleBubbleOnMouseClick() {
    // do pretty transition
    foregroundLayer.selectAll("text") // text does not inherit opacity for some reason
        .transition()
        .duration(500)
        .attr("opacity", 0);
    foregroundLayer
        .transition()
        .duration(500)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .remove();

    // promote middle layer
    foregroundLayer = middleLayer.classed("middle-layer", false)
        .classed("foreground-layer", true);
    [foregroundData, nodes, links] = [midData, midNodes, midLinks];

    // TODO: Add children data request and fill "title" attribute in data
    foregroundData.nodes.forEach(function(node, i) {
        node.title = subLayerTags[i];
    });

    // create new middle layer
    midData = createDummyData(NUMBER_OF_TAGS);

    [middleLayer, midNodes, midLinks] = createLayer(svg,
        "middle-layer",
        midData,
        afterCSS="background-layer");
    midNodes.attr("transform", moveNode);

    // init layers
    initForegroundLayer(foregroundData);
    initMidLayer(midData);
}


function handleSimOnMouseMove() {
    if (!d3.event.active) simulationForeground.alphaTarget(0.3).restart();

    mouse.x = d3.mouse(this)[0];
    mouse.y = d3.mouse(this)[1];
}


function dragStarted (d) {
    if (!d3.event.active) simulationForeground.alphaTarget(0.3).restart();
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
    if (!d3.event.active) simulationForeground.alphaTarget(0);
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

function initForegroundLayer(data) {
    // and create a text label on it basing on title in data.nodes
    nodes.attr("title", d => d.title);
    nodes.select("circle").attr("id", d => d.title);

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
        .on("click", handleBubbleOnMouseClick);

    // add force simulationForeground
    simulationForeground = d3.forceSimulation(data.nodes)
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("link", d3.forceLink(data.links).id(d => d.title))
        .force("collide", d3.forceCollide(r).strength(0.5))
        .on("tick", ticked);

    simulationForeground.force("link").distance(200).strength(0.5);
}


function initMidLayer(data) {
    simulationMiddle = d3.forceSimulation(data.nodes)
        .force("charge", d3.forceManyBody().strength(-100))
        .force("collide", d3.forceCollide(r).strength(0.5))
        .force("center", d3.forceCenter(width/2, height/2))
        .force("link", d3.forceLink(data.links).id(d => d.title))
        .on("tick", tickedMid);
    simulationMiddle.force("link").distance(200).strength(0.5);
}


function createLayer(svg, layerCSS, data, afterCSS=null) {
    let layer;
    if (afterCSS) {
        layer = svg.insert("g", `g.${afterCSS} + *`);
    } else {
        layer = svg.append("g");
    }
    layer.classed(layerCSS, true)
        .append("g")
        .classed("link", true);

    let links = layer.select("g.link")
        .selectAll("line")
        .data(data.links)
        .join(
            enter => enter.append("line"),
            update => update,
            exit => exit.remove()
        );

    // Create svg groups for each node and bind it with data
    let nodes = layer.selectAll("g.node")
        .data(data.nodes)
        .join(
            enter => enter.append("g"),
            update => update,
            exit => exit.remove()
        )
        .attr("transform", moveNode);

    // append basic circle to each node
    nodes.append("circle")
        .transition().duration(100)
        .attr("r", d => d.r ? d.r : r) //if nodes.r provided use it, else default
        .attr("class", "tag_circles");

    return [layer, nodes, links];
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
