import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Bus } from '../types';
import { getServiceStatus } from '../lib/utils';
import { Calendar, AlertTriangle, Clock, ShieldCheck, Info } from 'lucide-react';

interface MaintenanceRoadmapChartProps {
  buses: Bus[];
}

interface TimelineItem {
  id: string;
  regNumber: string;
  model: string;
  nextServiceDue: string;
  lastServiceDate: string;
  status: 'Good' | 'Due' | 'Overdue';
  diffDays: number;
  assignedRoute?: string;
  capacity?: number;
}

export const MaintenanceRoadmapChart: React.FC<MaintenanceRoadmapChartProps> = ({ buses }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredBus, setHoveredBus] = useState<TimelineItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!svgRef.current || !buses || buses.length === 0) return;

    // 1. Prepare data & timeline boundaries
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const data: TimelineItem[] = buses
      .map((bus) => {
        const nextDue = bus.nextServiceDue ? new Date(bus.nextServiceDue) : null;
        let diffDays = 999;
        if (nextDue) {
          nextDue.setHours(0, 0, 0, 0);
          const diffTime = nextDue.getTime() - today.getTime();
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        return {
          id: bus.id,
          regNumber: bus.regNumber,
          model: bus.model || 'Standard',
          nextServiceDue: bus.nextServiceDue || 'N/A',
          lastServiceDate: bus.lastServiceDate || 'N/A',
          status: getServiceStatus(bus.nextServiceDue || ''),
          diffDays,
          assignedRoute: bus.routeAssigned || 'None',
          capacity: bus.capacity || 40,
        };
      })
      // Sort so that most urgent are evaluated/placed with priority
      .sort((a, b) => a.diffDays - b.diffDays);

    // Filter to those that are relevant for the next 30 days roadmap
    // Let's include Overdue (diffDays < 0) as well as those due in the next 30 days.
    // Buses with diffDays > 30 will be grouped on the right boundary side of the chart.
    const roadmapBuses = data.map(item => {
      // Constrain days for scale placement
      let displayDays = item.diffDays;
      if (item.diffDays < -5) {
        // cap overdue to -5 for visualization grouping
        displayDays = -5;
      } else if (item.diffDays > 35) {
        // cap safe to 35 for safe-grouping
        displayDays = 35;
      }
      return {
        ...item,
        displayDays
      };
    });

    // 2. Setup D3 Canvas Dimensions
    const margin = { top: 30, right: 40, bottom: 40, left: 40 };
    const containerWidth = containerRef.current?.getBoundingClientRect().width || 800;
    const width = containerWidth - margin.left - margin.right;
    const height = 90; // Compact, clean design

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // 3. Create scales
    // X-axis scale: Timeline from -5 days (overdue) to 35 days
    const xScale = d3.scaleLinear()
      .domain([-5, 35])
      .range([0, width]);

    // Compute vertical stacking (Y positions) to prevent overlap of nodes
    // We group items by their exact displayDays and assign unique vertical slots
    const slotMap: { [day: number]: number } = {};
    const processedData = roadmapBuses.map(d => {
      const day = d.displayDays;
      if (slotMap[day] === undefined) {
        slotMap[day] = 0;
      } else {
        slotMap[day] += 1;
      }
      return {
        ...d,
        ySlot: slotMap[day]
      };
    });

    const maxYSlot = d3.max(processedData, d => d.ySlot) || 0;
    // Y-axis scale map based on max stacking slot
    const yScale = d3.scaleLinear()
      .domain([-0.5, Math.max(maxYSlot + 1, 3)]) // Ensure at least some vertical span
      .range([height, 10]);

    // Draw main container group
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 4. Draw grid lines & background lanes
    // Highlight Overdue Zone (Left of Day 0)
    g.append('rect')
      .attr('x', xScale(-5))
      .attr('y', 0)
      .attr('width', xScale(0) - xScale(-5))
      .attr('height', height)
      .attr('class', 'fill-rose-500/5 dark:fill-rose-500/10')
      .attr('rx', 4);

    // Highlight Next 14 Days Critical Window
    g.append('rect')
      .attr('x', xScale(0))
      .attr('y', 0)
      .attr('width', xScale(14) - xScale(0))
      .attr('height', height)
      .attr('class', 'fill-amber-500/5 dark:fill-amber-500/10')
      .attr('rx', 4);

    // Draw horizontal lane markers
    const gridTicks = [-5, 0, 5, 10, 15, 20, 25, 30, 35];
    g.selectAll('.grid-line')
      .data(gridTicks)
      .enter()
      .append('line')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('class', 'stroke-slate-200 dark:stroke-neutral-800')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', d => d === 0 ? 'none' : '3,3');

    // 5. Draw Axes & Labels
    // Draw Today Line Indicator
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', -10)
      .attr('y2', height + 5)
      .attr('class', 'stroke-rose-500')
      .attr('stroke-width', 2);

    g.append('text')
      .attr('x', xScale(0))
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-rose-500 font-mono text-[9px] font-bold tracking-wider uppercase')
      .text('TODAY');

    // Draw bottom scale texts
    g.selectAll('.axis-label')
      .data(gridTicks)
      .enter()
      .append('text')
      .attr('x', d => xScale(d))
      .attr('y', height + 20)
      .attr('text-anchor', 'middle')
      .attr('class', (d) => {
        if (d < 0) return 'fill-rose-500 font-mono text-[10px] font-bold';
        if (d <= 14) return 'fill-amber-500 font-mono text-[10px] font-bold';
        return 'fill-slate-500 dark:fill-neutral-400 font-mono text-[10px]';
      })
      .text(d => {
        if (d === -5) return 'Overdue';
        if (d === 0) return 'Day 0';
        if (d === 35) return '35d+';
        return `Day ${d}`;
      });

    // 6. Plot Bus nodes (Interactive visual markers)
    const nodeGroup = g.selectAll('.bus-node')
      .data(processedData)
      .enter()
      .append('g')
      .attr('class', 'bus-node cursor-pointer')
      .on('mouseover', function (event, d: any) {
        // Highlight active node
        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', 11)
          .attr('stroke-width', 3)
          .attr('class', 'stroke-violet-500 dark:stroke-violet-400');
        
        d3.select(this).select('text')
          .transition()
          .duration(150)
          .attr('y', (item: any) => yScale(item.ySlot) - 16)
          .attr('class', 'fill-violet-600 dark:fill-violet-400 font-bold text-[10px] font-mono opacity-100');

        // Show tooltips
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx, y: my });
        setHoveredBus(d);
      })
      .on('mousemove', function (event) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx + 15, y: my - 15 });
      })
      .on('mouseleave', function (event, d: any) {
        // Revert node highlight
        const colorClass = d.status === 'Overdue' 
          ? 'fill-rose-500 stroke-rose-200 dark:stroke-rose-950' 
          : d.status === 'Due' 
          ? 'fill-amber-500 stroke-amber-200 dark:stroke-amber-950' 
          : 'fill-emerald-500 stroke-emerald-200 dark:stroke-emerald-950';

        d3.select(this).select('circle')
          .transition()
          .duration(150)
          .attr('r', 8)
          .attr('stroke-width', 2)
          .attr('class', `${colorClass}`);

        d3.select(this).select('text')
          .transition()
          .duration(150)
          .attr('y', (item: any) => yScale(item.ySlot) - 12)
          .attr('class', 'fill-slate-600 dark:fill-neutral-300 text-[9px] font-mono opacity-0');

        setHoveredBus(null);
      });

    // Draw circles representing vehicles
    nodeGroup.append('circle')
      .attr('cx', d => xScale(d.displayDays))
      .attr('cy', d => yScale(d.ySlot))
      .attr('r', 0) // start at 0 for animation transition
      .attr('class', d => {
        if (d.status === 'Overdue') return 'fill-rose-500 stroke-rose-200 dark:stroke-rose-950';
        if (d.status === 'Due') return 'fill-amber-500 stroke-amber-200 dark:stroke-amber-950';
        return 'fill-emerald-500 stroke-emerald-200 dark:stroke-emerald-950';
      })
      .attr('stroke-width', 2)
      .transition()
      .duration(600)
      .delay((_, i) => i * 30)
      .attr('r', 8);

    // Draw abbreviated Bus registration texts above the nodes (only visible on hover)
    nodeGroup.append('text')
      .attr('x', d => xScale(d.displayDays))
      .attr('y', d => yScale(d.ySlot) - 12)
      .attr('text-anchor', 'middle')
      .attr('class', 'fill-slate-600 dark:fill-neutral-300 text-[9px] font-mono opacity-0')
      .text(d => d.regNumber.split(' ').pop() || '');

  }, [buses]);

  // Compute stats for context cards
  const overdueBuses = buses.filter(b => getServiceStatus(b.nextServiceDue || '') === 'Overdue');
  const dueBuses = buses.filter(b => getServiceStatus(b.nextServiceDue || '') === 'Due');
  const healthyBuses = buses.filter(b => b.nextServiceDue && getServiceStatus(b.nextServiceDue) === 'Good');

  return (
    <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Chart Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-neutral-800">
        <div className="flex items-center space-x-2.5">
          <Calendar className="w-4 h-4 text-violet-500" />
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">
              Next 30 Days Maintenance Roadmap
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono">
              Real-time schedule of vehicle fitness and service deadlines
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 text-[10px] font-mono">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-600 dark:text-neutral-400">Overdue ({overdueBuses.length})</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-600 dark:text-neutral-400">Due within 14d ({dueBuses.length})</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-neutral-400">Compliant ({healthyBuses.length})</span>
          </span>
        </div>
      </div>

      {/* D3 Visual Section */}
      <div ref={containerRef} className="relative w-full overflow-x-auto select-none py-1">
        <div className="min-w-[640px]">
          <svg 
            ref={svgRef} 
            className="w-full h-[140px]" 
          />
        </div>

        {/* Floating Tooltip Card */}
        {hoveredBus && (
          <div 
            className="absolute z-20 w-52 bg-white dark:bg-neutral-900/95 border border-slate-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl space-y-2 pointer-events-none transition-all duration-75 text-xs font-sans animate-in fade-in zoom-in-95"
            style={{ 
              left: `${tooltipPos.x}px`, 
              top: `${tooltipPos.y}px` 
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-1.5">
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {hoveredBus.regNumber}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                hoveredBus.status === 'Overdue' 
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' 
                  : hoveredBus.status === 'Due' 
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600' 
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
              }`}>
                {hoveredBus.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <div>
                <span className="text-slate-400 block">Model</span>
                <span className="text-slate-800 dark:text-neutral-200 font-sans truncate block">{hoveredBus.model}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Days Left</span>
                <span className={`font-bold block ${
                  hoveredBus.diffDays < 0 ? 'text-rose-600' : hoveredBus.diffDays <= 14 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {hoveredBus.diffDays < 0 ? `${Math.abs(hoveredBus.diffDays)}d overdue` : `${hoveredBus.diffDays} days`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Last Serviced</span>
                <span className="text-slate-700 dark:text-neutral-300 block">{hoveredBus.lastServiceDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Next Due</span>
                <span className="text-slate-700 dark:text-neutral-300 block">{hoveredBus.nextServiceDue}</span>
              </div>
            </div>

            {hoveredBus.assignedRoute && hoveredBus.assignedRoute !== 'None' && (
              <div className="pt-1.5 border-t border-slate-100 dark:border-neutral-800 text-[9px] text-slate-500 dark:text-neutral-400">
                <span className="font-bold">Active Route:</span> {hoveredBus.assignedRoute}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
