import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid,
  Column,
  Tile,
  Button,
  Tag,
  TextArea,
  TextInput,
  Select,
  SelectItem,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  InlineNotification,
  SkeletonText,
  StructuredListWrapper,
  StructuredListHead,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody,
  Modal,
} from '@carbon/react';
import {
  ArrowLeft,
  Email,
  Phone,
  Globe,
  ChartBubblePacked,
  WatsonHealthAiResults,
  Add,
  Checkmark,
  Copy,
} from '@carbon/icons-react';
import api from '../services/api';
import { PriorityBadge, AuditBadge, ScoreBadge } from '../components/shared/Badges';

const STAGES = [
  'new', 'enriched', 'qualified', 'ready_to_contact', 'contacted',
  'replied', 'interested', 'meeting_booked', 'proposal_sent', 'won', 'lost', 'do_not_contact',
];

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiContent, setAiContent] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['crm-lead', id],
    queryFn: () => api.crm.leadDetail(id),
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-lead', id],
    queryFn: () => api.audit.get(id),
  });

  const stageMutation = useMutation({
    mutationFn: (stage) => api.crm.moveStage(id, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-lead', id] }),
  });

  const noteMutation = useMutation({
    mutationFn: (content) => api.crm.addNote(id, { content }),
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['crm-lead', id] });
    },
  });

  const taskMutation = useMutation({
    mutationFn: (title) => api.crm.addTask(id, { title, due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }),
    onSuccess: () => {
      setTaskTitle('');
      queryClient.invalidateQueries({ queryKey: ['crm-lead', id] });
    },
  });

  const auditMutation = useMutation({
    mutationFn: () => api.audit.run(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audit-lead', id] }),
  });

  const generateColdEmail = async () => {
    setAiLoading(true);
    setShowAiModal(true);
    try {
      const res = await api.personalize.coldEmail(id, { tone: 'professional' });
      setAiContent(res);
    } catch (err) {
      setAiContent({ error: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Button kind="ghost" renderIcon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>
        <SkeletonText heading width="50%" style={{ marginTop: '1rem' }} />
        <SkeletonText paragraph lineCount={4} width="80%" />
      </div>
    );
  }

  const lead = detail?.lead || {};
  const notes = detail?.notes || [];
  const tasks = detail?.tasks || [];
  const audit = auditData?.audits?.[0] || auditData?.audit || null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Button kind="ghost" renderIcon={ArrowLeft} size="sm" onClick={() => navigate(-1)}>
          Back
        </Button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{lead.business_name || `Lead #${id}`}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            <Tag type="outline" size="sm">{lead.category || '—'}</Tag>
            <PriorityBadge priority={lead.lead_priority || lead.queue_tier} />
            <AuditBadge classification={lead.audit_classification} />
            <ScoreBadge score={lead.lead_score || lead.ai_score} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button kind="tertiary" size="sm" renderIcon={WatsonHealthAiResults} onClick={generateColdEmail}>
            Generate Email
          </Button>
          <Button kind="tertiary" size="sm" renderIcon={ChartBubblePacked} onClick={() => auditMutation.mutate()} disabled={auditMutation.isPending}>
            {auditMutation.isPending ? 'Auditing…' : 'Run Audit'}
          </Button>
        </div>
      </div>

      <Grid narrow>
        {/* Left: Lead Info */}
        <Column lg={10} md={5} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tabs>
            <TabList aria-label="Lead tabs">
              <Tab>Overview</Tab>
              <Tab>Audit</Tab>
              <Tab>Notes ({notes.length})</Tab>
              <Tab>Tasks ({tasks.length})</Tab>
            </TabList>
            <TabPanels>
              {/* Overview */}
              <TabPanel>
                <Tile style={{ marginTop: '1rem' }}>
                  <StructuredListWrapper>
                    <StructuredListBody>
                      <StructuredListRow>
                        <StructuredListCell><Globe size={16} /> Website</StructuredListCell>
                        <StructuredListCell>
                          {lead.website_url || lead.maps_website ? (
                            <a href={lead.website_url || lead.maps_website} target="_blank" rel="noreferrer" style={{ color: '#4589ff' }}>
                              {lead.website_url || lead.maps_website}
                            </a>
                          ) : <Tag type="red" size="sm">No Website</Tag>}
                        </StructuredListCell>
                      </StructuredListRow>
                      <StructuredListRow>
                        <StructuredListCell><Email size={16} /> Email</StructuredListCell>
                        <StructuredListCell>{lead.email || lead.owner_email || '—'}</StructuredListCell>
                      </StructuredListRow>
                      <StructuredListRow>
                        <StructuredListCell><Phone size={16} /> Phone</StructuredListCell>
                        <StructuredListCell>{lead.phone || '—'}</StructuredListCell>
                      </StructuredListRow>
                      <StructuredListRow>
                        <StructuredListCell>Location</StructuredListCell>
                        <StructuredListCell>{[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '—'}</StructuredListCell>
                      </StructuredListRow>
                      <StructuredListRow>
                        <StructuredListCell>Rating</StructuredListCell>
                        <StructuredListCell>★ {lead.rating || '—'} ({lead.review_count || 0} reviews)</StructuredListCell>
                      </StructuredListRow>
                      <StructuredListRow>
                        <StructuredListCell>Owner</StructuredListCell>
                        <StructuredListCell>{lead.decision_maker_name || lead.owner_name || '—'}</StructuredListCell>
                      </StructuredListRow>
                      <StructuredListRow>
                        <StructuredListCell>Deal Value</StructuredListCell>
                        <StructuredListCell>${(lead.deal_value || 0).toLocaleString()}</StructuredListCell>
                      </StructuredListRow>
                    </StructuredListBody>
                  </StructuredListWrapper>
                </Tile>
              </TabPanel>

              {/* Audit */}
              <TabPanel>
                <Tile style={{ marginTop: '1rem' }}>
                  {audit ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h4 style={{ fontWeight: 600 }}>Website Audit Result</h4>
                        <AuditBadge classification={audit.classification} />
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '1rem' }}>
                        Score: {audit.audit_score ?? audit.overall_score ?? '—'}/100
                      </div>
                      {audit.factors && (() => {
                        let factors = audit.factors;
                        if (typeof factors === 'string') {
                          try { factors = JSON.parse(factors); } catch { factors = {}; }
                        }
                        return (
                          <div>
                            {Object.entries(factors).map(([key, val]) => (
                              <div key={key} style={{ marginBottom: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                  <span style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                                  <span style={{ fontWeight: 500 }}>{val}/10</span>
                                </div>
                                <div style={{ height: 6, background: 'var(--cds-layer-02)', marginTop: 2 }}>
                                  <div style={{ height: '100%', width: `${val * 10}%`, background: val >= 7 ? '#24a148' : val >= 4 ? '#f1c21b' : '#da1e28' }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {audit.recommendations && (
                        <div style={{ marginTop: '1rem' }}>
                          <h5 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Recommendations</h5>
                          <p style={{ fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
                            {typeof audit.recommendations === 'string' ? audit.recommendations : JSON.stringify(audit.recommendations, null, 2)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <p style={{ marginBottom: '1rem', color: 'var(--cds-text-secondary)' }}>No audit data — run an audit to analyze the website.</p>
                      <Button renderIcon={ChartBubblePacked} onClick={() => auditMutation.mutate()} disabled={auditMutation.isPending}>
                        Run Website Audit
                      </Button>
                    </div>
                  )}
                </Tile>
              </TabPanel>

              {/* Notes */}
              <TabPanel>
                <Tile style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <TextArea
                      id="note"
                      labelText=""
                      placeholder="Add a note…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      style={{ flex: 1 }}
                    />
                    <Button
                      kind="primary"
                      size="sm"
                      renderIcon={Add}
                      onClick={() => noteMutation.mutate(noteText)}
                      disabled={!noteText.trim() || noteMutation.isPending}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      Add
                    </Button>
                  </div>
                  {notes.map((note) => (
                    <div key={note.id} style={{
                      padding: '0.75rem',
                      borderBottom: '1px solid var(--cds-border-subtle)',
                      fontSize: '0.8125rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{note.created_by_name || 'You'}</span>
                        <span style={{ color: 'var(--cds-text-secondary)', fontSize: '0.75rem' }}>
                          {new Date(note.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p style={{ marginTop: '0.25rem' }}>{note.content}</p>
                    </div>
                  ))}
                  {notes.length === 0 && <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.8125rem' }}>No notes yet.</p>}
                </Tile>
              </TabPanel>

              {/* Tasks */}
              <TabPanel>
                <Tile style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <TextInput
                      id="task"
                      labelText=""
                      placeholder="Add a task…"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      kind="primary"
                      size="sm"
                      renderIcon={Add}
                      onClick={() => taskMutation.mutate(taskTitle)}
                      disabled={!taskTitle.trim() || taskMutation.isPending}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      Add
                    </Button>
                  </div>
                  {tasks.map((task) => (
                    <div key={task.id} style={{
                      padding: '0.5rem',
                      borderBottom: '1px solid var(--cds-border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div>
                        <span style={{
                          fontSize: '0.8125rem',
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        }}>
                          {task.title}
                        </span>
                        {task.due_date && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--cds-text-secondary)', marginLeft: 8 }}>
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {task.status !== 'completed' && (
                        <Button kind="ghost" size="sm" renderIcon={Checkmark} onClick={() => api.crm.completeTask(task.id).then(() => queryClient.invalidateQueries({ queryKey: ['crm-lead', id] }))}>
                          Done
                        </Button>
                      )}
                    </div>
                  ))}
                  {tasks.length === 0 && <p style={{ color: 'var(--cds-text-secondary)', fontSize: '0.8125rem' }}>No tasks yet.</p>}
                </Tile>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Column>

        {/* Right: Stage & Actions */}
        <Column lg={6} md={3} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>Pipeline Stage</h4>
            <Select
              id="stage"
              labelText="Current Stage"
              value={lead.stage || 'new'}
              onChange={(e) => stageMutation.mutate(e.target.value)}
              size="md"
            >
              {STAGES.map(s => (
                <SelectItem key={s} value={s} text={s.replace(/_/g, ' ')} />
              ))}
            </Select>
          </Tile>

          <Tile style={{ padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>Quick Actions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Button kind="tertiary" size="sm" renderIcon={WatsonHealthAiResults} onClick={generateColdEmail}>
                AI Cold Email
              </Button>
              <Button kind="tertiary" size="sm" renderIcon={ChartBubblePacked} onClick={() => auditMutation.mutate()}>
                Run Audit
              </Button>
              {lead.phone && (
                <Button kind="ghost" size="sm" renderIcon={Phone} href={`tel:${lead.phone}`} as="a">
                  Call {lead.phone}
                </Button>
              )}
              {(lead.email || lead.owner_email) && (
                <Button kind="ghost" size="sm" renderIcon={Email} href={`mailto:${lead.email || lead.owner_email}`} as="a">
                  Email Directly
                </Button>
              )}
            </div>
          </Tile>
        </Column>
      </Grid>

      {/* AI Generated Content Modal */}
      <Modal
        open={showAiModal}
        modalHeading="AI-Generated Cold Email"
        primaryButtonText="Copy to Clipboard"
        secondaryButtonText="Close"
        onRequestClose={() => setShowAiModal(false)}
        onRequestSubmit={() => {
          const text = aiContent?.email?.body || aiContent?.content || JSON.stringify(aiContent);
          navigator.clipboard.writeText(text);
        }}
      >
        {aiLoading ? (
          <SkeletonText paragraph lineCount={8} />
        ) : aiContent?.error ? (
          <InlineNotification kind="error" subtitle={aiContent.error} lowContrast hideCloseButton />
        ) : (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', whiteSpace: 'pre-wrap' }}>
            {aiContent?.email ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Subject:</strong> {aiContent.email.subject}
                </div>
                <div>{aiContent.email.body}</div>
              </>
            ) : (
              <pre>{JSON.stringify(aiContent, null, 2)}</pre>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
