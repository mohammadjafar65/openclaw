import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Grid,
  Column,
  Tile,
  Button,
  TextInput,
  PasswordInput,
  NumberInput,
  Toggle,
  Select,
  SelectItem,
  InlineNotification,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  StructuredListWrapper,
  StructuredListBody,
  StructuredListRow,
  StructuredListCell,
} from '@carbon/react';
import { Save, Settings as SettingsIcon } from '@carbon/icons-react';
import api from '../services/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({});
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.settings.get(),
  });

  useEffect(() => {
    if (data?.settings || data) {
      const map = {};
      const arr = data.settings || data;
      if (Array.isArray(arr)) {
        arr.forEach(s => { map[s.key_name] = s.value; });
      } else if (typeof arr === 'object') {
        Object.assign(map, arr);
      }
      setSettings(map);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.settings.update(data),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  return (
    <div>
      <div className="oc-page-header">
        <div>
          <h1>Settings</h1>
          <p>Configure platform behavior, API keys, and SMTP</p>
        </div>
        <Button renderIcon={Save} size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving…' : 'Save All'}
        </Button>
      </div>

      {saved && (
        <InlineNotification kind="success" subtitle="Settings saved successfully" lowContrast style={{ marginBottom: '1rem' }} />
      )}

      {saveMutation.isError && (
        <InlineNotification kind="error" subtitle={saveMutation.error?.message} lowContrast style={{ marginBottom: '1rem' }} />
      )}

      <Tabs>
        <TabList aria-label="Settings tabs">
          <Tab>General</Tab>
          <Tab>Email / SMTP</Tab>
          <Tab>API Keys</Tab>
          <Tab>Scraping</Tab>
          <Tab>Compliance</Tab>
        </TabList>
        <TabPanels>
          {/* General */}
          <TabPanel>
            <Grid narrow style={{ marginTop: '1rem' }}>
              <Column lg={8} md={4} sm={4}>
                <Tile style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>General Settings</h4>
                  <TextInput
                    id="company-name"
                    labelText="Company / Agency Name"
                    value={settings.company_name || ''}
                    onChange={(e) => updateSetting('company_name', e.target.value)}
                    style={{ marginBottom: '1rem' }}
                  />
                  <TextInput
                    id="sender-name"
                    labelText="Default Sender Name"
                    value={settings.sender_name || ''}
                    onChange={(e) => updateSetting('sender_name', e.target.value)}
                    helperText="Used in outreach emails"
                    style={{ marginBottom: '1rem' }}
                  />
                  <TextInput
                    id="sender-email"
                    labelText="Default Sender Email"
                    value={settings.sender_email || ''}
                    onChange={(e) => updateSetting('sender_email', e.target.value)}
                    style={{ marginBottom: '1rem' }}
                  />
                </Tile>
              </Column>
            </Grid>
          </TabPanel>

          {/* SMTP */}
          <TabPanel>
            <Grid narrow style={{ marginTop: '1rem' }}>
              <Column lg={8} md={4} sm={4}>
                <Tile style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>SMTP Configuration</h4>
                  <TextInput
                    id="smtp-host"
                    labelText="SMTP Host"
                    value={settings.smtp_host || ''}
                    onChange={(e) => updateSetting('smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                    style={{ marginBottom: '1rem' }}
                  />
                  <TextInput
                    id="smtp-port"
                    labelText="SMTP Port"
                    value={settings.smtp_port || '587'}
                    onChange={(e) => updateSetting('smtp_port', e.target.value)}
                    style={{ marginBottom: '1rem' }}
                  />
                  <TextInput
                    id="smtp-user"
                    labelText="SMTP Username"
                    value={settings.smtp_user || ''}
                    onChange={(e) => updateSetting('smtp_user', e.target.value)}
                    style={{ marginBottom: '1rem' }}
                  />
                  <PasswordInput
                    id="smtp-pass"
                    labelText="SMTP Password"
                    value={settings.smtp_pass || ''}
                    onChange={(e) => updateSetting('smtp_pass', e.target.value)}
                    style={{ marginBottom: '1rem' }}
                  />
                  <TextInput
                    id="daily-cap"
                    labelText="Daily Email Cap"
                    value={settings.daily_email_cap || '50'}
                    onChange={(e) => updateSetting('daily_email_cap', e.target.value)}
                    helperText="Maximum emails sent per day"
                    style={{ marginBottom: '1rem' }}
                  />
                </Tile>
              </Column>
            </Grid>
          </TabPanel>

          {/* API Keys */}
          <TabPanel>
            <Grid narrow style={{ marginTop: '1rem' }}>
              <Column lg={8} md={4} sm={4}>
                <Tile style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>API Keys</h4>
                  <PasswordInput
                    id="anthropic-key"
                    labelText="Anthropic API Key (Claude)"
                    value={settings.anthropic_api_key || ''}
                    onChange={(e) => updateSetting('anthropic_api_key', e.target.value)}
                    helperText="Used for AI audit, scoring, and email personalization"
                    style={{ marginBottom: '1rem' }}
                  />
                  <PasswordInput
                    id="hunter-key"
                    labelText="Hunter.io API Key"
                    value={settings.hunter_api_key || ''}
                    onChange={(e) => updateSetting('hunter_api_key', e.target.value)}
                    helperText="Used for email enrichment (optional)"
                    style={{ marginBottom: '1rem' }}
                  />
                  <PasswordInput
                    id="google-maps-key"
                    labelText="Google Maps API Key"
                    value={settings.google_maps_key || ''}
                    onChange={(e) => updateSetting('google_maps_key', e.target.value)}
                    helperText="Used for lead discovery via Places API"
                    style={{ marginBottom: '1rem' }}
                  />
                </Tile>
              </Column>
            </Grid>
          </TabPanel>

          {/* Scraping */}
          <TabPanel>
            <Grid narrow style={{ marginTop: '1rem' }}>
              <Column lg={8} md={4} sm={4}>
                <Tile style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>Scraping Settings</h4>
                  <TextInput
                    id="scrape-delay"
                    labelText="Scrape Delay (ms)"
                    value={settings.scrape_delay_ms || '2000'}
                    onChange={(e) => updateSetting('scrape_delay_ms', e.target.value)}
                    helperText="Delay between API requests to avoid rate limits"
                    style={{ marginBottom: '1rem' }}
                  />
                  <TextInput
                    id="min-rating"
                    labelText="Minimum Rating Filter"
                    value={settings.min_rating || '0'}
                    onChange={(e) => updateSetting('min_rating', e.target.value)}
                    helperText="Only save leads with this rating or higher"
                    style={{ marginBottom: '1rem' }}
                  />
                  <TextInput
                    id="min-reviews"
                    labelText="Minimum Reviews Filter"
                    value={settings.min_reviews || '0'}
                    onChange={(e) => updateSetting('min_reviews', e.target.value)}
                    helperText="Only save leads with this many reviews or more"
                    style={{ marginBottom: '1rem' }}
                  />
                </Tile>
              </Column>
            </Grid>
          </TabPanel>

          {/* Compliance */}
          <TabPanel>
            <Grid narrow style={{ marginTop: '1rem' }}>
              <Column lg={8} md={4} sm={4}>
                <Tile style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '1rem' }}>Compliance Settings</h4>
                  <TextInput
                    id="unsubscribe-footer"
                    labelText="Unsubscribe Footer Text"
                    value={settings.unsubscribe_footer || 'If you prefer not to receive further emails, click here to unsubscribe.'}
                    onChange={(e) => updateSetting('unsubscribe_footer', e.target.value)}
                    helperText="Appended to every outreach email"
                    style={{ marginBottom: '1rem' }}
                  />

                  <StructuredListWrapper>
                    <StructuredListBody>
                      <StructuredListRow>
                        <StructuredListCell>Public Opt-Out Page</StructuredListCell>
                        <StructuredListCell style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem' }}>
                          /api/compliance/opt-out
                        </StructuredListCell>
                      </StructuredListRow>
                      <StructuredListRow>
                        <StructuredListCell>Data Sources</StructuredListCell>
                        <StructuredListCell>Google Maps Places API, public website crawling</StructuredListCell>
                      </StructuredListRow>
                      <StructuredListRow>
                        <StructuredListCell>Data Policy</StructuredListCell>
                        <StructuredListCell>Public data only — no private databases, no purchased lists</StructuredListCell>
                      </StructuredListRow>
                    </StructuredListBody>
                  </StructuredListWrapper>
                </Tile>
              </Column>
            </Grid>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
