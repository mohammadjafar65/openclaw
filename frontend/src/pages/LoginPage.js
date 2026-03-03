import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Theme,
  Grid,
  Column,
  TextInput,
  PasswordInput,
  Button,
  InlineNotification,
  Tile,
} from '@carbon/react';
import { Login } from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Theme theme="g100">
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#161616',
        padding: '2rem',
      }}>
        <Grid narrow style={{ maxWidth: 420, width: '100%' }}>
          <Column lg={16} md={8} sm={4}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-1px',
              }}>
                Open<span style={{ color: '#6929c4' }}>Claw</span>
              </h1>
              <p style={{
                color: '#a8a8a8',
                fontSize: '0.875rem',
                marginTop: '0.5rem',
              }}>
                AI-Powered Lead Discovery for Web Design Agencies
              </p>
            </div>

            <Tile style={{ padding: '2rem' }}>
              <form onSubmit={handleSubmit}>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  marginBottom: '1.5rem',
                  color: 'var(--cds-text-primary)',
                }}>
                  Sign in
                </h2>

                {error && (
                  <InlineNotification
                    kind="error"
                    title="Error"
                    subtitle={error}
                    lowContrast
                    hideCloseButton
                    style={{ marginBottom: '1rem' }}
                  />
                )}

                <TextInput
                  id="email"
                  labelText="Email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ marginBottom: '1rem' }}
                  autoFocus
                />

                <PasswordInput
                  id="password"
                  labelText="Password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ marginBottom: '1.5rem' }}
                />

                <Button
                  type="submit"
                  renderIcon={Login}
                  disabled={loading || !email || !password}
                  style={{ width: '100%' }}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>
            </Tile>

            <p style={{
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#6f6f6f',
              marginTop: '1.5rem',
            }}>
              Public data only — Compliance-first prospecting
            </p>
          </Column>
        </Grid>
      </div>
    </Theme>
  );
}
