"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeTone?: 'emerald' | 'amber' | 'sapphire' | 'slate';
  keywords?: string;
  pinned?: boolean;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  pinnedFilterLabel?: string;
  required?: boolean;
  dropUp?: boolean;
  className?: string;
}

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function compactAlnum(text: string): string {
  return normalizeForSearch(text).replace(/[^a-z0-9]/g, '');
}

const BADGE_CLASSES: Record<NonNullable<ComboboxOption['badgeTone']>, string> = {
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  amber: 'bg-amber-100 text-amber-900 border-amber-300',
  sapphire: 'bg-sapphire-100 text-sapphire-700 border-sapphire-300',
  slate: 'bg-slate-100 text-slate-700 border-slate-300',
};

export default function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder = 'Caută sau selectează...',
  emptyText = 'Niciun rezultat găsit.',
  pinnedFilterLabel,
  required = false,
  dropUp = false,
  className = '',
}: SearchableComboboxProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [onlyPinned, setOnlyPinned] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    width: number;
    useDropUp: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePopoverPos = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;
    const width = Math.min(Math.max(rect.width, 260), vw - margin * 2);
    let left = rect.left;
    if (left + width > vw - margin) {
      left = Math.max(margin, rect.right - width);
    }
    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const useDropUp = dropUp || (spaceBelow < 240 && spaceAbove > spaceBelow);
    setPopoverPos({
      top: useDropUp ? rect.top - 6 : rect.bottom + 6,
      left,
      width,
      useDropUp,
    });
  }, [dropUp]);

  useEffect(() => {
    if (!isOpen) return;
    updatePopoverPos();
    const handleReposition = (e?: Event) => {
      if (e?.type === 'scroll' && popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) {
        return;
      }
      updatePopoverPos();
    };
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePopoverPos]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value],
  );

  const pinnedCount = useMemo(
    () => options.filter((opt) => opt.pinned).length,
    [options],
  );

  const filteredOptions = useMemo(() => {
    const base = onlyPinned ? options.filter((o) => o.pinned) : options;
    const rawQuery = normalizeForSearch(query);
    if (!rawQuery) return base;

    const tokens = rawQuery.split(/\s+/).filter(Boolean);
    const compactQuery = compactAlnum(rawQuery);

    return base.filter((opt) => {
      const haystackRaw = `${opt.label} ${opt.sublabel || ''} ${opt.badge || ''} ${opt.keywords || ''}`;
      const haystack = normalizeForSearch(haystackRaw);
      const haystackCompact = compactAlnum(haystackRaw);

      const allTokensMatch = tokens.every((tok) => {
        const tokCompact = tok.replace(/[^a-z0-9]/g, '');
        return haystack.includes(tok) || (tokCompact.length >= 2 && haystackCompact.includes(tokCompact));
      });
      if (allTokensMatch) return true;
      return compactQuery.length >= 2 && haystackCompact.includes(compactQuery);
    });
  }, [options, query, onlyPinned]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIdx(0);
  }, [query, onlyPinned, isOpen]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-idx="${highlightedIdx}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIdx, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setQuery('');
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setOnlyPinned(false);
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) => (filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        filteredOptions.length > 0 ? (prev - 1 + filteredOptions.length) % filteredOptions.length : 0,
      );
    } else if (e.key === 'Enter') {
      if (isOpen) {
        e.preventDefault();
        const chosen = filteredOptions[highlightedIdx] || filteredOptions[0];
        if (chosen) handleSelect(chosen.value);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  };

  const displayText = isOpen
    ? query
    : selectedOption
      ? `${selectedOption.label}${selectedOption.sublabel ? ` — ${selectedOption.sublabel}` : ''}`
      : '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Hidden input keeps native HTML `required` validation working inside <form> */}
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => {}}
          className="sr-only pointer-events-none"
        />
      )}

      <div
        onClick={() => {
          if (!isOpen) handleOpen();
          inputRef.current?.focus();
        }}
        className={`flex items-center w-full bg-white border rounded-xl transition cursor-text ${
          isOpen
            ? 'border-sapphire-500 ring-2 ring-sapphire-500/20'
            : 'border-morning-300 hover:border-sapphire-400'
        }`}
      >
        <Search className="w-4 h-4 text-sage-500 ml-3 shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={displayText}
          onFocus={handleOpen}
          onChange={(e) => {
            if (!isOpen) setIsOpen(true);
            setQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            isOpen && selectedOption
              ? `Caută altă opțiune (actual: ${selectedOption.label})...`
              : placeholder
          }
          className={`w-full px-2.5 py-2.5 bg-transparent text-xs outline-none truncate ${
            !isOpen && selectedOption ? 'font-bold text-sapphire-900' : 'font-semibold text-sapphire-900'
          }`}
          autoComplete="off"
        />

        {!isOpen && selectedOption?.badge && (
          <span
            className={`hidden sm:inline-flex px-2 py-0.5 mr-1 rounded-full text-[10px] font-extrabold border shrink-0 ${
              BADGE_CLASSES[selectedOption.badgeTone || 'slate']
            }`}
          >
            {selectedOption.badge}
          </span>
        )}

        {value && (
          <button
            type="button"
            onClick={handleClear}
            title="Șterge selecția / caută altul"
            className="p-1.5 text-sage-500 hover:text-rose-600 transition shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) {
              setIsOpen(false);
              setQuery('');
            } else {
              handleOpen();
              inputRef.current?.focus();
            }
          }}
          className="p-2 pr-2.5 text-sage-500 hover:text-sapphire-700 transition shrink-0"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {mounted &&
        isOpen &&
        popoverPos &&
        createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: popoverPos.useDropUp ? undefined : popoverPos.top,
            bottom: popoverPos.useDropUp ? window.innerHeight - popoverPos.top : undefined,
            left: popoverPos.left,
            width: popoverPos.width,
          }}
          className="z-[9999] bg-white border border-sapphire-300 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Quick filter bar */}
          <div className="px-2.5 py-1.5 bg-morning-100 border-b border-morning-200 flex items-center justify-between gap-2 text-[10px]">
            <span className="font-bold text-sage-700">
              {filteredOptions.length} / {options.length} rezultate
              {query.trim() ? ' • Enter pt. selecție rapidă' : ''}
            </span>

            {pinnedFilterLabel && pinnedCount > 0 && (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOnlyPinned(false)}
                  className={`px-2 py-0.5 rounded-md font-extrabold transition cursor-pointer ${
                    !onlyPinned
                      ? 'bg-sapphire-600 text-white'
                      : 'bg-white text-sage-700 border border-morning-300 hover:bg-morning-50'
                  }`}
                >
                  Toate ({options.length})
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setOnlyPinned(true)}
                  className={`px-2 py-0.5 rounded-md font-extrabold transition cursor-pointer ${
                    onlyPinned
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  {pinnedFilterLabel} ({pinnedCount})
                </button>
              </div>
            )}
          </div>

          <div ref={listRef} className="max-h-60 overflow-y-auto divide-y divide-morning-100">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-sage-700 font-semibold">{emptyText}</div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIdx;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    data-idx={idx}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/90'
                        : isHighlighted
                          ? 'bg-sapphire-50'
                          : 'bg-white hover:bg-morning-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        <span className="font-extrabold text-xs text-sapphire-900 truncate">{opt.label}</span>
                      </div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-sage-700 truncate">{opt.sublabel}</div>
                      )}
                    </div>

                    {opt.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${
                          BADGE_CLASSES[opt.badgeTone || 'slate']
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
