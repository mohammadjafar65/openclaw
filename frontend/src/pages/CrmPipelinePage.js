import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tile,
  Button,
  Tag,
  Select,
  SelectItem,
  Grid,
  Column,
} from '@carbon/react';
import { Flow, Renew, ArrowRight } from '@carbon/icons-react';
import api from '../services/api';
import { PriorityBadge, ScoreBadge } from '../components/shared/Badges';
import KpiCard from '../components/shared/KpiCard';
import EmptyState from '../components/shared/EmptyState';

const STAGE_COLORS = {
  new: '#8d8d8d',
  enriched: '#4589ff',
  qualified: '#0f62fe',
  ready_to_contact: '#6929c4',
  contacted: '#ee5396',
  replied: '#f1c21b',
  interested: '#ff832b',
  meeting_booked: '#24a148',
  proposal_sent: '#009d9a',
  won: '#198038',
  lost: '#da1e28',
  do_not_contact: '#6f6f6f',
};

export default function CrmPipelinePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pipelineData, isLoading } = useQuery({
    queryKey: ['crm-pipeline'],
    queryFn: () => api.crm.pipeline(),
  });

  const { data: forecastData } = useQuery({
    queryKey: ['crm-forecast'],
    queryFn: () => api.crm.forecast(),
  });

  const stageMutation = useMutation({
    mutationFn: ({ leadId, stage }) => api.crm.moveStage(leadId, stage),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] }),
  });

  const pipeline = pipelineData?.pipeline || {};
  const stages = pipelineData?.stages || Object.keys(STAGE_COLORS);
  const forecast = forecastData?.forecast || {};

  // Visible stages for kanban (skip 'do_not_contact')
  const visibleStages = stages.filter(s => s !== 'do_not_contact');

  return (
    <div>
      <div className="oc-page-header">
        <div>
          <h1>CRM Pipeline</h1>
          <p>Drag leads through your sales pipeline</p>
        </div>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Renew}
          onClick={() => queryClient.invalidateQueries({ queryKey: ['crm-pipeline'] })}
        >
          Refresh
        </Button>
      </div>

      {/* Forecast KPIs */}
      <div className="oc-kpi-grid">
        <KpiCard label="Hot Leads" value={forecast.hot_leads || 0} color="#da1e28" />
        <KpiCard label="In Pipeline" value={forecast.pipeline_count || 0} color="#6929c4" />
        <KpiCard label="Forecast Value" value={`$${(forecast.forecast_value || 0).toLocaleString()}`} color="#24a148" />
        <KpiCard label="Avg Deal Size" value={`$${(forecast.avg_deal_value || 0).toLocaleString()}`} color="#0f62fe" />
      </div>

      {/* Kanban Board */}
      <div className="oc-kanban">
        {visibleStages.map((stage) => {
          const leads = pipeline[stage] || [];
          return (
            <div key={stage} className="oc-kanban__column">
              <div className="oc-kanban__column-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: STAGE_COLORS[stage] || '#8d8d8d',
                    display: 'inline-block',
                  }} />
                  {stage.replace(/_/g, ' ')}
                </span>
                <span className="oc-kanban__column-count">{leads.length}</span>
              </div>
              <div className="oc-kanban__cards">
                {leads.length === 0 ? (
                  <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--cds-text-secondary)',
                  }}>
                    No leads
                  </div>
                ) : (
                  leads.slice(0, 20).map((lead) => (
                    <div
                      key={lead.id}
                      className={`oc-kanban__card oc-kanban__card--${lead.lead_priority || 'cold'}`}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      <div className="oc-kanban__card-title">{lead.business_name}</div>
                      <div className="oc-kanban__card-meta">
                        {lead.category} · {lead.city || '—'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', alignItems: 'center' }}>
                        <PriorityBadge priority={lead.lead_priority || lead.queue_tier} />
                        {lead.deal_value > 0 && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#24a148' }}>
                            ${lead.deal_value.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {/* Quick stage forward */}
                      <div style={{ marginTop: '0.5rem' }}>
                        <Select
                          id={`stage-${lead.id}`}
                          labelText=""
                          hideLabel
                          size="sm"
                          value={stage}
                          onChange={(e) => {
                            e.stopPropagation();
                            stageMutation.mutate({ leadId: lead.id, stage: e.target.value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {stages.map(s => (
                            <SelectItem key={s} value={s} text={s.replace(/_/g, ' ')} />
                          ))}
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
