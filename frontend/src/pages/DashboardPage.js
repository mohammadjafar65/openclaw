import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Column,
  Tile,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  SkeletonText,
} from '@carbon/react';
import {
  Dashboard,
  Search,
  Email,
  Checkmark,
  WarningAlt,
  ChartBubblePacked,
} from '@carbon/icons-react';
import api from '../services/api';
import KpiCard from '../components/shared/KpiCard';
import EmptyState from '../components/shared/EmptyState';

export default function DashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.analytics.overview(),
  });

  const { data: funnelData } = useQuery({
    queryKey: ['analytics-funnel'],
    queryFn: () => api.analytics.funnel(),
  });

  const { data: auditDist } = useQuery({
    queryKey: ['analytics-audit-dist'],
    queryFn: () => api.analytics.auditDist(),
  });

  const { data: activityData } = useQuery({
    queryKey: ['analytics-activity'],
    queryFn: () => api.analytics.activityFeed(15),
  });

  const { data: nicheData } = useQuery({
    queryKey: ['analytics-niches'],
    queryFn: () => api.analytics.nicheBreakdown(),
  });

  const kpis = overview?.kpis || {};

  if (isLoading) {
    return (
      <div>
        <div className="oc-page-header">
          <div>
            <h1>Dashboard</h1>
            <p>Loading metrics…</p>
          </div>
        </div>
        <div className="oc-kpi-grid">
          {[1,2,3,4,5,6].map(i => (
            <Tile key={i} className="oc-kpi-card"><SkeletonText /></Tile>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="oc-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Your lead discovery and outreach performance at a glance</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="oc-kpi-grid">
        <KpiCard
          label="Total Leads"
          value={kpis.total_leads?.toLocaleString() || 0}
          icon={Search}
          color="#6929c4"
        />
        <KpiCard
          label="Enriched"
          value={kpis.enriched_leads?.toLocaleString() || 0}
          icon={Checkmark}
          color="#0f62fe"
        />
        <KpiCard
          label="Hot Leads"
          value={kpis.hot_leads?.toLocaleString() || 0}
          icon={WarningAlt}
          color="#da1e28"
        />
        <KpiCard
          label="No Website"
          value={kpis.no_website?.toLocaleString() || 0}
          icon={ChartBubblePacked}
          color="#ee5396"
        />
        <KpiCard
          label="Emails Sent"
          value={kpis.total_sent?.toLocaleString() || 0}
          icon={Email}
          color="#4589ff"
        />
        <KpiCard
          label="Open Rate"
          value={`${kpis.open_rate || 0}%`}
          color="#24a148"
        />
        <KpiCard
          label="Reply Rate"
          value={`${kpis.reply_rate || 0}%`}
          color="#f1c21b"
        />
        <KpiCard
          label="Deals Won"
          value={kpis.deals_won?.toLocaleString() || 0}
          icon={Dashboard}
          color="#24a148"
        />
      </div>

      <Grid narrow>
        {/* Funnel */}
        <Column lg={8} md={4} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
              Lead Funnel
            </h4>
            {funnelData?.funnel?.length > 0 ? (
              <div>
                {funnelData.funnel.map((stage) => {
                  const maxCount = Math.max(...funnelData.funnel.map(s => s.count), 1);
                  const pct = Math.round((stage.count / maxCount) * 100);
                  return (
                    <div key={stage.stage} style={{ marginBottom: '0.75rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        marginBottom: '0.25rem',
                      }}>
                        <span style={{ textTransform: 'capitalize' }}>
                          {stage.stage?.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontWeight: 600 }}>{stage.count}</span>
                      </div>
                      <div style={{
                        height: 8,
                        background: 'var(--cds-layer-02, #e0e0e0)',
                        borderRadius: 0,
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: '#6929c4',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No funnel data" description="Start discovering leads to see your pipeline." />
            )}
          </Tile>
        </Column>

        {/* Audit Distribution */}
        <Column lg={8} md={4} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
              Website Audit Distribution
            </h4>
            {auditDist?.distribution?.length > 0 ? (
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {auditDist.distribution.map((item) => {
                  const colors = {
                    none: '#da1e28',
                    outdated: '#ee5396',
                    average: '#8d8d8d',
                    strong: '#24a148',
                  };
                  return (
                    <Tile
                      key={item.classification}
                      style={{
                        flex: '1 1 120px',
                        textAlign: 'center',
                        borderTop: `3px solid ${colors[item.classification] || '#6f6f6f'}`,
                      }}
                    >
                      <div style={{ fontSize: '1.75rem', fontWeight: 300 }}>{item.count}</div>
                      <div style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.32px',
                        color: 'var(--cds-text-secondary)',
                      }}>
                        {item.classification || 'Unknown'}
                      </div>
                    </Tile>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No audits yet" description="Audit leads to see website quality distribution." />
            )}
          </Tile>
        </Column>

        {/* Top Niches */}
        <Column lg={8} md={4} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
              Top Niches
            </h4>
            {nicheData?.niches?.length > 0 ? (
              <DataTable
                rows={nicheData.niches.slice(0, 8).map((n, i) => ({ id: String(i), ...n }))}
                headers={[
                  { key: 'niche', header: 'Niche' },
                  { key: 'total_leads', header: 'Leads' },
                  { key: 'opportunities', header: 'Opportunities' },
                ]}
                size="sm"
              >
                {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                  <Table {...getTableProps()} size="sm">
                    <TableHead>
                      <TableRow>
                        {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(row => (
                        <TableRow {...getRowProps({ row })} key={row.id}>
                          {row.cells.map(cell => <TableCell key={cell.id}>{cell.value}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </DataTable>
            ) : (
              <EmptyState title="No niche data" />
            )}
          </Tile>
        </Column>

        {/* Recent Activity */}
        <Column lg={8} md={4} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
              Recent Activity
            </h4>
            {activityData?.activities?.length > 0 ? (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {activityData.activities.map((act, i) => (
                  <div
                    key={act.id || i}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        <Tag type="outline" size="sm" style={{ marginRight: 4 }}>{act.action}</Tag>
                        {act.business_name || `Lead #${act.lead_id}`}
                      </span>
                      <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.75rem' }}>
                        {new Date(act.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {act.user_name && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
                        by {act.user_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No activity yet" description="Actions will appear here as you use the platform." />
            )}
          </Tile>
        </Column>
      </Grid>
    </div>
  );
}
