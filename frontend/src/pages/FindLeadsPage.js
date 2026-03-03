import React, { useState } from 'react';
import {
  Grid,
  Column,
  Tile,
  TextInput,
  NumberInput,
  Button,
  Select,
  SelectItem,
  InlineNotification,
  ProgressBar,
  Tag,
  Accordion,
  AccordionItem,
} from '@carbon/react';
import { Search, Play, DataTable, Earth } from '@carbon/icons-react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';

const POPULAR_NICHES = [
  'Restaurant', 'Dentist', 'Plumber', 'Real Estate Agent', 'Hair Salon',
  'Auto Repair', 'Gym', 'Lawyer', 'Bakery', 'Veterinarian',
  'Accountant', 'Chiropractor', 'Photographer', 'Florist', 'Yoga Studio',
  'Coffee Shop', 'Pet Groomer', 'Interior Designer', 'Therapist', 'Roofing',
  'Electrician', 'Landscaper', 'Car Wash', 'Tattoo Shop', 'Barber Shop',
];

export default function FindLeadsPage() {
  const [niche, setNiche] = useState('');
  const [region, setRegion] = useState('');
  const [radiusKm, setRadiusKm] = useState(25);
  const [results, setResults] = useState(null);

  const searchMutation = useMutation({
    mutationFn: (data) => api.scraper.search(data),
    onSuccess: (data) => setResults(data),
  });

  const handleSearch = () => {
    if (!niche || !region) return;
    searchMutation.mutate({
      niche,
      region,
      radius_km: radiusKm,
    });
  };

  return (
    <div>
      <div className="oc-page-header">
        <div>
          <h1>Find Leads</h1>
          <p>Discover businesses worldwide that need a new website or redesign</p>
        </div>
      </div>

      <Grid narrow>
        {/* Search Form */}
        <Column lg={12} md={8} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile style={{ padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>
              <Search size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Search Parameters
            </h4>

            <Grid narrow>
              <Column lg={5} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                <TextInput
                  id="niche"
                  labelText="Business Niche / Category"
                  placeholder="e.g. Dentist, Restaurant, Hair Salon"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </Column>

              <Column lg={5} md={4} sm={4} style={{ marginBottom: '1rem' }}>
                <TextInput
                  id="region"
                  labelText="Location / Region"
                  placeholder="e.g. Miami, FL or London, UK"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--cds-text-helper)', marginTop: 4 }}>
                  <Earth size={12} style={{ verticalAlign: 'middle' }} /> Works worldwide — any city, state, or country
                </div>
              </Column>

              <Column lg={3} md={2} sm={2} style={{ marginBottom: '1rem' }}>
                <NumberInput
                  id="radius"
                  label="Radius (km)"
                  min={5}
                  max={100}
                  value={radiusKm}
                  onChange={(e, { value }) => setRadiusKm(value)}
                />
              </Column>

              <Column lg={3} md={2} sm={2} style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <Button
                  renderIcon={Play}
                  onClick={handleSearch}
                  disabled={searchMutation.isPending || !niche || !region}
                  style={{ width: '100%' }}
                >
                  {searchMutation.isPending ? 'Searching…' : 'Start Discovery'}
                </Button>
              </Column>
            </Grid>

            {searchMutation.isPending && (
              <ProgressBar
                label="Searching Google Maps…"
                style={{ marginTop: '1rem' }}
              />
            )}

            {searchMutation.isError && (
              <InlineNotification
                kind="error"
                title="Search failed"
                subtitle={searchMutation.error?.message}
                lowContrast
                style={{ marginTop: '1rem' }}
              />
            )}
          </Tile>
        </Column>

        {/* Quick Niche Picks */}
        <Column lg={4} md={8} sm={4} style={{ marginBottom: '1.5rem' }}>
          <Tile style={{ padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>
              Popular Niches
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {POPULAR_NICHES.map((n) => (
                <Tag
                  key={n}
                  type={n === niche ? 'purple' : 'cool-gray'}
                  size="sm"
                  onClick={() => setNiche(n)}
                  style={{ cursor: 'pointer' }}
                >
                  {n}
                </Tag>
              ))}
            </div>
          </Tile>
        </Column>

        {/* Results */}
        {results && (
          <Column lg={16} md={8} sm={4}>
            <Tile style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  <DataTable size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Discovery Results
                </h4>
                <Tag type="green" size="sm">
                  {results.saved || results.total || 0} leads saved
                </Tag>
              </div>

              {results.message && (
                <InlineNotification
                  kind="success"
                  subtitle={results.message}
                  lowContrast
                  hideCloseButton
                  style={{ marginBottom: '1rem' }}
                />
              )}

              {results.leads?.length > 0 && (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {results.leads.slice(0, 20).map((lead, i) => (
                    <div
                      key={lead.id || i}
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
                          {lead.category} · {lead.city || lead.address}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {lead.website_status === 'none' && <Tag type="red" size="sm">No Website</Tag>}
                        {lead.rating && <Tag type="outline" size="sm">★ {lead.rating}</Tag>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Tile>
          </Column>
        )}
      </Grid>
    </div>
  );
}
