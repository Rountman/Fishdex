// Journal sections (masthead tabs), in display order. `?tab=` holds any but the first.
export const TABS = ['fish', 'current', 'furniture', 'timers'] as const;
export type Tab = typeof TABS[number];
