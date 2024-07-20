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
let clusteredNodes;

/**
 * Fetch processed sample data and update to allNodes list for further data visualization.
 * Updates data in allNodes (100) and allLinks (2298)
 * @param none
 * @returns {}
 */
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

    //Add and trigger filter and button event listeners
    document
      .getElementById("connectionRange")
      .addEventListener("input", () => updateGraph("connections"));
    document
      .getElementById("durationRange")
      .addEventListener("input", () => updateGraph("duration"));
    document
      .getElementById("frequencyRange")
      .addEventListener("input", () => updateGraph("frequency"));

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

/**
 * Reset the force directed graph to the original graph before or after clicking
 * filtering/clustering/viewing node details buttons. Set scene1 screen to 100% width in
 * case user click from scene 3 where the width is 4:6
 */
function resetGraph() {
  location.reload();
  document.getElementById("svg-container").style.width = "100%";
  document.getElementById("chart-container").style.width = "0%";
}

/**
 * Calculate users' check-in duration based on firstly and lastly time checked in time
 * @param {*} data all nodes that have been updated with fetched data
 * @returns {float} formatted in hours duration value
 */
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

/**
 * Get 90 percentile/top 10% of nodes (users) have highest social connections
 * and update the threshold global variable
 * @param {*} nodes all nodes
 */
function highlightTopTenNodes(nodes) {
  const connectionLengths = nodes.map((d) => d.connections.length);
  threshold = d3.quantile(connectionLengths.sort(d3.ascending), 0.9);
}

/**
 * Clear annotation based on each scene's event listener parameter
 * @param {string} page
 */
function clearAnnotations(page) {
  if (page === "scene1") {
    d3.select(".annotation-scene1").remove();
  } else if (
    page === "scene2" ||
    page === "connections" ||
    page === "duration" ||
    page === "frequency"
  ) {
    d3.selectAll(".annotation-scene2").remove();
  } else if (page === "scene1-2") {
    d3.selectAll(".annotation-scene1-2").remove();
  } else {
    console.error("Invalid page parameter");
  }
}

/**
 * Create annotations for the main social network graph for the top 3 nodes in each category
 * @param {*} nodes
 * @param {*} attr
 * @returns {object} annotations
 */
function createAnnotation(nodes, attr) {
  let annotations;
  clusteredNodes = nodes;
  let sortedConnectionNodes, sortedDurationNodes, sortedFreqNodes;
  let topConnectNode, topDurNode, topFNode;
  if (nodes.length >= 0) {
    sortedConnectionNodes = [...nodes].sort(
      (a, b) => b.connections.length - a.connections.length
    );
    sortedDurationNodes = [...nodes].sort(
      (a, b) => b.check_in_duration - a.check_in_duration
    );
    sortedFreqNodes = [...nodes].sort(
      (a, b) => b.check_in_frequency - a.check_in_frequency
    );
    topConnectNode = sortedConnectionNodes[0];
    topDurNode = sortedDurationNodes[0];
    topFNode = sortedFreqNodes[0];
  }

  if (attr === "scene1") {
    annotations = [
      {
        note: {
          label: `User ID: ${topConnectNode.id}\nConnections: ${topConnectNode.connections.length}\nCheck-in Duration: ${topConnectNode.check_in_duration}\nCheck-in Frequency: ${topConnectNode.check_in_frequency}`,
          title: "Top socially connected user",
          wrap: 250,
        },
        data: topConnectNode,
        className: "annotated_node",
        dy: topConnectNode.y + 170,
        dx: topConnectNode.x + 330,
      },
      {
        note: {
          label: `User ID: ${topDurNode.id}\nConnections: ${topDurNode.connections.length}\nCheck-in Duration: ${topDurNode.check_in_duration}\nCheck-in Frequency: ${topDurNode.check_in_frequency}`,
          title: "Top user with the longest check-in duration",
          wrap: 250,
        },
        data: topDurNode,
        className: "annotated_node",
        dy: topDurNode.y - 20,
        dx: topDurNode.x - 150,
      },
      {
        note: {
          label: `User ID: ${topFNode.id}\nConnections: ${topFNode.connections.length}\nCheck-in Duration: ${topFNode.check_in_duration}\nCheck-in Frequency: ${topFNode.check_in_frequency}`,
          title: "Top user with most frequent check-in time",
          wrap: 250,
        },
        data: topFNode,
        className: "annotated_node",
        dy: topFNode.y + 50,
        dx: topFNode.x - 240,
      },
    ];
  }
  return annotations;
}

