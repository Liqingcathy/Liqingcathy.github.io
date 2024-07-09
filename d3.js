let allNodes;
let allLinks;
let simulation;
let svg;
let graph;
let link;
let user_node;
let userCheckInTimes;
let timeoutId;
let threshold;
async function fetchData() {
  try {
    const data = await d3.json("data/sampled_combined_user_data.json");

    allNodes = data.map((n) => ({
      id: n.user_id,
      connections: n.connections,
      check_in_time: n.check_in_time,
      check_in_duration: parseFloat(calculateCheckInDuration(n.check_in_time)),
      check_in_frequency: n.check_in_time.length,
    }));

    allLinks = [];
    data.forEach((user) => {
      let degree = user.connections.length;
      user.connections.forEach((connection) => {
        if (allNodes.some((node) => node.id === connection)) {
          allLinks.push({
            source: user.user_id,
            target: connection,
            size: degree,
          });
        }
      });
    });

    console.log("Nodes: ", allNodes); //100
    console.log("Links: ", allLinks); //2298

    // const connections = allNodes.map((node) => node.connections.length);
    // const durations = allNodes.map((node) => node.check_in_duration);
    // const frequencies = allNodes.map((node) => node.check_in_frequency);
    // const minConnection = Math.min(...connections); //1
    // const maxConnection = Math.max(...connections); //64
    // const minDuration = Math.min(...durations); //0
    // const maxDuration = Math.max(...durations); //9684.83
    // const minFrequency = Math.min(...frequencies); //1
    // const maxFrequency = Math.max(...frequencies); //2025

    document
      .getElementById("connectionRange")
      .addEventListener("input", updateGraph, { passive: true });
    document
      .getElementById("durationRange")
      .addEventListener("input", updateGraph, { passive: true });
    document
      .getElementById("frequencyRange")
      .addEventListener("input", updateGraph, { passive: true });

    document
      .getElementById("connect-btn")
      .addEventListener("click", () => clusterNodes("connections"), {
        passive: true,
      });
    document
      .getElementById("duration-btn")
      .addEventListener("click", () => clusterNodes("duration"), {
        passive: true,
      });
    document
      .getElementById("freq-btn")
      .addEventListener("click", () => clusterNodes("frequency"), {
        passive: true,
      });

    document
      .getElementById("reset-btn")
      .addEventListener("click", resetGraph, { passive: true });

    createGraph(allNodes, allLinks);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

fetchData();

function resetGraph() {
  location.reload();
  // d3.select("#svg-container").selectAll("svg").remove();
  document.getElementById("svg-container").style.width = "100%";
  document.getElementById("chart-container").style.width = "0%";
  // createGraph(allNodes, allLinks);
}

function calculateCheckInDuration(data) {
  const checkInTime = data.map((n) => new Date(n));
  checkInTime.sort((a, b) => a - b);
  const earliestTime = checkInTime[0];
  const latestTime = checkInTime[checkInTime.length - 1];
  const durationInMS = latestTime - earliestTime;

  const durationInMinutes = Math.floor(durationInMS / 60000);
  const durationInHours = durationInMinutes / 60;
  return durationInHours.toFixed(2);
}

function getSortedCheckInTimeList(data) {
  const checkInTime = data.map((n) => new Date(n.check_in_time));
  checkInTime.sort((a, b) => a - b);
  return checkInTime;
}

//to highlight 90 percentile/top 10% of nodes (users) have highest social connections
function highlightTopTenNodes(nodes) {
  const connectionLengths = nodes.map((d) => d.connections.length);
  threshold = d3.quantile(connectionLengths.sort(d3.ascending), 0.9);
  console.log("threshold", threshold);
}

function clearAnnotations() {
  d3.selectAll(".annotation-group").remove();
}

//annotation 1: node with top connections
function createAnnotation(nodes) {
  const sortedConnectionNodes = [...nodes].sort(
    (a, b) => b.connections.length - a.connections.length
  );
  const sortedDurationNodes = [...nodes].sort(
    (a, b) => b.check_in_duration - a.check_in_duration
  );
  const sortedFreqNodes = [...nodes].sort(
    (a, b) => b.check_in_frequency - a.check_in_frequency
  );
  const topConnectionNode = sortedConnectionNodes[0];
  console.log(topConnectionNode);
  const topDurationNode = sortedDurationNodes[0];
  const topFreqNode = sortedFreqNodes[0];

  const annotations = [
    {
      note: {
        label: `User ID: ${topConnectionNode.id}\nConnections: ${topConnectionNode.connections.length}\nCheck-in Duration: ${topConnectionNode.check_in_duration}\nCheck-in Frequency: ${topConnectionNode.check_in_frequency}`,
        title: "Top socially connected user",
        wrap: 250,
      },
      data: topConnectionNode,
      className: "annotated_node",
      dy: topConnectionNode.y - 40,
      dx: topConnectionNode.x + 280,
    },
    {
      note: {
        label: `User ID: ${topDurationNode.id}\nConnections: ${topDurationNode.connections.length}\nCheck-in Duration: ${topDurationNode.check_in_duration}\nCheck-in Frequency: ${topDurationNode.check_in_frequency}`,
        title: "Top user with the longest check-in duration",
        wrap: 250,
      },
      data: topDurationNode,
      className: "annotated_node",
      dy: topDurationNode.y - 20,
      dx: topDurationNode.x - 150,
    },
    {
      note: {
        label: `User ID: ${topFreqNode.id}\nConnections: ${topFreqNode.connections.length}\nCheck-in Duration: ${topFreqNode.check_in_duration}\nCheck-in Frequency: ${topFreqNode.check_in_frequency}`,
        title: "Top user with most frequent check-in time",
        wrap: 250,
      },
      data: topFreqNode,
      className: "annotated_node",
      dy: topFreqNode.y + 50,
      dx: topFreqNode.x - 240,
    },
  ];
  return annotations;
}

function createGraph(nodes, links) {
  const svgWidth = 1200;
  const svgHeight = 700;

  d3.select("#svg-container").selectAll("svg").remove();

  svg = d3
    .select("#svg-container")
    .append("svg")
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");
  // .style("border", "1px solid");

  graph = svg
    .append("g")
    .attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`);

  simulation = d3
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

  link = graph
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("stroke", "#373A40")
    .attr("stroke-width", 1.5);

  highlightTopTenNodes(nodes);

  user_node = graph
    .append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("class", (d) =>
      d.connections.length >= threshold ? "node highlight" : "node"
    )
    .attr("r", (d) => 3 + Math.sqrt(d.connections.length))
    .attr("fill", "#DC5F00")
    .on("click", debounce(handleNodeDetails, 200))
    // .on("mouseout", handleMouseOut)
    .call(
      d3
        .drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded)
    )
    .on("mouseover.tooltip", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(
          `User ID: ${d.id}<br>Connections: ${d.connections.length}<br>Check-in Duration: ${d.check_in_duration}<br>Check-in Frequency: ${d.check_in_frequency}`
        )
        .style("left", event.pageX + 20 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout.tooltip", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  graph
    .selectAll(".node-text")
    .data(nodes.filter((d) => d.connections.length > threshold))
    .enter()
    .append("text")
    .attr("class", "node-text")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "white")
    .text((d) => d.connections.length);

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("text-align", "center")
    .style("width", "120px")
    .style("height", "auto")
    .style("padding", "8px")
    .style("font", "12px sans-serif")
    .style("background", "black")
    .style("border", "0px")
    .style("border-radius", "8px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  user_node.append("title").text((d) => {
    d.id, d.connections.length;
  });

  const type = d3.annotationCallout;
  const annotations = createAnnotation(nodes);
  const makeAnnotations = d3
    .annotation()
    .editMode(true)
    .notePadding(15)
    .type(type)
    .accessors({
      x: (d) => d.x,
      y: (d) => d.y,
    })
    .annotations(annotations);

  graph
    .append("g")
    .attr("class", "annotation-group")
    .style("fill", "white")
    .style("width", "150px")
    .call(makeAnnotations);
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// function handleMouseOut() {
//   timeoutId = setTimeout(() => {
//     //delays the hiding
//     document.getElementById("svg-container").style.width = "100%";
//     document.getElementById("chart-container").style.width = "0%";
//   }, 500);
// }

function tick() {
  link
    .attr("x1", (d) => d.source.x)
    .attr("y1", (d) => d.source.y)
    .attr("x2", (d) => d.target.x)
    .attr("y2", (d) => d.target.y);

  user_node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

  graph
    .selectAll(".node-text")
    .attr("x", (d) => d.x)
    .attr("y", (d) => d.y);
}

function dragStarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.1).restart();
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

function updateGraph() {
  clearAnnotations();
  const connectionRange = parseFloat(
    document.getElementById("connectionRange").value
  );
  const durationRange = parseFloat(
    document.getElementById("durationRange").value
  );
  const frequencyRange = parseInt(
    document.getElementById("frequencyRange").value,
    10
  );

  document.getElementById("connectionValue").textContent = connectionRange;
  document.getElementById("durationValue").textContent = durationRange;
  document.getElementById("frequencyValue").textContent = frequencyRange;

  const filteredNodes = allNodes.filter(
    (node) =>
      node.connections.length <= connectionRange ||
      node.check_in_duration <= durationRange ||
      node.check_in_frequency <= frequencyRange
  );

  const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredLinks = allLinks.filter(
    (link) =>
      filteredNodeIds.has(link.source) || filteredNodeIds.has(link.target)
  );

  user_node
    .attr("fill", (d) => (filteredNodeIds.has(d.id) ? "#FD8508" : "black"))
    .attr("r", (d) => (filteredNodeIds.has(d.id) ? 5 : 1));

  link
    .attr("stroke", (d) =>
      filteredNodeIds.has(d.source.id) && filteredNodeIds.has(d.target.id)
        ? "#4E745D"
        : "gray"
    )
    .attr("stroke-width", (d) =>
      filteredNodeIds.has(d.source.id) && filteredNodeIds.has(d.target.id)
        ? 1
        : 0
    );

  simulation.nodes(filteredNodes);
  simulation.force("link").links(filteredLinks);
  simulation.alpha(0.05).restart();
}

function handleNodeDetails(event, d) {
  clearTimeout(timeoutId); //Clears any existing timeout to prevent premature hiding
  const checkInTimes = d.check_in_time.map((time) => {
    const date = new Date(time);
    const dateString = `${
      date.getMonth() + 1
    }/${date.getDate()}/${date.getFullYear()}`;
    const timeString = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    return { date: dateString, time: timeString };
  });

  document.getElementById("svg-container").style.width = "40%";
  document.getElementById("chart-container").style.width = "60%";
  console.log("checkInTimes", checkInTimes);

  d3.select("#chart-container").selectAll("svg").remove();

  const margin = { top: 20, right: 20, bottom: 40, left: 70 },
    width = 800 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

  const x = d3.scaleBand().range([0, width]).padding(0.3);
  const y = d3.scaleTime().range([height, 0]);

  const xAxis = d3.axisBottom(x);
  const yAxis = d3.axisLeft(y).tickFormat(d3.timeFormat("%H:%M"));

  const svg = d3
    .select("#chart-container")
    .append("svg")
    .attr(
      "viewBox",
      `0 0 ${width + margin.left + margin.right} ${
        height + margin.top + margin.bottom
      }`
    )
    .style("display", "flex")
    .style("margin", "auto")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  svg
    .append("text")
    .attr("x", width / 2 + 10)
    .attr("y", height + 60)
    .attr("class", "line-chart-title")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("border", "1px")
    .style("text-decoration", "underline")
    .style("fill", "white")
    .text("User Check-in Time and Dates");

  const parseTime = d3.timeParse("%H:%M:%S");
  const timeData = checkInTimes.map((d) => ({
    date: d.date,
    time: parseTime(d.time),
  }));

  const uniqueDates = [...new Set(timeData.map((d) => d.date))].sort(
    (a, b) => new Date(a) - new Date(b)
  );

  x.domain(uniqueDates);
  y.domain(d3.extent(timeData, (d) => d.time));

  svg
    .append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  svg.append("g").call(yAxis);

  const line = d3
    .line()
    .x((d) => x(d.date))
    .y((d) => y(d.time));

  svg
    .append("path")
    .datum(timeData)
    .attr("fill", "none")
    .attr("stroke", "#DC5F00")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  svg
    .selectAll(".dot")
    .data(timeData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("r", 3)
    .attr("cx", (d) => x(d.date))
    .attr("cy", (d) => y(d.time))
    .style("fill", "#DC5F00");
}

//forceCollide code snippet credit to https://observablehq.com/@d3/clustered-bubbles
//prevents nodes from overlapping
function forceCollide() {
  const alpha = 0.6;
  const padding1 = 2;
  const padding2 = 3;
  let nodes;
  let maxRadius;

  //For each node, find nearby nodes using the quadtree
  //and apply a repelling force if they are too close
  function force() {
    const quadtree = d3.quadtree(
      nodes,
      (d) => d.x,
      (d) => d.y
    );
    for (const d of nodes) {
      const r = d.r + maxRadius;
      const nx1 = d.x - r,
        ny1 = d.y - r;
      const nx2 = d.x + r,
        ny2 = d.y + r;
      quadtree.visit((q, x1, y1, x2, y2) => {
        if (!q.length)
          do {
            if (q.data !== d) {
              const r =
                d.r +
                q.data.r +
                (d.cluster === q.data.cluster ? padding1 : padding2);
              let x = d.x - q.data.x,
                y = d.y - q.data.y,
                l = Math.hypot(x, y);
              if (l < r) {
                l = ((l - r) / l) * alpha;
                d.x -= x *= l;
                d.y -= y *= l;
                q.data.x += x;
                q.data.y += y;
              }
            }
          } while ((q = q.next));
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }

  force.initialize = (_) =>
    (maxRadius =
      d3.max((nodes = _), (d) => d.r) + Math.max(padding1, padding2));

  return force;
}

function clusterNodes(attribute) {
  const clusters = {}; //holds x and y coordinates for each cluster
  const colors = ["#371610", "#88281A", "#EC4931", "#BDACA9"]; //assign 4 groups color clusters
  const colorScale = d3.scaleOrdinal(colors);

  const attributeRange = {
    connections: { min: 1, max: 64 },
    duration: { min: 0, max: 9684.83 },
    frequency: { min: 1, max: 2025 },
  };

  const { min, max } = attributeRange[attribute];

  // Cluster key value between 0 and 3
  // Normalizes the attribute value within the range 1799 / 2024 ≈ 0.8892
  // Scales this normalized value to fit within the number of color categories 0.8892 * 3 ≈ 2.6676
  // Floor the result to obtain an integer index representing the cluster Math.floor(2.6676) = 2
  allNodes.forEach((node) => {
    let key;
    if (attribute === "frequency") {
      key = Math.floor(
        ((node.check_in_frequency - min) / (max - min)) * (colors.length - 1)
      );
      console.log("frequency key", key);
    } else if (attribute === "duration") {
      key = Math.floor(
        ((node.check_in_duration - min) / (max - min)) * (colors.length - 1)
      );
    } else if (attribute === "connections") {
      key = Math.floor(
        ((node.connections.length - min) / (max - min)) * (colors.length - 1)
      );
    }

    if (!clusters[key]) {
      clusters[key] = { x: Math.random() * 1200, y: Math.random() * 700 };
      console.log("nonkey", key);
    }

    node.cluster = key;
    console.log("node.cluster: ", node.cluster);
    node.color = colorScale(key);
  });

  const forceX = d3.forceX((d) => clusters[d.cluster].x).strength(0.5);
  const forceY = d3.forceY((d) => clusters[d.cluster].y).strength(0.5);

  simulation
    .force("x", forceX)
    .force("y", forceY)
    .force("collide", forceCollide())
    .alpha(0.5)
    .restart();

  user_node
    .attr("fill", (d) => d.color)
    .attr("r", (d) => {
      // e.g: normalized = (1500 - 1) / (2025 - 1) ≈ 0.741
      // scaled = Math.sqrt(0.741) ≈ 0.861
      // radius = 5 + 0.861 * 10 ≈ 13.61
      if (attribute === "frequency") {
        return 10 + ((d.check_in_frequency - min) / (max - min)) * 20;
      } else if (attribute === "duration") {
        return 10 + ((d.check_in_duration - min) / (max - min)) * 10;
      } else if (attribute === "connections") {
        return 10 + ((d.connections.length - min) / (max - min)) * 15;
      }
      return 15;
    });
  d3.select(".links").remove(); //only want to show nodes, not links
}
