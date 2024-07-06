let users;
let links;
let nodes;

async function fetchData() {
  try {
    d3.json("data/sampled_combined_user_data.json").then((data) => {
      nodes = data.map((n) => ({ id: n.user_id, connections: n.connections }));

      links = [];
      data.forEach((user) => {
        let degree = user.connections.length;
        user.connections.forEach((connection) => {
          if (nodes.some((node) => node.id === connection)) {
            links.push({
              source: user.user_id,
              target: connection,
              size: degree,
            });
          }
        });
      });
      console.log("Nodes: ", nodes); //100
      console.log("Links: ", links); //2298
      createGraph();
    });
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

fetchData();

function createGraph() {
  const svgWidth = 1200;
  const svgHeight = 700;
  const svg = d3
    .select("#svg-container")
    .append("svg")
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .style("border", "1px solid");

  const graph = svg
    .append("g")
    .attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`);

  const simulation = d3
    .forceSimulation(nodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(200)
    )
    .force(
      "charge",
      d3
        .forceManyBody()
        .strength((d) => -30 * Math.sqrt(d.connections.length + 1))
    )
    .force("center", d3.forceCenter(0, 0))
    .force(
      "collision",
      d3.forceCollide().radius((d) => 20 + Math.sqrt(d.connections.length))
    )
    .on("tick", tick);

  const link = graph
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#373A40")
    .attr("stroke-width", 1.5);

  const user_node = graph
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", "node")
    .attr("r", 6)
    .attr("fill", "#DC5F00")
    .call(
      d3
        .drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded)
    );
  user_node.append("title").text((d) => d.id);

  function tick() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    user_node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
  }

  //The alpha target is increased to 0.3, making the simulation more dynamic and responsive.
  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}
