// Shared loader for Google Identity Services (GIS) — used by any flow that
// needs window.google.accounts.oauth2 (e.g. the Drive sign-in token client).
let gisLoadedPromise: Promise<void> | null = null;

export function loadGisScript(): Promise<void> {
  if (gisLoadedPromise) return gisLoadedPromise;

  gisLoadedPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoadedPromise = null;
      reject(new Error('Failed to load Google Identity Services script'));
    };
    document.body.appendChild(script);
  });

  return gisLoadedPromise;
}
