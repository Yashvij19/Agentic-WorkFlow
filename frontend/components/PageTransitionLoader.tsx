// frontend/components/PageTransitionLoader.tsx
'use client';

import React from 'react';

export function PageTransitionLoader({ text = 'FLOWAGENT' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none pointer-events-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .trace-bg {
          stroke: rgba(255, 255, 255, 0.08);
          stroke-width: 1.8;
          fill: none;
        }

        .trace-flow {
          stroke-width: 2;
          fill: none;
          stroke-dasharray: 40 400;
          stroke-dashoffset: 438;
          animation: circuitFlowAnim 2.8s cubic-bezier(0.5, 0, 0.9, 1) infinite;
        }

        .flow-purple {
          stroke: #A855F7;
          color: #A855F7;
          filter: drop-shadow(0 0 7px #A855F7);
        }
        .flow-blue {
          stroke: #38BDF8;
          color: #38BDF8;
          filter: drop-shadow(0 0 7px #38BDF8);
        }
        .flow-cyan {
          stroke: #06B6D4;
          color: #06B6D4;
          filter: drop-shadow(0 0 7px #06B6D4);
        }
        .flow-emerald {
          stroke: #10B981;
          color: #10B981;
          filter: drop-shadow(0 0 7px #10B981);
        }
        .flow-yellow {
          stroke: #FBBF24;
          color: #FBBF24;
          filter: drop-shadow(0 0 7px #FBBF24);
        }
        .flow-red {
          stroke: #F43F5E;
          color: #F43F5E;
          filter: drop-shadow(0 0 7px #F43F5E);
        }

        @keyframes circuitFlowAnim {
          to {
            stroke-dashoffset: 0;
          }
        }
      `,
        }}
      />

      <div className="w-full max-w-[340px] md:max-w-[440px] aspect-[800/500] relative">
        <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="ptChipGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E1B4B" />
              <stop offset="50%" stopColor="#0B0F24" />
              <stop offset="100%" stopColor="#030617" />
            </linearGradient>

            <linearGradient id="ptTextGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#A78BFA" />
            </linearGradient>

            <linearGradient id="ptPinGradient" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#312E81" />
            </linearGradient>
          </defs>

          {/* Circuit Traces */}
          <g id="traces">
            {/* Left Side */}
            <path d="M100 100 H200 V210 H326" className="trace-bg" />
            <path d="M100 100 H200 V210 H326" className="trace-flow flow-purple" />

            <path d="M80 180 H180 V230 H326" className="trace-bg" />
            <path d="M80 180 H180 V230 H326" className="trace-flow flow-blue" />

            <path d="M60 260 H150 V250 H326" className="trace-bg" />
            <path d="M60 260 H150 V250 H326" className="trace-flow flow-yellow" />

            <path d="M100 350 H200 V270 H326" className="trace-bg" />
            <path d="M100 350 H200 V270 H326" className="trace-flow flow-emerald" />

            {/* Right Side */}
            <path d="M700 90 H560 V210 H474" className="trace-bg" />
            <path d="M700 90 H560 V210 H474" className="trace-flow flow-blue" />

            <path d="M740 160 H580 V230 H474" className="trace-bg" />
            <path d="M740 160 H580 V230 H474" className="trace-flow flow-emerald" />

            <path d="M720 250 H590 V250 H474" className="trace-bg" />
            <path d="M720 250 H590 V250 H474" className="trace-flow flow-red" />

            <path d="M680 340 H570 V270 H474" className="trace-bg" />
            <path d="M680 340 H570 V270 H474" className="trace-flow flow-yellow" />
          </g>

          {/* Microchip Body */}
          <rect
            x={330}
            y={190}
            width={140}
            height={100}
            rx={18}
            ry={18}
            fill="url(#ptChipGradient)"
            stroke="rgba(139, 92, 246, 0.45)"
            strokeWidth={2}
          />

          {/* Left Pins */}
          <g>
            <rect x={322} y={205} width={8} height={10} fill="url(#ptPinGradient)" rx={2} />
            <rect x={322} y={225} width={8} height={10} fill="url(#ptPinGradient)" rx={2} />
            <rect x={322} y={245} width={8} height={10} fill="url(#ptPinGradient)" rx={2} />
            <rect x={322} y={265} width={8} height={10} fill="url(#ptPinGradient)" rx={2} />
          </g>

          {/* Right Pins */}
          <g>
            <rect x={470} y={205} width={8} height={10} fill="url(#ptPinGradient)" rx={2} />
            <rect x={470} y={225} width={8} height={10} fill="url(#ptPinGradient)" rx={2} />
            <rect x={470} y={245} width={8} height={10} fill="url(#ptPinGradient)" rx={2} />
            <rect x={470} y={265} width={8} height={10} fill="url(#ptPinGradient)" rx={2} />
          </g>

          {/* Microchip Label */}
          <text
            x={400}
            y={242}
            fontFamily="Inter, -apple-system, BlinkMacSystemFont, sans-serif"
            fontSize={15}
            fontWeight="bold"
            letterSpacing="2.5"
            fill="url(#ptTextGradient)"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {text}
          </text>

          {/* Terminal Dots */}
          <circle cx={100} cy={100} r={4.5} fill="#A855F7" opacity="0.9" />
          <circle cx={80} cy={180} r={4.5} fill="#38BDF8" opacity="0.9" />
          <circle cx={60} cy={260} r={4.5} fill="#FBBF24" opacity="0.9" />
          <circle cx={100} cy={350} r={4.5} fill="#10B981" opacity="0.9" />

          <circle cx={700} cy={90} r={4.5} fill="#38BDF8" opacity="0.9" />
          <circle cx={740} cy={160} r={4.5} fill="#10B981" opacity="0.9" />
          <circle cx={720} cy={250} r={4.5} fill="#F43F5E" opacity="0.9" />
          <circle cx={680} cy={340} r={4.5} fill="#FBBF24" opacity="0.9" />
        </svg>
      </div>
    </div>
  );
}

export default PageTransitionLoader;
