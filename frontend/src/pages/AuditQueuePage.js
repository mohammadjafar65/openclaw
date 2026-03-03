import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tile,
  Button,
  Tag,
  InlineNotification,
  ProgressBar,
  Grid,
  Column,
} from '@carbon/react';
import { ChartBubblePacked, Play, Renew } from '@carbon/icons-react';
import api from '../services/api';
import KpiCard from '../components/shared/KpiCard';
import { AuditBadge } from '../components/shared/Badges';
import EmptyState from '../components/shared/EmptyState';

export default function AuditQueuePage() {
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => api.audit.stats(),
  });

  const { data: queue, isLoading } = useQuery({
    queryKey: ['audit-queue'],
    queryFn: () => api.audit.queue(),
    refetchInterval: 10000,
  });

  const auditMutation = useMutation({
    mutationFn: (leadId) => api.audit.run(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-queue'] });
      queryClient.invalidateQueries({ queryKey: ['audit-stats'] });
    },
  });

  const batchMutation = useMutation({
    mutationFn: (ids) => api.audit.batch(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-queue'] });
      queryClient.invalidateQueries({ queryKey: ['audit-stats'] });
    },
  });

  const queueLeads = queue?.leads || queue?.queue || [];
  const auditStats = stats?.stats || stats || {};

  return (
    <div>
      <div className="oc-page-header">
        <div>
          <h1>Audit Queue</h1>
          <p>AI-powered 12-factor website audit engine</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Renew}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['audit-queue'] })}
          >
            Refresh
          </Button>
          <Button
            kind="primary"
            size="sm"
            renderIcon={Play}
            disabled={batchMutation.isPending || queueLeads.length === 0}
            onClick={() => batchMutation.mutate(queueLeads.slice(0, 10).map(l => l.id))}
          >
            {batchMutation.isPending ? 'Auditing…' : `Audit Next ${Math.min(queueLeads.length, 10)}`}
          </Button>
        </div>
      </div>

      {/* Stats KPIs */}
      <div className="oc-kpi-grid">
        <KpiCard label="Total Audited" value={auditStats.total_audited || 0} color="#6929c4" />
        <KpiCard label="No Website" value={auditStats.no_website || 0} color="#da1e28" />
        <KpiCard label="Outdated" value={auditStats.outdated || 0} color="#ee5396" />
        <KpiCard label="Average" value={auditStats.average || 0} color="#8d8d8d" />
        <KpiCard label="Strong" value={auditStats.strong || 0} color="#24a148" />
        <KpiCard label="Pending" value={queueLeads.length} color="#4589ff" />
      </div>

      {batchMutation.isPending && (
        <ProgressBar label="Running batch audit…" style={{ marginBottom: '1rem' }} />
      )}

      {batchMutation.isError && (
        <InlineNotification
          kind="error"
          subtitle={batchMutation.error?.message}
          lowContrast
          style={{ marginBottom: '1rem' }}
        />
      )}

      {batchMutation.isSuccess && (
        <InlineNotification
          kind="success"
          subtitle="Batch audit completed successfully"
          lowContrast
          style={{ marginBottom: '1rem' }}
        />
      )}

      {/* Queue List */}
      <Tile style={{ padding: '1.5rem' }}>
        <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>
          <ChartBubblePacked size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Leads Pending Audit ({queueLeads.length})
        </h4>

        {queueLeads.length === 0 ? (
          <EmptyState
            icon={ChartBubblePacked}
            title="All caught up!"
            description="All leads with websites have been audited. New leads will appear here automatically."
          />
        ) : (
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {queueLeads.map((lead) => (
              <div
                key={lead.id}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid var(--cds-border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    {lead.business_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                    {lead.website_url || lead.maps_website || '—'} · {lead.category}
                  </div>
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={ChartBubblePacked}
                  onClick={() => auditMutation.mutate(lead.id)}
                  disabled={auditMutation.isPending}
                >
                  Audit
                </Button>
              </div>
            ))}
          </div>
        )}
      </Tile>

      {/* 12 Audit Factors Info */}
      <Grid narrow style={{ marginTop: '1.5rem' }}>
        <Column lg={16} md={8} sm={4}>
          <Tile style={{ padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>
              12-Factor Audit Matrix
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {[
                { name: 'Design Freshness', desc: 'Modern vs outdated aesthetics' },
                { name: 'Mobile Responsive', desc: 'Viewport & touch optimized' },
                { name: 'CTA Clarity', desc: 'Clear calls to action' },
                { name: 'Trust Signals', desc: 'Reviews, badges, SSL' },
                { name: 'Typography', desc: 'Readability & hierarchy' },
                { name: 'Branding Quality', desc: 'Consistent visual identity' },
                { name: 'Loading Speed', desc: 'Page load indicators' },
                { name: 'Navigation', desc: 'Structure & usability' },
                { name: 'SEO Basics', desc: 'Meta, headings, structure' },
                { name: 'Contact Visible', desc: 'Easy to find contact info' },
                { name: 'Conversion Ready', desc: 'Forms, booking, purchase' },
                { name: 'Accessibility', desc: 'Alt text, contrast, ARIA' },
              ].map((f, i) => (
                <div key={i} style={{
                  padding: '0.75rem',
                  background: 'var(--cds-layer-02)',
                  fontSize: '0.8125rem',
                }}>
                  <div style={{ fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: 2 }}>
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </Tile>
        </Column>
      </Grid>
    </div>
  );
}
