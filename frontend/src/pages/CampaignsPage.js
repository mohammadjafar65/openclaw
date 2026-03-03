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
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
  Tag,
  Modal,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
} from '@carbon/react';
import { Add, Play, Pause, Email } from '@carbon/icons-react';
import api from '../services/api';
import KpiCard from '../components/shared/KpiCard';
import EmptyState from '../components/shared/EmptyState';

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', niche: '', region: '', campaign_type: 'email' });

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.campaigns.create(data),
    onSuccess: () => {
      setShowCreate(false);
      setForm({ name: '', niche: '', region: '', campaign_type: 'email' });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id) => api.campaigns.start(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const pauseMutation = useMutation({
    mutationFn: (id) => api.campaigns.pause(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.campaigns.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const campaigns = data?.campaigns || data || [];

  const totalSent = campaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
  const totalOpened = campaigns.reduce((s, c) => s + (c.total_opened || 0), 0);
  const totalReplied = campaigns.reduce((s, c) => s + (c.total_replied || 0), 0);
  const active = campaigns.filter(c => c.status === 'active').length;

  const headers = [
    { key: 'name', header: 'Campaign' },
    { key: 'status', header: 'Status' },
    { key: 'niche', header: 'Niche' },
    { key: 'total_leads', header: 'Leads' },
    { key: 'total_sent', header: 'Sent' },
    { key: 'open_rate', header: 'Open %' },
    { key: 'reply_rate', header: 'Reply %' },
    { key: 'actions', header: '' },
  ];

  const rows = campaigns.map((c) => ({
    id: String(c.id),
    name: c.name,
    status: c.status,
    niche: c.niche || '—',
    total_leads: c.total_leads || 0,
    total_sent: c.total_sent || 0,
    open_rate: c.total_sent > 0 ? Math.round((c.total_opened / c.total_sent) * 100) : 0,
    reply_rate: c.total_sent > 0 ? Math.round((c.total_replied / c.total_sent) * 100) : 0,
    _raw: c,
  }));

  return (
    <div>
      <div className="oc-page-header">
        <div>
          <h1>Campaigns</h1>
          <p>Manage your outreach campaigns and email sequences</p>
        </div>
        <Button renderIcon={Add} size="sm" onClick={() => setShowCreate(true)}>
          New Campaign
        </Button>
      </div>

      <div className="oc-kpi-grid">
        <KpiCard label="Active" value={active} color="#24a148" />
        <KpiCard label="Total Sent" value={totalSent.toLocaleString()} color="#4589ff" />
        <KpiCard label="Total Opened" value={totalOpened.toLocaleString()} color="#6929c4" />
        <KpiCard label="Total Replied" value={totalReplied.toLocaleString()} color="#f1c21b" />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={Email}
          title="No campaigns yet"
          description="Create your first outreach campaign to start reaching out to qualified leads."
          action={<Button renderIcon={Add} onClick={() => setShowCreate(true)}>Create Campaign</Button>}
        />
      ) : (
        <DataTable rows={rows} headers={headers} size="md" isSortable>
          {({ rows: tableRows, headers: tableHeaders, getTableProps, getHeaderProps, getRowProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {tableHeaders.map(h => <TableHeader {...getHeaderProps({ header: h })} key={h.key}>{h.header}</TableHeader>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.map(row => {
                    const raw = rows.find(r => r.id === row.id)?._raw;
                    return (
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map(cell => {
                          let content = cell.value;
                          if (cell.info.header === 'status') {
                            const colors = { active: 'green', paused: 'warm-gray', draft: 'cool-gray', completed: 'blue' };
                            content = <Tag type={colors[cell.value] || 'gray'} size="sm">{cell.value}</Tag>;
                          } else if (cell.info.header === 'open_rate' || cell.info.header === 'reply_rate') {
                            content = `${cell.value}%`;
                          } else if (cell.info.header === 'actions') {
                            content = (
                              <OverflowMenu size="sm" flipped>
                                {raw?.status !== 'active' && (
                                  <OverflowMenuItem itemText="Start" onClick={() => startMutation.mutate(row.id)} />
                                )}
                                {raw?.status === 'active' && (
                                  <OverflowMenuItem itemText="Pause" onClick={() => pauseMutation.mutate(row.id)} />
                                )}
                                <OverflowMenuItem hasDivider isDelete itemText="Delete" onClick={() => deleteMutation.mutate(row.id)} />
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
      )}

      {/* Create Modal */}
      <Modal
        open={showCreate}
        modalHeading="New Campaign"
        primaryButtonText="Create"
        secondaryButtonText="Cancel"
        onRequestClose={() => setShowCreate(false)}
        onRequestSubmit={() => createMutation.mutate(form)}
        primaryButtonDisabled={!form.name || createMutation.isPending}
      >
        {createMutation.isError && (
          <InlineNotification kind="error" subtitle={createMutation.error?.message} lowContrast style={{ marginBottom: '1rem' }} />
        )}
        <TextInput
          id="c-name"
          labelText="Campaign Name"
          placeholder="e.g. Dentists in Miami"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{ marginBottom: '1rem' }}
        />
        <TextInput
          id="c-niche"
          labelText="Target Niche"
          placeholder="e.g. Dentist"
          value={form.niche}
          onChange={(e) => setForm({ ...form, niche: e.target.value })}
          style={{ marginBottom: '1rem' }}
        />
        <TextInput
          id="c-region"
          labelText="Region"
          placeholder="e.g. Miami, FL"
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          style={{ marginBottom: '1rem' }}
        />
        <Select
          id="c-type"
          labelText="Campaign Type"
          value={form.campaign_type}
          onChange={(e) => setForm({ ...form, campaign_type: e.target.value })}
        >
          <SelectItem value="email" text="Email" />
          <SelectItem value="whatsapp" text="WhatsApp" />
          <SelectItem value="multi" text="Multi-Channel" />
        </Select>
      </Modal>
    </div>
  );
}
