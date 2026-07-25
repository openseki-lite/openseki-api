'use client';

import { useEffect, useId, useState } from 'react';

export const arkThemes = ['ark', 'endfield', 'exa', 'popucom', 'corporate'] as const;
export type ArkTheme = (typeof arkThemes)[number];

export const arkThemeProfiles: Record<ArkTheme, { brand: string; code: string; status: string }> = {
  ark: { brand: 'TERRA INDEX', code: 'OPERATION / 07', status: 'SHIFT ACTIVE' },
  endfield: { brand: 'FIELD RELAY', code: 'LOGISTICS / 04', status: 'ROUTE VERIFIED' },
  exa: { brand: 'WIND ATLAS', code: 'JOURNEY / 03', status: 'RECORD ALIGNED' },
  popucom: { brand: 'PRISM PLAZA', code: 'PARTY ROOM / 204', status: '2 OF 4 READY' },
  corporate: { brand: 'STUDIO INDEX', code: 'PROJECTS / 05', status: 'PORTFOLIO OPEN' },
};

export const arkDepths = [
  { value: 'minimal', level: 1, label: 'Minimal' },
  { value: 'moderate', level: 2, label: 'Moderate' },
  { value: 'complex', level: 3, label: 'Complex' },
  { value: 'maximal', level: 4, label: 'Maximal' },
] as const;
export type ArkDepth = (typeof arkDepths)[number]['value'];

export interface NavItem {
  id: string;
  label: string;
}

interface ArkShellProps {
  brand?: string;
  code?: string;
  status?: string;
  theme?: ArkTheme;
  depth?: ArkDepth;
  nav?: NavItem[];
  activeId?: string;
  onNavigate?: (id: string) => void;
  children: React.ReactNode;
}

export function ArkShell({
  brand,
  code,
  status,
  theme = 'endfield',
  depth = 'moderate',
  nav = [],
  activeId,
  onNavigate,
  children,
}: ArkShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = arkThemeProfiles[theme] || arkThemeProfiles.endfield;

  useEffect(() => setMenuOpen(false), [activeId]);

  return (
    <div className="arkR-shell" data-ark-theme={theme} data-ark-depth={depth}>
      <header className="arkR-topbar">
        <div className="arkR-brand">
          <span className="arkR-brandMark" aria-hidden="true" />
          <span>
            <strong>{brand || profile.brand}</strong>
            <small>{code || profile.code}</small>
          </span>
        </div>
        <span className="arkR-online">
          <i aria-hidden="true" /> {status || profile.status}
        </span>
        <button
          className="arkR-menu"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="arkR-rail"
          onClick={() => setMenuOpen((value) => !value)}
        >
          Menu
        </button>
      </header>
      <nav className="arkR-rail" id="arkR-rail" data-open={menuOpen} aria-label="Primary">
        {nav.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={item.id === activeId ? 'is-active' : undefined}
            aria-current={item.id === activeId ? 'page' : undefined}
            onClick={() => onNavigate?.(item.id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <main className="arkR-main">{children}</main>
    </div>
  );
}

interface ArkSectionTitleProps {
  index?: string;
  kicker: string;
  children: React.ReactNode;
}

export function ArkSectionTitle({ index = '01', kicker, children }: ArkSectionTitleProps) {
  return (
    <header className="arkR-sectionTitle">
      <p>{kicker} / {index}</p>
      <h2>{children}</h2>
      <span aria-hidden="true" />
    </header>
  );
}

interface ArkPanelProps {
  code: string;
  title: string;
  tone?: 'paper' | 'ink';
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function ArkPanel({ code, title, tone = 'paper', children, action, className = '' }: ArkPanelProps) {
  return (
    <article className={`arkR-panel ${className}`.trim()} data-tone={tone}>
      <p className="arkR-code">{code}</p>
      <h3>{title}</h3>
      <div className="arkR-panelBody">{children}</div>
      {action}
    </article>
  );
}

interface ArkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
}

export function ArkButton({ primary = false, className = '', ...props }: ArkButtonProps) {
  return (
    <button
      className={`arkR-button ${primary ? 'is-primary' : ''} ${className}`.trim()}
      {...props}
    />
  );
}

interface ArkThemePickerProps {
  value: ArkTheme;
  onChange?: (theme: ArkTheme) => void;
}

export function ArkThemePicker({ value, onChange }: ArkThemePickerProps) {
  return (
    <div className="arkR-themePicker" role="group" aria-label="Visual family">
      {arkThemes.map((theme) => (
        <button
          key={theme}
          type="button"
          aria-pressed={value === theme}
          onClick={() => onChange?.(theme)}
        >
          {theme}
        </button>
      ))}
    </div>
  );
}

interface ArkDepthPickerProps {
  value: ArkDepth;
  onChange?: (depth: ArkDepth) => void;
}

export function ArkDepthPicker({ value, onChange }: ArkDepthPickerProps) {
  return (
    <div className="arkR-depthPicker" role="group" aria-label="Application depth">
      {arkDepths.map((depth) => (
        <button
          key={depth.value}
          type="button"
          aria-pressed={value === depth.value}
          onClick={() => onChange?.(depth.value)}
        >
          {depth.level} / {depth.label}
        </button>
      ))}
    </div>
  );
}

interface ArkTabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface ArkTabsProps {
  items?: ArkTabItem[];
  label?: string;
}

export function ArkTabs({ items = [], label = 'Details' }: ArkTabsProps) {
  const baseId = useId();
  const [selected, setSelected] = useState(items[0]?.id);

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    setSelected(items[next].id);
    document.getElementById(`${baseId}-tab-${items[next].id}`)?.focus();
  }

  return (
    <div className="arkR-tabs">
      <div className="arkR-tabList" role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.id}
            id={`${baseId}-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={selected === item.id}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={selected === item.id ? 0 : -1}
            onClick={() => setSelected(item.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {String(index + 1).padStart(2, '0')} / {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <section
          key={item.id}
          id={`${baseId}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={selected !== item.id}
        >
          {item.content}
        </section>
      ))}
    </div>
  );
}
