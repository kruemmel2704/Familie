import { Configuration } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MS_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MS_TENANT_ID || "common"}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

// Add scopes for ID token and basic user info
export const loginRequest = {
  scopes: ["User.Read"]
};
