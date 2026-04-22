import React from 'react';

const Svg = ({ d, children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children || (Array.isArray(d)
      ? d.map((pd, i) => <path key={i} d={pd}/>)
      : <path d={d}/>)}
  </svg>
);

export const IconPlus         = p => <Svg d="M12 5v14M5 12h14" {...p}/>;
export const IconX            = p => <Svg d="M18 6L6 18M6 6l12 12" {...p}/>;
export const IconEdit         = p => <Svg d={["M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7","M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"]} {...p}/>;
export const IconTrash        = p => <Svg d={["M3 6h18","M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"]} {...p}/>;
export const IconRefresh      = p => <Svg d={["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"]} {...p}/>;
export const IconChevronLeft  = p => <Svg d="M15 18l-6-6 6-6" {...p}/>;
export const IconChevronRight = p => <Svg d="M9 18l6-6-6-6" {...p}/>;
export const IconChevronDown  = p => <Svg d="M6 9l6 6 6-6" {...p}/>;
export const IconFilter       = p => <Svg d="M22 3H2l8 9.46V19l4 2v-8.54L22 3" {...p}/>;
export const IconSearch       = p => <Svg d={["M11 19a8 8 0 100-16 8 8 0 000 16z","M21 21l-4.35-4.35"]} {...p}/>;
export const IconTrendUp      = p => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);
export const IconTrendDown    = p => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
    <polyline points="17 18 23 18 23 12"/>
  </svg>
);
export const IconMail         = p => <Svg d={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"]} {...p}/>;
export const IconUser         = p => <Svg d={["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2","M12 11a4 4 0 100-8 4 4 0 000 8z"]} {...p}/>;
export const IconStar         = p => <Svg d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" {...p}/>;