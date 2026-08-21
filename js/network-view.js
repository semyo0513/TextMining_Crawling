/**
 * D3.js v7 Force Simulation Co-occurrence Network Visualization
 */

export function renderNetworkGraph(containerId, networkData, onNodeClick) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear previous contents
  container.innerHTML = '';

  const { nodes, links } = networkData;

  if (!nodes || nodes.length === 0) {
    container.innerHTML = `
      <div class="flex items-center justify-center h-full text-slate-400 font-medium">
        <i class="fas fa-project-diagram mr-2"></i> 동시출현 연관어 데이터가 충분하지 않습니다.
      </div>`;
    return;
  }

  const width = container.clientWidth || 800;
  const height = 550;

  // Create SVG element
  const d3 = window.d3;
  if (!d3) {
    container.innerHTML = `<div class="p-4 text-red-400">D3.js 라이브러리가 로드되지 않았습니다.</div>`;
    return;
  }

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('id', 'network-svg')
    .attr('viewBox', [0, 0, width, height]);

  // Main group for Zooming/Panning
  const g = svg.append('g');

  // Zoom behavior setup
  const zoom = d3.zoom()
    .scaleExtent([0.2, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Maximum value for scaling
  const maxCount = d3.max(nodes, d => d.count) || 1;
  const maxLinkValue = d3.max(links, d => d.value) || 1;

  // Node radius scale
  const rScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([12, 32]);

  // Edge stroke-width scale
  const strokeScale = d3.scaleLinear()
    .domain([1, maxLinkValue])
    .range([1.5, 7]);

  // Color scale for nodes
  const colorScale = d3.scaleSequential()
    .domain([1, maxCount])
    .interpolator(d3.interpolateBlues);

  // D3 Force Simulation setup
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-240))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide(d => rScale(d.count) + 12));

  // Render Edges (Links)
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'net-link')
    .attr('stroke', '#475569')
    .attr('stroke-width', d => strokeScale(d.value));

  // Render Node Groups
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'net-node')
    .call(drag(simulation, d3));

  // Node Circles
  node.append('circle')
    .attr('r', d => rScale(d.count))
    .attr('fill', d => d.count === maxCount ? '#3b82f6' : colorScale(d.count))
    .attr('stroke', d => d.count === maxCount ? '#60a5fa' : '#1e293b')
    .attr('stroke-width', d => d.count === maxCount ? 3 : 1.5)
    .style('filter', d => d.count === maxCount ? 'drop-shadow(0 0 8px rgba(59,130,246,0.8))' : 'none');

  // Node Labels
  node.append('text')
    .text(d => d.id)
    .attr('dy', d => rScale(d.count) + 14)
    .attr('fill', '#f1f5f9')
    .style('font-size', '12px')
    .style('font-weight', '600')
    .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)');

  // Tooltip
  const tooltip = d3.select('body').append('div')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background', '#1e293b')
    .style('color', '#f8fafc')
    .style('padding', '6px 12px')
    .style('border-radius', '6px')
    .style('font-size', '12px')
    .style('border', '1px solid #475569')
    .style('pointer-events', 'none')
    .style('z-index', '9999');

  node.on('mouseover', (event, d) => {
    tooltip.html(`<strong>${d.id}</strong> (출현 빈도: ${d.count}회)`)
      .style('visibility', 'visible');
  })
  .on('mousemove', (event) => {
    tooltip.style('top', (event.pageY - 35) + 'px')
      .style('left', (event.pageX + 10) + 'px');
  })
  .on('mouseout', () => {
    tooltip.style('visibility', 'hidden');
  })
  .on('click', (event, d) => {
    tooltip.style('visibility', 'hidden');
    if (onNodeClick) onNodeClick(d.id);
  });

  link.on('mouseover', (event, d) => {
    tooltip.html(`동시출현: <strong>${d.source.id} - ${d.target.id}</strong> (${d.value}회)`)
      .style('visibility', 'visible');
  })
  .on('mousemove', (event) => {
    tooltip.style('top', (event.pageY - 35) + 'px')
      .style('left', (event.pageX + 10) + 'px');
  })
  .on('mouseout', () => {
    tooltip.style('visibility', 'hidden');
  });

  // Ticker for simulation position update
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    node
      .attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

function drag(simulation, d3) {
  function dragstarted(event) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}
