import { useState, useCallback, useEffect } from 'react';
import { loadGisScript } from '../lib/googleIdentityServices';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
// drive.file: only files/folders the app created OR that the admin has
// explicitly authorized via the Drive Picker (see MaterialManager's "Pick"
// buttons) — narrower than the full `drive` scope, which Google classifies
// as restricted and requires a paid CASA security assessment to verify.
const SCOPE = 'https://www.googleapis.com/auth/drive.file openid profile email';

export interface DriveUserProfile {
  email: string;
  name: string | null;
  picture: string | null;
}

// Module-level cache survives re-renders
let _cached: { token: string; expiresAt: number } | null = null;
let _profile: DriveUserProfile | null = null;

async function fetchProfile(accessToken: string): Promise<DriveUserProfile | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const d = await res.json();
    return { email: d.email ?? '', name: d.name ?? null, picture: d.picture ?? null };
  } catch {
    return null;
  }
}

// Uses Google Identity Services' token client instead of hand-rolling the
// redirect-based implicit flow — Google's OAuth project checkup flags raw
// response_type=token popups as a deprecated/insecure flow, and GIS also
// gets us incremental-authorization support for free via
// include_granted_scopes.
function requestDriveToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    loadGisScript()
      .then(() => {
        if (!CLIENT_ID) {
          reject(new Error('Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file'));
          return;
        }

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }
            resolve(response.access_token as string);
          },
        });

        client.requestAccessToken({ prompt: 'consent' });
      })
      .catch(reject);
  });
}

export function useGoogleDriveAuth() {
  const [token, setToken] = useState<string | null>(
    _cached && Date.now() < _cached.expiresAt ? _cached.token : null,
  );
  const [profile, setProfile] = useState<DriveUserProfile | null>(_profile);
  const [loading, setLoading] = useState(false);

  // Auto-fetch profile when token is available but profile is missing
  // (e.g. after a page reload where _profile module-level cache is cleared)
  useEffect(() => {
    if (!token) return;
    if (_profile) { setProfile(_profile); return; }
    fetchProfile(token).then(p => {
      if (p) { _profile = p; setProfile(p); }
    }).catch(() => {});
  }, [token]);

  const getToken = useCallback((): Promise<string> => {
    if (_cached && Date.now() < _cached.expiresAt) {
      setToken(_cached.token);
      setProfile(_profile);
      return Promise.resolve(_cached.token);
    }

    setLoading(true);
    return requestDriveToken()
      .then(t => {
        _cached = { token: t, expiresAt: Date.now() + 55 * 60 * 1000 };
        setToken(t);
        setLoading(false);
        fetchProfile(t).then(p => { _profile = p; setProfile(p); }).catch(() => {});
        return t;
      })
      .catch(e => {
        setLoading(false);
        throw e;
      });
  }, []);

  const signOut = useCallback(() => {
    _cached = null;
    _profile = null;
    setToken(null);
    setProfile(null);
  }, []);

  return { token, profile, loading, getToken, signOut };
}
