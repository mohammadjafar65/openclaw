import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  TableContainer,
  Pagination,
  Tag,
  Button,
  OverflowMenu,
  OverflowMenuItem,
  Select,
  SelectItem,
  Grid,
  Column,
  InlineNotification,
} from '@carbon/react';
import { Renew, Filter, TrashCan } from '@carbon/icons-react';
import api from '../services/api';
import { PriorityBadge, AuditBadge, ScoreBadge } from '../components/shared/Badges';
import EmptyState from '../components/shared/EmptyState';

const PAGE_SIZE = 25;

export default function LeadDatabasePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [auditFilter, setAuditFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', page, search, priorityFilter, auditFilter],
    queryFn: () => api.leads.list({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      priority: priorityFilter || undefined,
      audit: auditFilter || undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.leads.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const leads = data?.leads || data?.data || [];
  const total = data?.total || data?.pagination?.total || leads.length;

  const headers = [
    { key: 'business_name', header: 'Business' },
    { key: 'category', header: 'Niche' },
    { key: 'city', header: 'City' },
    { key: 'email', header: 'Email' },
    { key: 'lead_score', header: 'Score' },
    { key: 'lead_priority', header: 'Priority' },
    { key: 'audit_classification', header: 'Website' },
    { key: 'stage', header: 'Stage' },
    { key: 'actions', header: '' },
  ];

  const rows = leads.map((lead) => ({
    id: String(lead.id),
    business_name: lead.business_name || '—',
    category: lead.category || '—',
    city: lead.city || lead.country || '—',
    email: lead.email || lead.owner_email || '—',
    lead_score: lead.lead_score || lead.ai_score || 0,
    lead_priority: lead.lead_priority || lead.queue_tier || '—',
    audit_classification: lead.audit_classification || '—',
    stage: lead.stage || lead.status || 'new',
    _raw: lead,
  }));

  return (
    <div>
      <div className="oc-page-header">
        <div>
          <h1>Lead Database</h1>
          <p>{total.toLocaleString()} leads discovered</p>
        </div>
        <Button
          kind="ghost"
          renderIcon={Renew}
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
        >
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Grid narrow style={{ marginBottom: '1rem' }}>
        <Column lg={4} md={2} sm={2}>
          <Select
            id="priority-filter"
            labelText="Priority"
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            size="sm"
          >
            <SelectItem value="" text="All Priorities" />
            <SelectItem value="hot" text="Hot" />
            <SelectItem value="warm" text="Warm" />
            <SelectItem value="cold" text="Cold" />
            <SelectItem value="disqualified" text="Disqualified" />
          </Select>
        </Column>
        <Column lg={4} md={2} sm={2}>
          <Select
            id="audit-filter"
            labelText="Website Status"
            value={auditFilter}
            onChange={(e) => { setAuditFilter(e.target.value); setPage(1); }}
            size="sm"
          >
            <SelectItem value="" text="All" />
            <SelectItem value="none" text="No Website" />
            <SelectItem value="outdated" text="Outdated" />
            <SelectItem value="average" text="Average" />
            <SelectItem value="strong" text="Strong" />
          </Select>
        </Column>
      </Grid>

      {error && (
        <InlineNotification
          kind="error"
          title="Failed to load leads"
          subtitle={error.message}
          lowContrast
          style={{ marginBottom: '1rem' }}
        />
      )}

      {leads.length === 0 && !isLoading ? (
        <EmptyState
          title="No leads found"
          description="Start a discovery search to populate your lead database."
          action={<Button onClick={() => navigate('/find-leads')}>Find Leads</Button>}
        />
      ) : (
        <>
          <DataTable rows={rows} headers={headers} size="md" isSortable>
            {({
              rows: tableRows,
              headers: tableHeaders,
              getTableProps,
              getHeaderProps,
              getRowProps,
              getToolbarProps,
              onInputChange,
            }) => (
              <TableContainer>
                <TableToolbar {...getToolbarProps()}>
                  <TableToolbarContent>
                    <TableToolbarSearch
                      onChange={(e) => { onInputChange(e); setSearch(e.target.value); }}
                      placeholder="Search leads…"
                      persistent
                    />
                  </TableToolbarContent>
                </TableToolbar>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {tableHeaders.map((h) => (
                        <TableHeader {...getHeaderProps({ header: h })} key={h.key}>
                          {h.header}
                        </TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((row) => {
                      const raw = rows.find(r => r.id === row.id)?._raw;
                      return (
                        <TableRow
                          {...getRowProps({ row })}
                          key={row.id}
                          onClick={() => navigate(`/leads/${row.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          {row.cells.map((cell) => {
                            let content = cell.value;

                            if (cell.info.header === 'lead_priority') {
                              content = <PriorityBadge priority={cell.value} />;
                            } else if (cell.info.header === 'audit_classification') {
                              content = <AuditBadge classification={cell.value} />;
                            } else if (cell.info.header === 'lead_score') {
                              content = <ScoreBadge score={cell.value} />;
                            } else if (cell.info.header === 'stage') {
                              content = (
                                <Tag type="outline" size="sm">
                                  {String(cell.value).replace(/_/g, ' ')}
                                </Tag>
                              );
                            } else if (cell.info.header === 'actions') {
                              content = (
                                <OverflowMenu size="sm" flipped onClick={(e) => e.stopPropagation()}>
                                  <OverflowMenuItem
                                    itemText="View Detail"
                                    onClick={() => navigate(`/leads/${row.id}`)}
                                  />
                                  <OverflowMenuItem
                                    itemText="Run Audit"
                                    onClick={() => api.audit.run(row.id)}
                                  />
                                  <OverflowMenuItem
                                    hasDivider
                                    isDelete
                                    itemText="Delete"
                                    onClick={() => deleteMutation.mutate(row.id)}
                                  />
                                </OverflowMenu>
                              );
                            }

                            return <TableCell key={cell.id}>{content}</TableCell>;
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>

          <Pagination
            totalItems={total}
            pageSize={PAGE_SIZE}
            pageSizes={[10, 25, 50, 100]}
            page={page}
            onChange={({ page: p, pageSize }) => setPage(p)}
            style={{ marginTop: '1rem' }}
          />
        </>
      )}
    </div>
  );
}
