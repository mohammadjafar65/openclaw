import React from 'react';
import { Search as SearchIcon } from '@carbon/icons-react';

export default function EmptyState({ icon: Icon = SearchIcon, title, description, action }) {
  return (
    <div className="oc-empty-state">
      <Icon size={80} />
      <h3>{title || 'No data yet'}</h3>
      <p style={{ maxWidth: 400, marginBottom: action ? '1.5rem' : 0 }}>
        {description || 'Data will appear here once available.'}
      </p>
      {action}
    </div>
  );
}
