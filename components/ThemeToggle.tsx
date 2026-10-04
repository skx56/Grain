'use client'

import { useTheme } from '@/context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <>
      <style>{`
        .theme-switch {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
          flex-shrink: 0;
        }
        .theme-switch #theme-input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .theme-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #2196f3;
          transition: 0.4s;
          z-index: 0;
          overflow: hidden;
          border-radius: 28px;
        }
        .theme-sun-moon {
          position: absolute;
          height: 20px;
          width: 20px;
          left: 4px;
          bottom: 4px;
          background-color: yellow;
          transition: 0.4s;
          border-radius: 50%;
          z-index: 2;
        }
        #theme-input:checked + .theme-slider {
          background-color: #111;
        }
        #theme-input:checked + .theme-slider .theme-sun-moon {
          transform: translateX(24px);
          background-color: white;
          animation: rotate-center 0.6s ease-in-out both;
        }
        @keyframes rotate-center {
          0%   { transform: translateX(24px) rotate(0); }
          100% { transform: translateX(24px) rotate(360deg); }
        }
        .theme-moon-dot {
          opacity: 0;
          transition: 0.4s;
          fill: gray;
          position: absolute;
          border-radius: 50%;
          background: gray;
        }
        #theme-input:checked + .theme-slider .theme-sun-moon .theme-moon-dot {
          opacity: 1;
        }
        #theme-moon-dot-1 { left: 7px; top: 2px; width: 5px; height: 5px; }
        #theme-moon-dot-2 { left: 1px; top: 8px; width: 8px; height: 8px; }
        #theme-moon-dot-3 { left: 12px; top: 14px; width: 3px; height: 3px; }

        .theme-stars {
          transform: translateY(-28px);
          opacity: 0;
          transition: 0.4s;
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
        }
        .theme-star {
          fill: white;
          position: absolute;
          transition: 0.4s;
          animation: star-twinkle 2s infinite;
        }
        #theme-input:checked + .theme-slider .theme-stars {
          transform: translateY(0);
          opacity: 1;
        }
        #theme-star-1 { width: 14px; top: 2px; left: 3px; animation-delay: 0.3s; }
        #theme-star-2 { width: 5px; top: 14px; left: 3px; }
        #theme-star-3 { width: 9px; top: 16px; left: 8px; animation-delay: 0.6s; }
        @keyframes star-twinkle {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.2); }
          80%  { transform: scale(0.8); }
          100% { transform: scale(1); }
        }
        .theme-cloud {
          position: absolute;
          animation: cloud-move 6s infinite;
        }
        .theme-cloud-light { fill: #eee; }
        .theme-cloud-dark  { fill: #ccc; animation-delay: 1s; }
        @keyframes cloud-move {
          0%   { transform: translateX(0); }
          40%  { transform: translateX(3px); }
          80%  { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
      `}</style>

      <label className="theme-switch" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
        <input
          id="theme-input"
          type="checkbox"
          checked={isDark}
          onChange={toggle}
        />
        <span className="theme-slider">
          {/* Clouds (visible in light mode) */}
          <svg className="theme-cloud theme-cloud-light" id="theme-cloud-1" style={{ left: 24, top: 10, width: 28 }} viewBox="0 0 40 20">
            <ellipse cx="20" cy="14" rx="18" ry="8" />
            <ellipse cx="14" cy="10" rx="10" ry="8" />
            <ellipse cx="26" cy="10" rx="10" ry="8" />
          </svg>
          <svg className="theme-cloud theme-cloud-dark" id="theme-cloud-2" style={{ left: 30, top: 6, width: 16 }} viewBox="0 0 40 20">
            <ellipse cx="20" cy="14" rx="18" ry="8" />
            <ellipse cx="14" cy="10" rx="10" ry="8" />
          </svg>

          {/* Stars (visible in dark mode) */}
          <svg className="theme-stars" viewBox="0 0 52 28" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            <polygon id="theme-star-1" className="theme-star" points="7,2 8.5,6 13,6 9.5,8.5 11,13 7,10 3,13 4.5,8.5 1,6 5.5,6" style={{ width: 14, position: 'absolute', top: 2, left: 3 }} />
            <circle id="theme-star-2" className="theme-star" cx="4" cy="20" r="2.5" />
            <circle id="theme-star-3" className="theme-star" cx="11" cy="22" r="4" />
          </svg>

          {/* Sun / Moon ball */}
          <span className="theme-sun-moon">
            <span className="theme-moon-dot" id="theme-moon-dot-1" />
            <span className="theme-moon-dot" id="theme-moon-dot-2" />
            <span className="theme-moon-dot" id="theme-moon-dot-3" />
          </span>
        </span>
      </label>
    </>
  )
}
