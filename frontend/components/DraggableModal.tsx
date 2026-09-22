"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';

export interface DraggableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  allowMaximize?: boolean;
  closeOnClickOutside?: boolean;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  customHeader?: React.ReactNode | ((props: { isMaximized: boolean; toggleMaximize: () => void; onClose: () => void }) => React.ReactNode);
}

export default function DraggableModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  headerActions,
  children,
  footer,
  defaultWidth = 960,
  defaultHeight,
  minWidth = 380,
  minHeight = 260,
  allowMaximize = true,
  closeOnClickOutside = false,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  customHeader,
}: DraggableModalProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight || 700 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const prevBoundsRef = useRef<{ position: { x: number; y: number }; size: { width: number; height: number } } | null>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize position and size when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const calcW = Math.max(minWidth, Math.min(defaultWidth, window.innerWidth - 32));
      const targetH = defaultHeight || Math.round(window.innerHeight * 0.88);
      const calcH = Math.max(minHeight, Math.min(targetH, window.innerHeight - 32));
      const calcX = Math.max(16, Math.round((window.innerWidth - calcW) / 2));
      const calcY = Math.max(16, Math.round((window.innerHeight - calcH) / 2));

      setPosition({ x: calcX, y: calcY });
      setSize({ width: calcW, height: calcH });
      setIsMaximized(false);
    }
  }, [isOpen, defaultWidth, defaultHeight, minWidth, minHeight]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle Maximize / Restore
  const toggleMaximize = useCallback(() => {
    if (!allowMaximize || typeof window === 'undefined') return;

    if (!isMaximized) {
      prevBoundsRef.current = { position, size };
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    } else {
      if (prevBoundsRef.current) {
        setPosition(prevBoundsRef.current.position);
        setSize(prevBoundsRef.current.size);
      }
      setIsMaximized(false);
    }
  }, [allowMaximize, isMaximized, position, size]);

  // Drag start (Mouse)
  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [data-no-drag]')) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  // Drag start (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMaximized || e.touches.length !== 1) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, [data-no-drag]')) {
      return;
    }
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  // Resize start (Mouse)
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: size.width,
      height: size.height,
    };
  };

  // Resize start (Touch)
  const handleTouchResizeStart = (e: React.TouchEvent) => {
    if (isMaximized || e.touches.length !== 1) return;
    e.stopPropagation();
    const touch = e.touches[0];
    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      width: size.width,
      height: size.height,
    };
  };

  // Mouse / Touch Move and Up Listeners
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (isDragging) {
        const deltaX = clientX - dragStartRef.current.mouseX;
        const deltaY = clientY - dragStartRef.current.mouseY;

        let newX = dragStartRef.current.posX + deltaX;
        let newY = dragStartRef.current.posY + deltaY;

        // Keep window partially inside viewport
        const maxX = window.innerWidth - 80;
        const minX = -(size.width - 80);
        const maxY = window.innerHeight - 50;
        const minY = 0;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));

        setPosition({ x: newX, y: newY });
      } else if (isResizing) {
        const deltaW = clientX - resizeStartRef.current.mouseX;
        const deltaH = clientY - resizeStartRef.current.mouseY;

        let newW = resizeStartRef.current.width + deltaW;
        let newH = resizeStartRef.current.height + deltaH;

        const maxW = window.innerWidth - position.x - 10;
        const maxH = window.innerHeight - position.y - 10;

        newW = Math.max(minWidth, Math.min(newW, maxW));
        newH = Math.max(minHeight, Math.min(newH, maxH));

        setSize({ width: newW, height: newH });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging, isResizing, size.width, position.x, position.y, minWidth, minHeight]);

  // Prevent text selection across the screen while dragging or resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'grabbing' : 'se-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, isResizing]);

  if (!isOpen || !mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeOnClickOutside ? onClose : undefined}
        className={`fixed inset-0 z-50 bg-black/45 backdrop-blur-xs transition-opacity ${
          isDragging || isResizing ? 'cursor-default select-none' : ''
        }`}
      />

      {/* Modal Window Container */}
      <div
        ref={modalRef}
        style={
          isMaximized
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 60,
                borderRadius: 0,
              }
            : {
                position: 'fixed',
                top: `${position.y}px`,
                left: `${position.x}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                zIndex: 60,
              }
        }
        className={`flex flex-col bg-white shadow-2xl border border-morning-300 overflow-hidden transition-shadow ${
          isMaximized ? 'rounded-none' : 'rounded-3xl'
        } ${isDragging ? 'shadow-sapphire-900/30 opacity-98' : ''} ${className}`}
      >
        {/* TOP BAR / DRAGGABLE HEADER */}
        {customHeader ? (
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleTouchStart}
            onDoubleClick={allowMaximize ? toggleMaximize : undefined}
            className={`flex-shrink-0 cursor-grab active:cursor-grabbing select-none ${headerClassName}`}
          >
            {typeof customHeader === 'function'
              ? customHeader({ isMaximized, toggleMaximize, onClose })
              : customHeader}
          </div>
        ) : (
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleTouchStart}
            onDoubleClick={allowMaximize ? toggleMaximize : undefined}
            className={`flex-shrink-0 px-5 py-3.5 bg-gradient-to-r from-morning-50 via-white to-morning-50 border-b border-morning-200 flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing select-none ${headerClassName}`}
            title="Trage de bară pentru a muta fereastra (Dublu-click pentru mărire)"
          >
            {/* Title & Icon & Badge */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-1 text-slate-400 hover:text-sapphire-600 transition flex items-center" title="Trage pentru a muta">
                <GripHorizontal className="w-4 h-4" />
              </div>

              {icon && <div className="flex-shrink-0">{icon}</div>}

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap">
                  {title && (
                    <div className="text-base sm:text-lg font-black text-sapphire-900 tracking-tight truncate">
                      {title}
                    </div>
                  )}
                  {badge && <div className="flex-shrink-0">{badge}</div>}
                </div>
                {subtitle && (
                  <div className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Header Actions & Controls */}
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              {headerActions}

              {allowMaximize && (
                <button
                  type="button"
                  onClick={toggleMaximize}
                  className="p-1.5 rounded-xl text-sage-500 hover:text-slate-800 hover:bg-morning-200 transition"
                  title={isMaximized ? 'Restaurează dimensiunea inițială' : 'Maximizează pe tot ecranul'}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-sage-500 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Închide fereastra (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* SCROLLABLE BODY */}
        <div className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>

        {/* OPTIONAL FOOTER */}
        {footer && (
          <div className="flex-shrink-0 border-t border-morning-200 bg-morning-50/70 p-4">
            {footer}
          </div>
        )}

        {/* RESIZE HANDLE (Bottom-Right Corner) */}
        {!isMaximized && (
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleTouchResizeStart}
            className="absolute bottom-0 right-0 w-7 h-7 cursor-se-resize flex items-end justify-end p-1 select-none z-30 group"
            title="Trage de colț pentru a redimensiona fereastra"
          >
            <svg
              className="w-4 h-4 text-slate-400 group-hover:text-sapphire-600 transition"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 15L15 21M21 9L9 21M21 3L3 21" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
}
