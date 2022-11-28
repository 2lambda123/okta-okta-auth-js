const CLIENT_ID = process.env.SPA_CLIENT_ID || process.env.CLIENT_ID || '{clientId}';
const ISSUER = process.env.ISSUER || 'https://{yourOktaDomain}.com/oauth2/default';
const REDIRECT_URI = `${window.location.origin}/login/callback`;

export default {
  clientId: CLIENT_ID,
  issuer: ISSUER,
  redirectUri: REDIRECT_URI,
  scopes: [
    'openid', 
    'profile', 
    'email', 
    'offline_access', 
    'okta.myAccount.profile.read', 
    'okta.myAccount.profile.manage',
    'okta.myAccount.email.manage',
    'okta.myAccount.phone.manage',
    // 'okta.myAccount.password.read', 
    // 'okta.myAccount.password.manage',
  ],
  pkce: true
};
