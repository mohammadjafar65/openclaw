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
  Tag,
  Modal,
  TextInput,
  Select,
  SelectItem,
  InlineNotification,
  OverflowMenu,
  OverflowMenuItem,
} from '@carbon/react';
import { Add, UserMultiple } from '@carbon/icons-react';
import api from '../services/api';
import EmptyState from '../components/shared/EmptyState';

const ROLES = ['admin', 'manager', 'sales_rep', 'researcher', 'copy_reviewer'];

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'researcher' });

  const { data } = useQuery({
    queryKey: ['team'],
    queryFn: () => api.team.list(),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.team.invite(form),
    onSuccess: () => {
      setShowInvite(false);
      setForm({ email: '', full_name: '', role: 'researcher' });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.team.changeRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, active }) => active ? api.team.activate(userId) : api.team.deactivate(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team'] }),
  });

  const members = data?.members || data?.team || [];

  const headers = [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role' },
    { key: 'is_active', header: 'Status' },
    { key: 'created_at', header: 'Joined' },
    { key: 'actions', header: '' },
  ];

  const rows = members.map(m => ({
    id: String(m.id),
    full_name: m.full_name || m.name || '—',
    email: m.email,
    role: m.role,
    is_active: m.is_active,
    created_at: m.created_at,
    _raw: m,
  }));

  return (
    <div>
      <div className="oc-page-header">
        <div>
          <h1>Team</h1>
          <p>Manage team members and their roles</p>
        </div>
        <Button renderIcon={Add} size="sm" onClick={() => setShowInvite(true)}>
          Invite Member
        </Button>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={UserMultiple}
          title="No team members"
          description="Invite your first team member to get started."
          action={<Button renderIcon={Add} onClick={() => setShowInvite(true)}>Invite</Button>}
        />
      ) : (
        <DataTable rows={rows} headers={headers} size="md">
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

                          if (cell.info.header === 'role') {
                            const colors = { admin: 'red', manager: 'purple', sales_rep: 'blue', researcher: 'teal', copy_reviewer: 'warm-gray' };
                            content = <Tag type={colors[cell.value] || 'gray'} size="sm">{cell.value?.replace(/_/g, ' ')}</Tag>;
                          } else if (cell.info.header === 'is_active') {
                            content = <Tag type={cell.value ? 'green' : 'warm-gray'} size="sm">{cell.value ? 'Active' : 'Inactive'}</Tag>;
                          } else if (cell.info.header === 'created_at') {
                            content = cell.value ? new Date(cell.value).toLocaleDateString() : '—';
                          } else if (cell.info.header === 'actions') {
                            content = (
                              <OverflowMenu size="sm" flipped>
                                {ROLES.map(r => (
                                  <OverflowMenuItem
                                    key={r}
                                    itemText={`Set as ${r.replace(/_/g, ' ')}`}
                                    onClick={() => roleMutation.mutate({ userId: row.id, role: r })}
                                  />
                                ))}
                                <OverflowMenuItem hasDivider itemText={raw?.is_active ? 'Deactivate' : 'Activate'} isDelete={raw?.is_active} onClick={() => toggleMutation.mutate({ userId: row.id, active: !raw?.is_active })} />
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

      {/* Invite Modal */}
      <Modal
        open={showInvite}
        modalHeading="Invite Team Member"
        primaryButtonText="Send Invite"
        secondaryButtonText="Cancel"
        onRequestClose={() => setShowInvite(false)}
        onRequestSubmit={() => inviteMutation.mutate()}
        primaryButtonDisabled={!form.email || !form.full_name || inviteMutation.isPending}
      >
        {inviteMutation.isError && (
          <InlineNotification kind="error" subtitle={inviteMutation.error?.message} lowContrast style={{ marginBottom: '1rem' }} />
        )}
        <TextInput
          id="inv-name"
          labelText="Full Name"
          placeholder="John Doe"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          style={{ marginBottom: '1rem' }}
        />
        <TextInput
          id="inv-email"
          labelText="Email"
          placeholder="john@agency.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={{ marginBottom: '1rem' }}
        />
        <Select
          id="inv-role"
          labelText="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          {ROLES.map(r => (
            <SelectItem key={r} value={r} text={r.replace(/_/g, ' ')} />
          ))}
        </Select>

        <div style={{ marginTop: '1rem' }}>
          <h5 style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.5rem' }}>Role Permissions</h5>
          <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)' }}>
            <div><Tag type="red" size="sm">admin</Tag> — Full access, team management, settings</div>
            <div style={{ marginTop: 4 }}><Tag type="purple" size="sm">manager</Tag> — Lead management, campaigns, CRM</div>
            <div style={{ marginTop: 4 }}><Tag type="blue" size="sm">sales rep</Tag> — Outreach, CRM pipeline, own leads</div>
            <div style={{ marginTop: 4 }}><Tag type="teal" size="sm">researcher</Tag> — Discovery, enrichment, view leads</div>
            <div style={{ marginTop: 4 }}><Tag type="warm-gray" size="sm">copy reviewer</Tag> — Review/edit templates only</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
