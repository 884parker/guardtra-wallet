// Legacy file — Base44 app params no longer needed.
// Supabase config is loaded from environment variables via supabaseClient.js.
// This file exists only to prevent import errors from any remaining references.

export const appParams = {
  appId: null,
  token: null,
  fromUrl: window?.location?.href,
  functionsVersion: null,
  appBaseUrl: null,
};
