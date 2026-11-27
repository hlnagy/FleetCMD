"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface ParsedSelectOption {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
}

export interface FilterableSelectChangeEvent {
  target: { value: string; name?: string };
  currentTarget: { value: string; name?: string };
}

export interface FilterableSelectProps {
  value?: string | number | readonly string[];
  onChange?: (e: FilterableSelectChangeEvent) => void;
  children?: React.ReactNode;
  className?: string;
  name?: string;
  id?: string;
  title?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  minSearchOptions?: number;
  allowQuickClear?: boolean;
  minDropdownWidth?: number;
}

function normalizeForSearch(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function compactAlnum(text: string): string {
  return normalizeForSearch(text).replace(/[^a-z0-9]/g, '');
}

function flattenNodeText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenNodeText).join('');
  if (React.isValidElement(node)) {
    return flattenNodeText((node.props as { children?: React.ReactNode })?.children);
  }
  return '';
}

function extractOptionsFromChildren(
  children: React.ReactNode,
  currentGroup?: string,
  acc: ParsedSelectOption[] = [],
): ParsedSelectOption[] {
  React.Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (Array.isArray(child)) {
      extractOptionsFromChildren(child, currentGroup, acc);
      return;
    }
    if (!React.isValidElement(child)) return;

    const props = child.props as {
      value?: string | number;
      label?: string;
      disabled?: boolean;
      children?: React.ReactNode;
    };

    if (child.type === React.Fragment) {
      extractOptionsFromChildren(props.children, currentGroup, acc);
      return;
    }

    if (typeof child.type === 'string') {
      const tag = child.type.toLowerCase();
      if (tag === 'optgroup') {
        const grpLabel = String(props.label || '').trim();
        extractOptionsFromChildren(props.children, grpLabel || currentGroup, acc);
        return;
      }
      if (tag === 'option') {
        const label = flattenNodeText(props.children).replace(/\s+/g, ' ').trim();
        const val = props.value !== undefined && props.value !== null ? String(props.value) : label;
        acc.push({
          value: val,
          label: label || val,
          group: currentGroup,
          disabled: Boolean(props.disabled),
        });
        return;
      }
    }

    if (props?.children) {
      extractOptionsFromChildren(props.children, currentGroup, acc);
    }
  });
  return acc;
}

const CONTAINER_TOKEN_RE =
  /^(?:(?:sm|md|lg|xl|2xl):)?(?:w-|min-w-|max-w-|flex-|flex$|grow|shrink|basis-|col-span-|row-span-|self-|justify-self-|m-|mx-|my-|mt-|mb-|ml-|mr-|order-)/;

function splitContainerAndTriggerClasses(className: string): {
  containerClasses: string;
  triggerClasses: string;
} {
  const tokens = (className || '').trim().split(/\s+/).filter(Boolean);
  const container: string[] = [];
  const trigger: string[] = [];

  for (const tok of tokens) {
    if (CONTAINER_TOKEN_RE.test(tok)) {
      container.push(tok);
    } else {
      trigger.push(tok);
    }
  }

  // Ensure flex-1 containers can shrink cleanly without overflowing narrow toolbars
  if (container.some((c) => /(?:^|:)flex-(?:1|auto|initial)$/.test(c)) && !container.some((c) => /min-w-/.test(c))) {
    container.push('min-w-0');
  }

  return {
    containerClasses: container.join(' '),
    triggerClasses: trigger.join(' '),
  };
}

