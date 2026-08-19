import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

const FB_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? '';
const FB_CONFIGURED = Boolean(FB_APP_ID);

WebBrowser.maybeCompleteAuthSession();

const FB_DISCOVERY = {
  authorizationEndpoint: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenEndpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
};

export function useFacebookSignIn(onToken: (accessToken: string) => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'fb954847224308777',
    path: 'authorize',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: FB_APP_ID,
      redirectUri,
      scopes: ['public_profile', 'email'],
      ...FB_DISCOVERY,
    },
    FB_DISCOVERY,
  );

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const { access_token } = response.params;
      if (access_token) {
        setBusy(true);
        setError(null);
        onToken(access_token)
          .catch((reason) => setError(reason instanceof Error ? reason.message : 'Facebook sign-in failed'))
          .finally(() => setBusy(false));
      } else {
        setError('Facebook sign-in did not return an access token');
      }
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Facebook sign-in was cancelled');
    }
  }, [response, onToken]);

  const prompt = async () => {
    setError(null);
    if (!FB_CONFIGURED) {
      setError('Facebook sign-in is not configured yet.');
      return;
    }
    await promptAsync();
  };

  return { prompt, busy, error, configured: FB_CONFIGURED };
}
