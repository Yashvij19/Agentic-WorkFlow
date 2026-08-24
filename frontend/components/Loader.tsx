// frontend/components/Loader.tsx
'use client';

import React from 'react';

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .book-loader {
          --background: linear-gradient(135deg, #8B5CF6, #6366F1);
          --shadow: rgba(139, 92, 246, 0.35);
          --text: #A78BFA;
          --page: rgba(255, 255, 255, 0.4);
          --page-fold: rgba(255, 255, 255, 0.65);
          --duration: 3s;
          width: 130px;
          height: 90px;
          position: relative;
        }

        .book-loader:before, .book-loader:after {
          --r: -6deg;
          content: "";
          position: absolute;
          bottom: 6px;
          width: 78px;
          top: 80%;
          box-shadow: 0 12px 14px var(--shadow);
          transform: rotate(var(--r));
        }

        .book-loader:before {
          left: 3px;
        }

        .book-loader:after {
          --r: 6deg;
          right: 3px;
        }

        .book-loader div.loader-box {
          width: 100%;
          height: 100%;
          border-radius: 10px;
          position: relative;
          z-index: 1;
          perspective: 600px;
          box-shadow: 0 6px 16px var(--shadow);
          background-image: var(--background);
        }

        .book-loader div.loader-box ul {
          margin: 0;
          padding: 0;
          list-style: none;
          position: relative;
        }

        .book-loader div.loader-box ul li {
          --r: 180deg;
          --o: 0;
          --c: var(--page);
          position: absolute;
          top: 8px;
          left: 8px;
          transform-origin: 100% 50%;
          color: var(--c);
          opacity: var(--o);
          transform: rotateY(var(--r));
          animation: book-page var(--duration) ease infinite;
        }

        .book-loader div.loader-box ul li:nth-child(2) {
          --c: var(--page-fold);
          animation-name: page-2;
        }

        .book-loader div.loader-box ul li:nth-child(3) {
          --c: var(--page-fold);
          animation-name: page-3;
        }

        .book-loader div.loader-box ul li:nth-child(4) {
          --c: var(--page-fold);
          animation-name: page-4;
        }

        .book-loader div.loader-box ul li:nth-child(5) {
          --c: var(--page-fold);
          animation-name: page-5;
        }

        .book-loader div.loader-box ul li svg {
          width: 58px;
          height: 76px;
          display: block;
        }

        .book-loader div.loader-box ul li:first-child {
          --r: 0deg;
          --o: 1;
        }

        .book-loader div.loader-box ul li:last-child {
          --o: 1;
        }

        .book-loader span.loader-text {
          display: block;
          text-align: center;
          color: var(--text);
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.05em;
          margin-top: 14px;
          text-transform: uppercase;
        }

        @keyframes book-page {
          0% {
            transform: rotateY(180deg);
            opacity: 0;
          }
          10%, 90% {
            opacity: 1;
          }
          100% {
            transform: rotateY(0deg);
            opacity: 0;
          }
        }

        @keyframes page-2 {
          0% {
            transform: rotateY(180deg);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          35%, 100% {
            opacity: 0;
          }
          50%, 100% {
            transform: rotateY(0deg);
          }
        }

        @keyframes page-3 {
          15% {
            transform: rotateY(180deg);
            opacity: 0;
          }
          35% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
          65%, 100% {
            transform: rotateY(0deg);
          }
        }

        @keyframes page-4 {
          30% {
            transform: rotateY(180deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          65%, 100% {
            opacity: 0;
          }
          80%, 100% {
            transform: rotateY(0deg);
          }
        }

        @keyframes page-5 {
          45% {
            transform: rotateY(180deg);
            opacity: 0;
          }
          65% {
            opacity: 1;
          }
          80%, 100% {
            opacity: 0;
          }
          95%, 100% {
            transform: rotateY(0deg);
          }
        }
      `,
        }}
      />
      <div className="book-loader">
        <div className="loader-box">
          <ul>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i}>
                <svg fill="currentColor" viewBox="0 0 90 120">
                  <path d="M90,0 L90,120 L11,120 C4.92486775,120 0,115.075132 0,109 L0,11 C0,4.92486775 4.92486775,0 11,0 L90,0 Z M71.5,81 L18.5,81 C17.1192881,81 16,82.1192881 16,83.5 C16,84.8254834 17.0315359,85.9100387 18.3356243,85.9946823 L18.5,86 L71.5,86 C72.8807119,86 74,84.8807119 74,83.5 C74,82.1745166 72.9684641,81.0899613 71.6643757,81.0053177 L71.5,81 Z M71.5,57 L18.5,57 C17.1192881,57 16,58.1192881 16,59.5 C16,60.8254834 17.0315359,61.9100387 18.3356243,61.9946823 L18.5,62 L71.5,62 C72.8807119,62 74,60.8807119 74,59.5 C74,58.1192881 72.8807119,57 71.5,57 Z M71.5,33 L18.5,33 C17.1192881,33 16,34.1192881 16,35.5 C16,36.8254834 17.0315359,37.9100387 18.3356243,37.9946823 L18.5,38 L71.5,38 C72.8807119,38 74,36.8807119 74,35.5 C74,34.1192881 72.8807119,33 71.5,33 Z" />
                </svg>
              </li>
            ))}
          </ul>
        </div>
        <span className="loader-text">Ingesting & Indexing...</span>
      </div>
    </div>
  );
}
