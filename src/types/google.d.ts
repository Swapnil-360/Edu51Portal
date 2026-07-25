/**
 * TypeScript declarations for Google Identity Services (GIS) and Google API
 */

interface Window {
  gapi: any;
  google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: any) => void;
        }) => any;
        revoke: (token: string, callback: () => void) => void;
      };
    };
    picker: any;
  };
}