//global tooltip for multiple usage in different scenes
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

/**
 * Render a force directed social network graph svg in D3 with node information,
 * annotation, and tick/node drag related functions
 * @param {*} nodes
 * @param {*} links
 */
function createGraph(nodes, links) {
  const svgWidth = 1200;
  const svgHeight = 700;

  d3.select("#svg-container").selectAll("svg").remove();

  svg = d3
    .select("#svg-container")
    .append("svg")
    .attr("id", "scene1")
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

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
    .attr("stroke-width", 0.5);

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
    .attr("r", (d) => 2 + Math.sqrt(d.connections.length))
    .attr("fill", "#eb5e28")
    .on("click", function (event, d) {
      d3.selectAll(".node").classed("clicked", false);
      d3.select(this).classed("clicked", true);

      debounce(handleNodeDetails, 200)(event, d);
    })
    .call(
      d3
        .drag()
        .on("start", dragStarted)
        .on("drag", dragged)
        .on("end", dragEnded)
    )
    .on("mousemove.tooltip", function (event, d) {
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

  user_node.append("title").text((d) => {
    d.id, d.connections.length;
  });

  const type = d3.annotationCallout;
  const annotationsObj = createAnnotation(nodes, "scene1");

  const makeAnnotations = d3
    .annotation()
    .editMode(true)
    .notePadding(15)
    .type(type)
    .accessors({
      x: (d) => d.x,
      y: (d) => d.y,
    })
    .annotations(annotationsObj);

  graph
    .append("g")
    .attr("class", "annotation-scene1")
    .style("fill", "white")
    .style("width", "150px")
    .call(makeAnnotations);
}

/**
 * Creates a debounced function that delays the invocation of button clicks
 * until after the specified wait time has elapsed since the last time the debounced
 * function was called. This helps reduce the number of times the function is executed
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {Function} A new debounced function
 */
function debounce(func, wait) {
  let timeout;
  //returns a new func that wraps the original function (func)
  return function (...args) {
    const context = this;
    clearTimeout(timeout); //clear any existing timeout to rest the delay
    //set a new timeout to call the function after the specified wait time
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Updates the positions of links and nodes on each tick of the simulation.
 * This function is called repeatedly during the simulation to update the
 * positions of the links and nodes.
 */
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

/**
 * Handles the start of the drag event.
 * This function is called when dragging of a node starts.
 *
 * @param {Object} event - The drag event.
 * @param {Object} d -  The dragged node.
 */
function dragStarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.1).restart();
  d.fx = d.x;
  d.fy = d.y;
}

/**
 * Handles the dragging of a node.
 * This function is called repeatedly while a node is being dragged.
 *
 * @param {Object} event - The drag event.
 * @param {Object} d - The dragged node.
 */
function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

/**
 * Handles the end of the drag event.
 * This function is called when dragging of a node ends.
 *
 * @param {Object} event - The drag event.
 * @param {Object} d - The dragged node.
 */
function dragEnded(event, d) {
  if (!event.active) simulation.alphaTarget(0);
}

/**
* The main graph SVG is updated to show filtered user nodes and their connections.
* The updated graph will dynamically change its form based on changes in connections, duration, and frequency values within the specified range.
* Nodes that are updated meet the filter requirements, being smaller than or equal to all the selected value.
 * @param {*} attr - connections, duration, and frequency for annotation purpose
 * @returns 
 */
function updateGraph(attr) {
  if (!attr) {
    console.error("Attribute is undefined or null");
    return;
  }

  //dynamically change scene description based on user's interaction
  const sceneText =
    "<p><b>Filter by range</b><br/>When users filter the range in connections, duration, and frequency, the visualization dynamically updates to display only the nodes whose values are smaller or equal to the selected range. This allows users to focus on a subset of the network, highlighting those individuals with fewer or more social connections, shorter or longer engagement durations, or lower or higher interaction frequencies.</p>";
  changeSceneText(sceneText);
  clearAnnotations("scene1");
  clearAnnotations("scene1-2");
  clearAnnotations("scene2");

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
    .attr("r", (d) => (filteredNodeIds.has(d.id) ? 6 : 1));

  link
    .attr("stroke", (d) =>
      filteredNodeIds.has(d.source.id) && filteredNodeIds.has(d.target.id)
        ? "#4E745D"
        : "gray"
    )
    .attr("stroke-width", (d) =>
      filteredNodeIds.has(d.source.id) && filteredNodeIds.has(d.target.id)
        ? 0.4
        : 0
    );

  // Calculates thresholds for high frequency and long duration for getting highly engaged users as annotation
  const highFrequencyThreshold = d3.quantile(
    filteredNodes.map((d) => d.check_in_frequency).sort(d3.ascending),
    0.75
  ); //285

  const longDurationThreshold = d3.quantile(
    filteredNodes.map((d) => d.check_in_duration).sort(d3.ascending),
    0.75
  ); //5279.62

  const highlyEngagedUsers = filteredNodes.filter(
    (d) =>
      d.check_in_frequency >= highFrequencyThreshold &&
      d.check_in_duration >= longDurationThreshold
  );
  const topHighlyEngagedUsers = highlyEngagedUsers.slice(0, 2);

  const annotations = [...topHighlyEngagedUsers].map((node) => ({
    note: {
      label: `Highly Engaged Metrics: ${
        attr === "connections"
          ? node.connections.length
          : attr === "duration"
          ? node.check_in_duration
          : node.check_in_frequency
      }`,
      title: `User ID ${node.id} Meet 75th percentile check-in frequency\nand duration thresholds(285 & 5279.62)`,
      wrap: 300,
      padding: 5,
      bgPadding: 10,
    },
    x: node.x,
    y: node.y,
    dy: node.y,
    dx: node.x,
    color: ["#E7E7E7"],
  }));

  const makeAnnotations = d3
    .annotation()
    .editMode(true)
    .notePadding(15)
    .type(d3.annotationCallout)
    .accessors({
      x: (d) => d.x,
      y: (d) => d.y,
    })
    .annotations(annotations);

  graph
    .append("g")
    .attr("class", "annotation-scene1-2")
    .style("fill", "white")
    .style("width", "150px")
    .call(makeAnnotations);

  d3.selectAll(".annotation-note-title").style("font-size", "14px");
  d3.selectAll(".annotation-note-label").style("font-size", "14px");

  simulation.nodes(filteredNodes);
  simulation.force("link").links(filteredLinks);
  simulation.alpha(0.05).restart();
}

/**
 * Calculates the peak check-in times for a user based on the provided check-in dates and hours.
 * @param {Array<string>} checkInTimes - An array of check-in timestamps
 * @returns {Array<number>} An array of hours (0-23) representing the peak check-in times
 */
function calculatePeakCheckInTimes(checkInTimes) {
  //check-in times by hours counter
  const hourCounts = Array(24).fill(0);
  checkInTimes.forEach((time) => {
    const date = new Date(time);
    const hour = date.getHours();
    hourCounts[hour]++;
  });

  const maxCount = Math.max(...hourCounts);
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter((d) => d.count === maxCount)
    .map((d) => d.hour);

  return peakHours;
}

/**
 * Displays a line chart for a clicked user node to see the user's check in dates and times with peak hour as annotation
 * @param {*} event - Clicks a node
 * @param {*} d - allNodes data
 */
function handleNodeDetails(event, d) {
  const sceneText =
    "<p><b>Node Details</b> <br/>This time/date line chart illustrate an user's check-in activity. The chart highlights the times and dates when the user is most frequently checking in, showing trends and changes over unique date periods. This scene3 helps identify when users are most actively engaging with the application, providing valuable demographic insights for targeted data analysis. By examining these patterns, stakeholders can better understand user behavior and optimize strategies to increase engagement during peak activity times.</p>";
  changeSceneText(sceneText);

  clearTimeout(timeoutId);
  // Clears any existing timeout to prevent premature hiding

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
    .style("fill", "white")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg
    .append("text")
    .attr("x", width / 2 + 10)
    .attr("y", height + 60)
    .attr("class", "line-chart-title")
    .attr("id", "scene3")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("border", "1px")
    .style("text-decoration", "underline")
    .style("fill", "gray")
    .text("Check-in Time and Date");

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
    .style("fill", "#DC5F00")
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip
        .html(`Date: ${d.date}<br>Time: ${d3.timeFormat("%H:%M:%S")(d.time)}`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    });

  const type = d3.annotationCallout;
  const peakHours = calculatePeakCheckInTimes(d.check_in_time);
  const annotations = peakHours.map((hour) => ({
    note: { label: `Peak Hour: ${hour}:00`, title: `User ID: ${d.id}` },
    wrap: 200,
    x: x(new Date(`2023-01-01T${hour}:00:00`)),
    y: y(parseTime(`${hour}:00:00`)),
    dy: -130 + hour,
    dx: 30 + hour,
    color: ["white"],
  }));

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

  svg.append("g").attr("class", "annotation-scene3").call(makeAnnotations);
}

/**
 * Creates a collision force for the simulation to prevent nodes from overlapping
 * Credit for this function goes to online resource - https://observablehq.com/@d3/clustered-bubbles 
 * @returns {d3.ForceCollide} A d3 force that adds collision detection to nodes
 */
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

/**
 * Updates and displays scene description each time a user clicks between scene1, scene2, and scene3
 * @param {string} text - A scene description text
 */
function changeSceneText(text) {
  const sceneDesc = document.getElementById("scene-desc");
  sceneDesc.innerHTML = text;
}

/**
 *  Calculate the average distance between nodes within a given cluster. 
 *  This average distance is used as a measure of the cluster's density
 * @param {*} cluster - allNodes
 * @returns {number} - total distance within the clustered group
 */
function calculateClusterDensity(cluster) {
  let totalDistance = 0;
  let count = 0;
  console.log("cluster", cluster)
  for (let i = 0; i < cluster.length; i++) {
    for (let j = i + 1; j < cluster.length; j++) {
      const distance = Math.sqrt(
        Math.pow(cluster[i].x - cluster[j].x, 2) +
          Math.pow(cluster[i].y - cluster[j].y, 2)
      );
      totalDistance += distance;
      count++;
    }
  }

  return count === 0 ? 0 : totalDistance / count;
}

/**
 * Cluster into different groups based on the given attributes.
 * 
 * @param {string} attribute -  connections, duration, and frequency
 */
function clusterNodes(attribute) {
  clearAnnotations("scene1");
  clearAnnotations("scene1-2");
  if (attribute === "connections") {
    const sceneText =
      "<p><b>Clustering nodes based on connections</b> <br/> Group users by the number of social interactions they have. Users with many connections are placed together, highlighting the most socially active individuals within the network. This method helps identify key influencers and hubs in the social graph, showcasing those who play a pivotal role in the overall connectivity of the network.</p>";
    changeSceneText(sceneText);
    clearAnnotations("scene2");
  } else if (attribute === "duration") {
    const sceneText =
      "<p><b>Clustering nodes based on duration</b> <br/> Group users by the total time they spend using the application. This approach brings together users who are highly engaged and spend long hours on the platform. By focusing on duration, this clustering method reveals patterns of user engagement and helps identify loyal users who might benefit from targeted engagement strategies.</p>";
    changeSceneText(sceneText);
    clearAnnotations("scene2");
  } else {
    const sceneText =
      "<p><b>Clustering nodes based on the frequency</b> <br/> Group users by how often they interact with the application. Users with high check-in frequency are clustered together, highlighting those who regularly use the platform. This method helps identify highly active users who frequently engage with the application, providing insights into user habits and preferences for more effective user retention strategies.</p>";
    changeSceneText(sceneText);
    clearAnnotations("scene2");
  }

  const clusters = {}; // stores x and y coordinates for each cluster
  const colors = ["#371610", "#88281A", "#EC4931", "#BDACA9"]; // assign 4 groups color clusters
  const colorScale = d3.scaleOrdinal(colors);

  const attributeRange = {
    connections: { min: 1, max: 64 },
    duration: { min: 0, max: 9684.83 },
    frequency: { min: 1, max: 2025 },
  };
  const { min, max } = attributeRange[attribute];

  allNodes.forEach((node) => {
    let key;
    if (attribute === "frequency") {
      //Calculate the cluster key based on normalized to the (0-3) range
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

    //In a force-directed graph, nodes are often initially placed at 
    // random positions within SVG container (1200x700) before the force simulation starts
    if (!clusters[key]) {
      clusters[key] = { x: Math.random() * 1200, y: Math.random() * 700 };
    }
  
    node.cluster = key;
    node.color = colorScale(key);
  });

  clusteredNodes = [...allNodes];

  const clusterGroups = d3.group(allNodes, (d) => d.cluster);

  const svgWidth = svg.attr("width");
  const svgHeight = svg.attr("height");
  const cornerPositions = [
    { x: 400, y: 50, dx: 50, dy: 0 },
    { x: svgWidth - 400, y: 50, dx: -50, dy: 0 },
    { x: 400, y: svgHeight - 50, dx: 50, dy: -0 },
    { x: svgWidth - 400, y: svgHeight - 50, dx: -50, dy: -0 },
  ];
  //create annotation with density and default text
  const annotations = Array.from(clusterGroups).map(([key, nodes], index) => {
    const density = calculateClusterDensity(nodes);
    const { x, y, dx, dy } = cornerPositions[index];
    return {
      note: {
        label: `Density: ${density.toFixed(2)}`,
        title: `Cluster ${key + 1}`,
        wrap: 200,
        padding: 20,
        bgPadding: 5,
      },
      x,
      y,
      dy,
      dx,
    };
  });

  annotations.push({
    note: {
      label:
        "Analyzing cluster density helps Gowalla APP understand the intensity of user interactions, identify key influencers, detect communities, and tailor engagement strategies effectively.",
      title: "Cluster Density Insights",
      wrap: 500,
      padding: 20,
      bgPadding: 5,
    },
    x: svgWidth - 120,
    y: svgHeight + 250,
    dx: -50,
    dy: 0,
    color: ["white"],
  });

  const makeAnnotations = d3
    .annotation()
    .editMode(true)
    .notePadding(15)
    .annotations(annotations);

  graph
    .append("g")
    .attr("class", "annotation-scene2")
    .style("fill", "white")
    .style("width", "150px")
    .call(makeAnnotations);

  const forceX = d3.forceX((d) => clusters[d.cluster].x).strength(0.5);
  const forceY = d3.forceY((d) => clusters[d.cluster].y).strength(0.5);

  simulation
    .force("x", forceX)
    .force("y", forceY)
    .force("collide", forceCollide())
    .alpha(0.5)
    .restart();

  // Scale node radius based on normalized attribute value
  user_node
    .attr("fill", (d) => d.color)
    .attr("r", (d) => {
      if (attribute === "frequency") {
        return 5 + ((d.check_in_frequency - min) / (max - min)) * 20;
      } else if (attribute === "duration") {
        return 5 + ((d.check_in_duration - min) / (max - min)) * 10;
      } else if (attribute === "connections") {
        return 5 + ((d.connections.length - min) / (max - min)) * 15;
      }
      return 5;
    });

  d3.select(".links").remove(); // Only want to show nodes, not links
}
