/**
 * D3.js v7 Force Simulation Co-occurrence Network Visualization
 * Supporting Single-Click (Highlight Neighbor Nodes) and Double-Click (Open Comments Popup Modal)
 */

export function renderNetworkGraph(containerId, networkData, onNodeSingleClick, onNodeDoubleClick) {
  const container = document.getElementById(containerId);
  if (!container) return;

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

  const d3 = window.d3;
  if (!d3) {
    container.innerHTML = `<div class="p-4 text-red-400">D3.js 라이브러리가 로드되지 않았습니다.</div>`;
    return;
  }

  const svg = d3.select(`#${containerId}`)
    .append('svg')
    .attr('id', 'network-svg')
    .attr('viewBox', [0, 0, width, height]);

  const g = svg.append('g');

  // Zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.2, 5])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);

  // Background SVG click resets highlights
  svg.on('click', (event) => {
    if (event.target.tagName === 'svg' || event.target.id === 'network-svg') {
      resetHighlights();
    }
  });

  const maxCount = d3.max(nodes, d => d.count) || 1;
  const maxLinkValue = d3.max(links, d => d.value) || 1;

  const rScale = d3.scaleSqrt().domain([1, maxCount]).range([14, 34]);
  const strokeScale = d3.scaleLinear().domain([1, maxLinkValue]).range([1.5, 7]);
  const colorScale = d3.scaleSequential().domain([1, maxCount]).interpolator(d3.interpolateBlues);

  // D3 Force Simulation
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(110))
    .force('charge', d3.forceManyBody().strength(-260))
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
    .attr('stroke-width', d => strokeScale(d.value))
    .style('transition', 'opacity 0.2s ease, stroke 0.2s ease');

  // Render Node Groups
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'net-node')
    .style('cursor', 'pointer')
    .call(drag(simulation, d3));

  // Node Circles
  const circles = node.append('circle')
    .attr('r', d => rScale(d.count))
    .attr('fill', d => d.count === maxCount ? '#3b82f6' : colorScale(d.count))
    .attr('stroke', d => d.count === maxCount ? '#60a5fa' : '#1e293b')
    .attr('stroke-width', d => d.count === maxCount ? 3 : 1.5)
    .style('transition', 'opacity 0.2s ease, transform 0.2s ease');

  // Node Labels
  const labels = node.append('text')
    .text(d => d.id)
    .attr('dy', d => rScale(d.count) + 14)
    .attr('fill', '#f1f5f9')
    .style('font-size', '12px')
    .style('font-weight', '600')
    .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)')
    .style('transition', 'opacity 0.2s ease');

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

  // Single Click vs Double Click handling
  let clickTimer = null;
  let selectedNodeId = null;

  node.on('mouseover', (event, d) => {
    tooltip.html(`<strong>${d.id}</strong> (출현 빈도: ${d.count}회)<br><span class="text-xs text-blue-300">💡 1회 클릭: 연관 노드 강조 | 2회 연속 클릭: 댓글 팝업 보기</span>`)
      .style('visibility', 'visible');
  })
  .on('mousemove', (event) => {
    tooltip.style('top', (event.pageY - 40) + 'px')
      .style('left', (event.pageX + 12) + 'px');
  })
  .on('mouseout', () => {
    tooltip.style('visibility', 'hidden');
  })
  .on('click', (event, d) => {
    event.stopPropagation();
    
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      // Double Click Event Triggered
      tooltip.style('visibility', 'hidden');
      if (onNodeDoubleClick) onNodeDoubleClick(d.id);
    } else {
      clickTimer = setTimeout(() => {
        clickTimer = null;
        // Single Click Event Triggered: Toggle Highlight Neighbor Nodes
        if (selectedNodeId === d.id) {
          resetHighlights();
        } else {
          highlightNeighbors(d);
        }
        if (onNodeSingleClick) onNodeSingleClick(d.id);
      }, 250);
    }
  });

  function highlightNeighbors(targetNode) {
    selectedNodeId = targetNode.id;

    // Collect connected node IDs
    const connectedNodeIds = new Set([targetNode.id]);
    links.forEach(l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      if (sId === targetNode.id) connectedNodeIds.add(tId);
      if (tId === targetNode.id) connectedNodeIds.add(sId);
    });

    // Dim non-connected nodes
    node.style('opacity', d => connectedNodeIds.has(d.id) ? 1 : 0.15);
    circles.attr('stroke', d => d.id === targetNode.id ? '#fbbf24' : (connectedNodeIds.has(d.id) ? '#60a5fa' : '#1e293b'))
      .attr('stroke-width', d => d.id === targetNode.id ? 4 : 2);

    // Dim non-connected links
    link.style('opacity', l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      return (sId === targetNode.id || tId === targetNode.id) ? 1 : 0.08;
    }).attr('stroke', l => {
      const sId = typeof l.source === 'object' ? l.source.id : l.source;
      const tId = typeof l.target === 'object' ? l.target.id : l.target;
      return (sId === targetNode.id || tId === targetNode.id) ? '#60a5fa' : '#475569';
    });
  }

  function resetHighlights() {
    selectedNodeId = null;
    node.style('opacity', 1);
    circles.attr('stroke', d => d.count === maxCount ? '#60a5fa' : '#1e293b')
      .attr('stroke-width', d => d.count === maxCount ? 3 : 1.5);
    link.style('opacity', 0.6).attr('stroke', '#475569');
  }

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
