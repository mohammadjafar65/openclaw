import React from 'react';
import { Tag } from '@carbon/react';

const PRIORITY_CONFIG = {
  hot:          { type: 'red',       label: 'Hot' },
  warm:         { type: 'warm-gray', label: 'Warm' },
  cold:         { type: 'blue',      label: 'Cold' },
  disqualified: { type: 'gray',      label: 'DQ' },
};

const AUDIT_CONFIG = {
  none:     { type: 'red',       label: 'No Website' },
  outdated: { type: 'magenta',   label: 'Outdated' },
  average:  { type: 'warm-gray', label: 'Average' },
  strong:   { type: 'green',     label: 'Strong' },
};

export function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.cold;
  return <Tag type={cfg.type} size="sm">{cfg.label}</Tag>;
}

export function AuditBadge({ classification }) {
  const cfg = AUDIT_CONFIG[classification] || { type: 'gray', label: classification || '—' };
  return <Tag type={cfg.type} size="sm">{cfg.label}</Tag>;
}

export function ScoreBadge({ score }) {
  let type = 'gray';
  if (score >= 75) type = 'green';
  else if (score >= 50) type = 'teal';
  else if (score >= 25) type = 'warm-gray';
  else type = 'red';

  return <Tag type={type} size="sm">{score ?? '—'}</Tag>;
}
