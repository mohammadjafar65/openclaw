import React from 'react';
import { Tile } from '@carbon/react';
import { ArrowUp, ArrowDown } from '@carbon/icons-react';

/**
 * KPI metric card
 * @param {string} label  - Metric name
 * @param {string|number} value - Current value
 * @param {string} delta  - Change string e.g. "+12%"
 * @param {'up'|'down'} direction
 * @param {string} color  - Left border color override
 */
export default function KpiCard({ label, value, delta, direction, color }) {
  return (
    <Tile
      className="oc-kpi-card"
      style={color ? { borderLeftColor: color } : undefined}
    >
      <div className="oc-kpi-card__label">{label}</div>
      <div className="oc-kpi-card__value">{value ?? '—'}</div>
      {delta && (
        <div className={`oc-kpi-card__delta oc-kpi-card__delta--${direction || 'up'}`}>
          {direction === 'down' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
          {' '}{delta}
        </div>
      )}
    </Tile>
  );
}
