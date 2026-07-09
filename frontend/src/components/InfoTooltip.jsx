import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const TOOLTIP_WIDTH = 192; // matches w-48
const VIEWPORT_MARGIN = 8;

export default function InfoTooltip({ text, className = '' }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState(null);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const left = Math.min(
      Math.max(rect.right - TOOLTIP_WIDTH, VIEWPORT_MARGIN),
      window.innerWidth - TOOLTIP_WIDTH - VIEWPORT_MARGIN,
    );
    setStyle({ top: rect.bottom + 4, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (wrapperRef.current?.contains(e.target)) return;
      if (tooltipRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  if (!text) return null;

  return (
    <span ref={wrapperRef} className={`inline-flex ${className || 'relative'}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-label="Come misurare"
        className="w-4 h-4 shrink-0 flex items-center justify-center rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 text-[10px] font-bold leading-none hover:bg-teal-100 dark:hover:bg-teal-900 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
      >
        i
      </button>
      {open &&
        style &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            onClick={(e) => e.stopPropagation()}
            style={{ top: style.top, left: style.left, width: TOOLTIP_WIDTH }}
            className="fixed z-[60] rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-2 text-xs text-stone-600 dark:text-stone-300 shadow-lg"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
