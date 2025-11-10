'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { EventResponse, TimelineViewport } from '@/types';

interface TimelineProps {
  events: EventResponse[];
  onEventClick?: (event: EventResponse) => void;
}

// Time unit labels in logarithmic order
const TIME_UNITS = [
  { label: 'M years', seconds: 1e6 * 31536000 },
  { label: 'centuries', seconds: 100 * 31536000 },
  { label: 'years', seconds: 31536000 },
  { label: 'months', seconds: 31536000 / 12 },
  { label: 'days', seconds: 86400 },
  { label: 'hours', seconds: 3600 },
  { label: 'secs', seconds: 1 },
];

const Timeline: React.FC<TimelineProps> = ({ events, onEventClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ y: 0, k: 1 });
  const [currentTime, setCurrentTime] = useState(new Date());

  const START_TIME = 0; // Big Bang
  const END_TIME = 435457000000000000; // Now

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

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Render timeline
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Layout: left side for D3 timeline only, right side for everything else
    const timelineWidth = dimensions.width * 0.3;
    const rightWidth = dimensions.width * 0.7;
    const height = dimensions.height;

    const margin = { top: 20, right: 0, bottom: 20, left: 20 };
    const timelineHeight = height - margin.top - margin.bottom;

    // ===== TIMELINE (LEFT SIDE) =====
    const timelineG = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Y scale: top = now (end), bottom = big bang (start)
    const yScale = d3
      .scaleLinear()
      .domain([END_TIME, START_TIME])
      .range([0, timelineHeight]);

    // Draw main timeline line
    timelineG.append('line')
      .attr('x1', timelineWidth / 2)
      .attr('x2', timelineWidth / 2)
      .attr('y1', 0)
      .attr('y2', timelineHeight)
      .attr('stroke', 'var(--timeline-line)')
      .attr('stroke-width', 2);

    // Calculate which time units to show based on zoom level
    const visibleRange = (END_TIME - START_TIME) / transform.k;
    const centerSeconds = END_TIME - (transform.y / timelineHeight) * visibleRange;

    // Draw time unit labels with logarithmic spacing
    const markerG = timelineG.append('g').attr('class', 'markers');

    TIME_UNITS.forEach((unit) => {
      const pixelsPerUnit = (unit.seconds / visibleRange) * timelineHeight;
      // Only show labels if they're spaced at least 40px apart
      if (pixelsPerUnit > 40) {
        // Find grid positions for this unit
        const startUnit = Math.floor(centerSeconds / unit.seconds) - 10;
        const endUnit = startUnit + Math.ceil((visibleRange / unit.seconds) * 2);

        for (let i = startUnit; i <= endUnit; i++) {
          const seconds = i * unit.seconds;
          const y = yScale(seconds);

          // Only draw if visible
          if (y >= 0 && y <= timelineHeight) {
            // Draw tick
            markerG.append('line')
              .attr('x1', timelineWidth / 2 - 8)
              .attr('x2', timelineWidth / 2 + 8)
              .attr('y1', y)
              .attr('y2', y)
              .attr('stroke', 'var(--timeline-line)')
              .attr('stroke-width', 1)
              .attr('opacity', 0.5);

            // Draw label
            markerG.append('text')
              .attr('x', timelineWidth / 2 - 12)
              .attr('y', y + 4)
              .attr('text-anchor', 'end')
              .attr('fill', 'var(--timeline-fg)')
              .attr('font-size', '10px')
              .attr('opacity', 0.7)
              .text(unit.label);
          }
        }
      }
    });

    // Draw event markers (circles that stay same size)
    const eventMarkers = markerG
      .selectAll('.event-marker')
      .data(events)
      .enter()
      .append('circle')
      .attr('class', 'event-marker')
      .attr('cx', timelineWidth / 2)
      .attr('cy', (d) => yScale(parseFloat(d.timeline_seconds)))
      .attr('r', 5)
      .attr('fill', 'var(--timeline-event)')
      .attr('stroke', 'var(--timeline-bg)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (onEventClick) onEventClick(d);
      });

    // ===== RIGHT SIDE: INFO PANEL =====
    const rightG = svg
      .append('g')
      .attr('transform', `translate(${timelineWidth},${margin.top})`);

    // Background for right panel
    rightG.append('rect')
      .attr('width', rightWidth)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'var(--timeline-bg)')
      .attr('stroke', 'var(--timeline-line)')
      .attr('stroke-width', 1);

    // Time labels at top
    const nowDate = currentTime.toISOString().split('T')[0] + ' ' + currentTime.toISOString().split('T')[1].slice(0, 8) + ' GMT';
    rightG.append('text')
      .attr('x', rightWidth / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--timeline-fg)')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text(`Now: ${nowDate}`);

    rightG.append('text')
      .attr('x', rightWidth / 2)
      .attr('y', height - margin.top - margin.bottom - 20)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--timeline-fg)')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Big Bang');

    // Event display area - consolidate events that share same y position
    const eventDisplayG = rightG.append('g')
      .attr('transform', `translate(0, 60)`);

    // Group events by consolidated y position (with threshold to avoid overlap)
    const eventYScale = d3
      .scaleLinear()
      .domain([END_TIME, START_TIME])
      .range([0, timelineHeight - 100]);

    const minPixelGap = 25;
    const consolidatedEvents: Array<EventResponse[]> = [];
    const sortedEvents = [...events].sort((a, b) => parseFloat(b.timeline_seconds) - parseFloat(a.timeline_seconds));

    sortedEvents.forEach((event) => {
      const y = eventYScale(parseFloat(event.timeline_seconds));
      let placed = false;

      for (const group of consolidatedEvents) {
        const groupY = eventYScale(parseFloat(group[0].timeline_seconds));
        if (Math.abs(y - groupY) < minPixelGap) {
          group.push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        consolidatedEvents.push([event]);
      }
    });

    // Draw consolidated event items
    consolidatedEvents.forEach((eventGroup) => {
      const y = eventYScale(parseFloat(eventGroup[0].timeline_seconds));

      // Draw line connecting to marker
      eventDisplayG.append('line')
        .attr('x1', -10)
        .attr('x2', -20)
        .attr('y1', y)
        .attr('y2', y)
        .attr('stroke', 'var(--timeline-line)')
        .attr('stroke-width', 1);

      // Draw event title (only one line per consolidated group)
      const displayEvent = eventGroup[0];
      eventDisplayG.append('text')
        .attr('x', -25)
        .attr('y', y + 4)
        .attr('text-anchor', 'end')
        .attr('fill', 'var(--timeline-fg)')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .text(displayEvent.title.length > 25 ? displayEvent.title.substring(0, 22) + '...' : displayEvent.title)
        .style('cursor', 'pointer')
        .on('click', () => {
          if (onEventClick) onEventClick(displayEvent);
        });

      // If group has multiple events, show count
      if (eventGroup.length > 1) {
        eventDisplayG.append('text')
          .attr('x', -25)
          .attr('y', y + 16)
          .attr('text-anchor', 'end')
          .attr('fill', 'var(--timeline-fg)')
          .attr('font-size', '9px')
          .attr('opacity', 0.6)
          .text(`+${eventGroup.length - 1} more`);
      }
    });

    // Add zoom/pan behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 1000])
      .on('zoom', (event) => {
        const newTransform = event.transform;
        setTransform({ y: newTransform.y, k: newTransform.k });

        // Update markers with semantic zoom
        eventMarkers
          .attr('cx', timelineWidth / 2)
          .attr('cy', (d) => {
            const baseY = yScale(parseFloat(d.timeline_seconds));
            return baseY * newTransform.k + newTransform.y;
          });

        // Redraw time units (this happens in the next render)
      });

    svg.call(zoom);

  }, [dimensions, events, onEventClick, transform, currentTime]);

  return (
    <div ref={containerRef} className="timeline-container" style={{ width: '100%', height: '100%' }}>
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
