import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid,
  Column,
  Tile,
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  TextInput,
  TextArea,
  Tag,
  Modal,
  InlineNotification,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@carbon/react';
import { Add, Security, TrashCan, Download } from '@carbon/icons-react';
import api from '../services/api';
import KpiCard from '../components/shared/KpiCard';
import EmptyState from '../components/shared/EmptyState';

export default function CompliancePage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [bulkText, setBulkText] = useState('');

  const { data: statsData } = useQuery({
    queryKey: ['compliance-stats'],
    queryFn: () => api.compliance.stats(),
  });

  const { data: suppData } = useQuery({
    queryKey: ['compliance-suppression'],
    queryFn: () => api.compliance.suppression(),
  });

  const addMutation = useMutation({
    mutationFn: () => api.compliance.addSuppression({ email, reason }),
    onSuccess: () => {
      setShowAdd(false);
      setEmail('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['compliance-suppression'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-stats'] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: () => {
      const emails = bulkText.split('\n').map(e => e.trim()).filter(Boolean);
      return api.compliance.bulkSuppress(emails);
    },
    onSuccess: () => {
      setBulkText('');
      queryClient.invalidateQueries({ queryKey: ['compliance-suppression'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-stats'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id) => api.compliance.removeSuppression(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-suppression'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-stats'] });
    },
  });

  const stats = statsData?.stats || statsData || {};
  const suppList = suppData?.list || suppData?.suppression || [];

  return (
    <div>
      <div className="oc-page-header">
        <div>
          <h1>Compliance Center</h1>
          <p>Suppression list, opt-out management & source traceability</p>
        </div>
        <Button renderIcon={Add} size="sm" onClick={() => setShowAdd(true)}>
          Add to Suppression
        </Button>
      </div>

      <div className="oc-kpi-grid">
        <KpiCard label="Suppressed Emails" value={stats.total_suppressed || 0} color="#da1e28" />
        <KpiCard label="Manual Opt-outs" value={stats.manual_optouts || 0} color="#f1c21b" />
        <KpiCard label="Link Opt-outs" value={stats.link_optouts || 0} color="#ee5396" />
        <KpiCard label="Bounced" value={stats.bounced || 0} color="#8d8d8d" />
      </div>

      <Tabs>
        <TabList aria-label="Compliance tabs">
          <Tab>Suppression List</Tab>
          <Tab>Bulk Import</Tab>
          <Tab>Opt-Out Info</Tab>
        </TabList>
        <TabPanels>
          {/* Suppression List */}
          <TabPanel>
            <Tile style={{ marginTop: '1rem', padding: '1.5rem' }}>
              {suppList.length === 0 ? (
                <EmptyState
                  icon={Security}
                  title="Suppression list empty"
                  description="Emails added here will be automatically excluded from all outreach."
                />
              ) : (
                <DataTable
                  rows={suppList.map(s => ({ id: String(s.id), ...s }))}
                  headers={[
                    { key: 'email', header: 'Email' },
                    { key: 'reason', header: 'Reason' },
                    { key: 'source', header: 'Source' },
                    { key: 'created_at', header: 'Added' },
                    { key: 'actions', header: '' },
                  ]}
                  size="sm"
                >
                  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                    <TableContainer>
                      <Table {...getTableProps()} size="sm">
                        <TableHead>
                          <TableRow>
                            {headers.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map(row => (
                            <TableRow {...getRowProps({ row })} key={row.id}>
                              {row.cells.map(cell => {
                                let content = cell.value;
                                if (cell.info.header === 'created_at') {
                                  content = cell.value ? new Date(cell.value).toLocaleDateString() : '—';
                                } else if (cell.info.header === 'actions') {
                                  content = (
                                    <Button kind="ghost" size="sm" renderIcon={TrashCan} hasIconOnly iconDescription="Remove" onClick={() => removeMutation.mutate(row.id)} />
                                  );
                                }
                                return <TableCell key={cell.id}>{content}</TableCell>;
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </DataTable>
              )}
            </Tile>
          </TabPanel>

          {/* Bulk Import */}
          <TabPanel>
            <Tile style={{ marginTop: '1rem', padding: '1.5rem' }}>
              <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>Bulk Add to Suppression</h4>
              <TextArea
                id="bulk-emails"
                labelText="Emails (one per line)"
                placeholder="email1@example.com&#10;email2@example.com"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={6}
                style={{ marginBottom: '1rem' }}
              />
              <Button
                kind="danger"
                renderIcon={Add}
                onClick={() => bulkMutation.mutate()}
                disabled={!bulkText.trim() || bulkMutation.isPending}
              >
                {bulkMutation.isPending ? 'Adding…' : 'Add All to Suppression'}
              </Button>
              {bulkMutation.isSuccess && (
                <InlineNotification kind="success" subtitle="Emails added to suppression list" lowContrast style={{ marginTop: '1rem' }} />
              )}
            </Tile>
          </TabPanel>

          {/* Opt-Out Info */}
          <TabPanel>
            <Tile style={{ marginTop: '1rem', padding: '1.5rem' }}>
              <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>Public Opt-Out Page</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--cds-text-secondary)', marginBottom: '1rem' }}>
                Every outreach email includes an unsubscribe link. Recipients can opt out at any time via:
              </p>
              <Tile style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', padding: '0.75rem', background: 'var(--cds-layer-02)' }}>
                {window.location.origin}/openclaw/api/compliance/opt-out?email=&#123;email&#125;
              </Tile>
              <p style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginTop: '1rem' }}>
                This page is publicly accessible (no login required). Opted-out emails are immediately added to the suppression list and excluded from all future campaigns.
              </p>
            </Tile>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Add Suppression Modal */}
      <Modal
        open={showAdd}
        modalHeading="Add to Suppression List"
        primaryButtonText="Suppress"
        secondaryButtonText="Cancel"
        onRequestClose={() => setShowAdd(false)}
        onRequestSubmit={() => addMutation.mutate()}
        primaryButtonDisabled={!email || addMutation.isPending}
        danger
      >
        <TextInput
          id="supp-email"
          labelText="Email Address"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: '1rem' }}
        />
        <TextInput
          id="supp-reason"
          labelText="Reason (optional)"
          placeholder="e.g. Client request, bounced, etc."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
