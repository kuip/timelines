'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { EventResponse, TimelineViewport } from '@/types';

interface TimelineProps {
  events: EventResponse[];
  onEventClick?: (event: EventResponse) => void;
}

const Timeline: React.FC<TimelineProps> = ({ events, onEventClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [viewport, setViewport] = useState<TimelineViewport>({
    range: { start: 0, end: 435457000000000000 }, // Big Bang to now
    zoom: 1,
    centerY: 0,
  });

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Render timeline
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 40, right: 60, bottom: 40, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scale for timeline (vertical)
    // Map timeline seconds to Y position (top = now, bottom = Big Bang)
    const yScale = d3
      .scaleLinear()
      .domain([viewport.range.end, viewport.range.start]) // Reversed: top is recent
      .range([0, height]);

    // Draw main timeline line
    g.append('line')
      .attr('x1', width / 2)
      .attr('x2', width / 2)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'var(--timeline-line)')
      .attr('stroke-width', 2);

    // Draw events
    const eventGroup = g
      .selectAll('.event')
      .data(events)
      .enter()
      .append('g')
      .attr('class', 'timeline-event')
      .attr('transform', (d) => {
        const seconds = parseFloat(d.timeline_seconds);
        const y = yScale(seconds);
        return `translate(${width / 2}, ${y})`;
      })
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onEventClick) onEventClick(d);
      });

    // Event markers (circles)
    eventGroup
      .append('circle')
      .attr('r', 6)
      .attr('fill', 'var(--timeline-event)')
      .attr('stroke', 'var(--timeline-bg)')
      .attr('stroke-width', 2);

    // Event labels (alternating left/right)
    eventGroup
      .append('text')
      .attr('x', (d, i) => (i % 2 === 0 ? -15 : 15))
      .attr('y', 4)
      .attr('text-anchor', (d, i) => (i % 2 === 0 ? 'end' : 'start'))
      .attr('fill', 'var(--timeline-fg)')
      .attr('font-size', '12px')
      .text((d) => d.title.substring(0, 30) + (d.title.length > 30 ? '...' : ''));

    // Time labels on the right
    eventGroup
      .append('text')
      .attr('x', (d, i) => (i % 2 === 0 ? -15 : 15))
      .attr('y', 18)
      .attr('text-anchor', (d, i) => (i % 2 === 0 ? 'end' : 'start'))
      .attr('fill', 'var(--timeline-fg)')
      .attr('font-size', '10px')
      .attr('opacity', 0.7)
      .text((d) => d.formatted_time);

    // Add "Now" indicator at top
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--timeline-fg)')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Now');

    // Add "Big Bang" indicator at bottom
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 30)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--timeline-fg)')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Big Bang');

    // Add zoom/pan behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 1000])
      .on('zoom', (event) => {
        const transform = event.transform;
        g.attr('transform', `translate(${margin.left},${margin.top + transform.y}) scale(1, ${transform.k})`);
      });

    svg.call(zoom);

  }, [dimensions, viewport, events, onEventClick]);

  return (
    <div ref={containerRef} className="timeline-container">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default Timeline;
