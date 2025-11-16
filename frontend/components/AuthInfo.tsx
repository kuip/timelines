'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';

// Generate random state for CSRF protection
function generateState(): string {
  return Math.random().toString(36).substring(7);
}

export const AuthInfo = () => {
  const { user, isLoading, isAuthenticated, isTwitterVerified, login, logout } = useAuth();

  // Handle OAuth callback - check on mount
  useEffect(() => {
    // Get params directly from window.location since useSearchParams may not have them initially
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    console.log('Checking for OAuth callback...', { code: code ? code.substring(0, 10) + '...' : null, state, fullUrl: window.location.href });

    if (code && state) {
      // Exchange code for token with backend
      exchangeCodeForToken(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []); // Only run on mount

  const exchangeCodeForToken = async (code: string) => {
    try {
      console.log('Exchanging code for token...', { code: code.substring(0, 10) + '...' });

      const response = await fetch('http://localhost:8080/auth/exchange-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      console.log('Exchange response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', { id: data.user_id, username: data.username, isVerified: data.is_verified });
        login(data.session_token, {
          id: data.user_id,
          username: data.username,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          isTwitterVerified: data.is_verified,
        });
      } else {
        const error = await response.json();
        console.error('OAuth exchange failed:', error);
      }
    } catch (error) {
      console.error('Failed to exchange code for token:', error);
    }
  };

  const handleTwitterLogin = () => {
    // Generate OAuth state for CSRF protection
    const state = generateState();
    sessionStorage.setItem('oauth_state', state);

    // X OAuth 2.0 Authorization URL (basic OAuth without PKCE for now)
    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || '';
    const redirectUri = 'http://localhost:3000/';
    const scope = 'tweet.read users.read offline.access';
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

    console.log('Redirecting to X OAuth:', { authUrl, clientId });
    window.location.href = authUrl;
  };

  if (isLoading) {
    return <div className="text-xs text-gray-400">Loading...</div>;
  }

  const handleDevLogin = () => {
    login('4337e7e5-8aaa-5e7f-9ab7-8e43e8b6c7f5', {
      id: '4337e7e5-8aaa-5e7f-9ab7-8e43e8b6c7f5',
      username: 'ctzurcanu',
      displayName: 'Christian Tzurcanu',
      avatarUrl: '',
      isTwitterVerified: true,
    });
  };

  return (
    <div className="flex items-center gap-2">
      {isAuthenticated ? (
        <>
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-8 h-8 rounded-full cursor-pointer hover:opacity-80 transition"
              onClick={logout}
              title={`${user.displayName} - Click to logout`}
            />
          ) : (
            <button
              onClick={logout}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded-full transition flex items-center justify-center"
              title={`${user?.displayName} - Click to logout`}
            >
              𝕏
            </button>
          )}
        </>
      ) : (
        <button
          onClick={handleTwitterLogin}
          className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white text-lg rounded-full transition flex items-center justify-center"
          title="Login with Twitter"
        >
          𝕏
        </button>
      )}
    </div>
  );
};

export default AuthInfo;