export default function FilterableSelect({
  value,
  onChange,
  children,
  className = '',
  name,
  id,
  title,
  placeholder = 'Selectează...',
  searchPlaceholder = 'Caută / filtrează...',
  emptyText = 'Niciun rezultat găsit.',
  required = false,
  disabled = false,
  minSearchOptions = 2,
  allowQuickClear = true,
  minDropdownWidth = 260,
}: FilterableSelectProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [internalValue, setInternalValue] = useState('');
  const isControlled = value !== undefined;
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number;
    left: number;
    width: number;
    dropUp: boolean;
    maxListHeight: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const options = useMemo(() => extractOptionsFromChildren(children), [children]);

  const stringValue = !isControlled
    ? internalValue
    : value === null
      ? ''
      : Array.isArray(value)
        ? String(value[0] ?? '')
        : String(value);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === stringValue) || null,
    [options, stringValue],
  );

  const emptyResetOption = useMemo(
    () => options.find((opt) => opt.value === '' && !opt.disabled) || null,
    [options],
  );

  const showSearch = options.length >= minSearchOptions;

  const filteredOptions = useMemo(() => {
    const rawQuery = normalizeForSearch(query);
    if (!rawQuery) return options;

    const tokens = rawQuery.split(/\s+/).filter(Boolean);
    const compactQuery = compactAlnum(rawQuery);

    return options.filter((opt) => {
      const haystackRaw = `${opt.label} ${opt.group || ''} ${opt.value}`;
      const haystack = normalizeForSearch(haystackRaw);
      const haystackCompact = compactAlnum(haystackRaw);

      const allTokensMatch = tokens.every((tok) => {
        const tokCompact = tok.replace(/[^a-z0-9]/g, '');
        return haystack.includes(tok) || (tokCompact.length >= 2 && haystackCompact.includes(tokCompact));
      });
      if (allTokensMatch) return true;
      return compactQuery.length >= 2 && haystackCompact.includes(compactQuery);
    });
  }, [options, query]);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 8;

    const desiredWidth = Math.min(Math.max(rect.width, minDropdownWidth), vw - margin * 2);
    let left = rect.left;
    if (left + desiredWidth > vw - margin) {
      left = Math.max(margin, rect.right - desiredWidth);
    }
    if (left < margin) left = margin;

    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const dropUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    const availableSpace = Math.max(140, (dropUp ? spaceAbove : spaceBelow) - 8);
    const headerReserve = showSearch ? 78 : 34;
    const maxListHeight = Math.min(272, Math.max(110, availableSpace - headerReserve));

    setPopoverStyle({
      top: dropUp ? rect.top - 6 : rect.bottom + 6,
      left,
      width: desiredWidth,
      dropUp,
      maxListHeight,
    });
  }, [minDropdownWidth, showSearch]);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleReposition = (e?: Event) => {
      if (e?.type === 'scroll' && popoverRef.current && e.target instanceof Node && popoverRef.current.contains(e.target)) {
        return;
      }
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setIsOpen(false);
        setQuery('');
        return;
      }
      updatePosition();
    };

    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && showSearch) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [isOpen, showSearch]);

  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      const selIdx = filteredOptions.findIndex((o) => o.value === stringValue && !o.disabled);
      setHighlightedIdx(selIdx >= 0 ? selIdx : 0);
    } else {
      const firstEnabled = filteredOptions.findIndex((o) => !o.disabled);
      setHighlightedIdx(firstEnabled >= 0 ? firstEnabled : 0);
    }
  }, [query, isOpen, filteredOptions, stringValue]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-fs-idx="${highlightedIdx}"]`) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIdx, isOpen]);

  const emitChange = useCallback(
    (nextVal: string) => {
      if (!isControlled) setInternalValue(nextVal);
      onChange?.({
        target: { value: nextVal, name },
        currentTarget: { value: nextVal, name },
      });
    },
    [isControlled, onChange, name],
  );

  const handleSelect = (opt: ParsedSelectOption) => {
    if (opt.disabled) return;
    emitChange(opt.value);
    setIsOpen(false);
    setQuery('');
    setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const moveHighlight = (delta: 1 | -1) => {
    if (filteredOptions.length === 0) return;
    let next = highlightedIdx;
    for (let i = 0; i < filteredOptions.length; i++) {
      next = (next + delta + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[next]?.disabled) {
        setHighlightedIdx(next);
        return;
      }
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setQuery(e.key);
      setIsOpen(true);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filteredOptions[highlightedIdx] || filteredOptions.find((o) => !o.disabled);
      if (chosen) handleSelect(chosen);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setQuery('');
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setQuery('');
    }
  };

  const { containerClasses, triggerClasses } = useMemo(
    () => splitContainerAndTriggerClasses(className),
    [className],
  );

  const canQuickClear =
    allowQuickClear &&
    !disabled &&
    !required &&
    Boolean(emptyResetOption) &&
    stringValue !== '';

  const displayLabel = selectedOption ? selectedOption.label : stringValue || placeholder;

  const groupedRenderList = useMemo(() => {
    const items: Array<{ type: 'group'; label: string } | { type: 'option'; opt: ParsedSelectOption; idx: number }> = [];
    let lastGroup: string | undefined = undefined;
    filteredOptions.forEach((opt, idx) => {
      if (opt.group && opt.group !== lastGroup) {
        items.push({ type: 'group', label: opt.group });
        lastGroup = opt.group;
      }
      items.push({ type: 'option', opt, idx });
    });
    return items;
  }, [filteredOptions]);

  return (
    <div className={`relative ${containerClasses || 'inline-block'}`}>
      {required && (
        <input
          type="text"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={stringValue}
          onChange={() => {}}
          className="sr-only pointer-events-none"
        />
      )}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        title={title || displayLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => {
            if (prev) setQuery('');
            return !prev;
          });
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full flex items-center justify-between gap-1.5 text-left transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          triggerClasses ||
          'bg-morning-100 border border-morning-200 rounded-xl px-3 py-2 text-xs text-sapphire-900 font-bold'
        } ${isOpen ? 'ring-2 ring-sapphire-500/25 border-sapphire-500' : ''}`}
      >
        <span className="truncate flex-1 min-w-0">{displayLabel}</span>

        <span className="flex items-center space-x-1 shrink-0">
          {canQuickClear && (
            <span
              role="button"
              tabIndex={-1}
              title={`Resetează (${emptyResetOption?.label || 'Toate'})`}
              onClick={(e) => {
                e.stopPropagation();
                emitChange('');
                setQuery('');
              }}
              className="p-0.5 rounded-md text-sage-500 hover:text-terracotta-600 hover:bg-morning-200/80 transition"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-sage-500 transition-transform shrink-0 ${isOpen ? 'rotate-180 text-sapphire-600' : ''}`}
          />
        </span>
      </button>

      {mounted &&
        isOpen &&
        popoverStyle &&
        createPortal(
          <div
            ref={popoverRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: popoverStyle.dropUp ? undefined : popoverStyle.top,
              bottom: popoverStyle.dropUp ? window.innerHeight - popoverStyle.top : undefined,
              left: popoverStyle.left,
              width: popoverStyle.width,
            }}
            className="z-[9999] bg-white border border-sapphire-300 rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            {showSearch && (
              <div className="p-2 bg-morning-100 border-b border-morning-200 space-y-1.5">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-sage-500 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    className="w-full bg-white border border-morning-300 focus:border-sapphire-500 focus:ring-2 focus:ring-sapphire-500/20 rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold text-sapphire-900 outline-none transition"
                  />
                  {query && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery('');
                        searchInputRef.current?.focus();
                      }}
                      title="Șterge filtrul"
                      className="absolute right-1.5 p-1 text-sage-500 hover:text-terracotta-600 transition cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between px-0.5 text-[10px] font-bold text-sage-600">
                  <span>
                    {filteredOptions.length} / {options.length} opțiuni
                  </span>
                  {query.trim() && <span>Enter = selectează</span>}
                </div>
              </div>
            )}

            <div
              ref={listRef}
              style={{ maxHeight: popoverStyle.maxListHeight }}
              className="overflow-y-auto divide-y divide-morning-100"
            >
              {groupedRenderList.length === 0 ? (
                <div className="p-4 text-center text-xs text-sage-600 font-semibold">{emptyText}</div>
              ) : (
                groupedRenderList.map((entry, gIdx) => {
                  if (entry.type === 'group') {
                    return (
                      <div
                        key={`grp-${entry.label}-${gIdx}`}
                        className="px-3 py-1 bg-morning-100 text-[10px] font-extrabold uppercase tracking-wider text-sage-700 sticky top-0 z-10"
                      >
                        {entry.label}
                      </div>
                    );
                  }
                  const { opt, idx } = entry;
                  const isSelected = opt.value === stringValue;
                  const isHighlighted = idx === highlightedIdx;
                  return (
                    <button
                      key={`${opt.value}-${idx}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={opt.disabled}
                      data-fs-idx={idx}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => {
                        if (!opt.disabled) setHighlightedIdx(idx);
                      }}
                      onClick={() => handleSelect(opt)}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition ${
                        opt.disabled
                          ? 'opacity-45 cursor-not-allowed bg-morning-50 text-sage-500'
                          : isSelected
                            ? 'bg-emerald-50 text-sapphire-900 font-extrabold cursor-pointer'
                            : isHighlighted
                              ? 'bg-sapphire-50 text-sapphire-900 font-bold cursor-pointer'
                              : 'bg-white hover:bg-morning-50 text-sapphire-900 font-medium cursor-pointer'
                      }`}
                    >
                      <span className="truncate flex-1">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
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
