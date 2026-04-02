// ============================================================
//  CHAINVAULT — Google Drive Configuration
//  
//  SETUP INSTRUCTIONS:
//  1. Go to https://console.cloud.google.com
//  2. Create a new project (or use existing)
//  3. Enable "Google Drive API" and "Google Picker API"
//  4. Go to "Credentials" → Create OAuth 2.0 Client ID
//     - Application type: Web application
//     - Authorized origins: http://localhost:5173
//     - Authorized redirect URIs: http://localhost:5173
//  5. Create an API Key (restrict to Drive API + Picker API)
//  6. Paste your values below
// ============================================================

export const GOOGLE_CONFIG = {
  // Your OAuth 2.0 Client ID362967560516
  CLIENT_ID: '362967560516-gja60d0md29dpb4vh7lldb6t4aeqglsb.apps.googleusercontent.com',

  // Your API Key
  API_KEY: 'AIzaSyB3HfRpcuVkZ822pSvlfB8qFpjnz7JJDKI',

  // Required scopes
  SCOPES: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.appdata',
    'profile',
    'email',
  ].join(' '),

  // Drive folder name for encrypted files
  FOLDER_NAME: 'ChainVault_Encrypted',

  // Discovery docs
  DISCOVERY_DOCS: [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  ],
}
