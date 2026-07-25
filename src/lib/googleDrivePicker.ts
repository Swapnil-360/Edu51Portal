// Google Picker — lets an admin explicitly select a Drive folder through
// Google's own UI. Selecting a folder this way authorizes it for the
// `drive.file` scope (per-file/folder access), which is how we plan to
// move off the full, restricted `drive` scope: re-select each already
// configured folder once here, then the app only ever needs drive.file.
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string;

let pickerApiLoadedPromise: Promise<void> | null = null;

function loadPickerApi(): Promise<void> {
  if (pickerApiLoadedPromise) return pickerApiLoadedPromise;

  pickerApiLoadedPromise = new Promise((resolve, reject) => {
    const ready = () => {
      window.gapi.load('picker', { callback: () => resolve() });
    };

    if (window.gapi?.load) {
      ready();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = ready;
    script.onerror = () => {
      pickerApiLoadedPromise = null;
      reject(new Error('Failed to load Google Picker API script'));
    };
    document.body.appendChild(script);
  });

  return pickerApiLoadedPromise;
}

export interface PickedFolder {
  id: string;
  name: string;
}

// When parentFolderId is given, the picker opens rooted inside that folder
// (its existing configured root) instead of the whole Drive — admins only
// ever need to re-select something already inside the folder they set up.
export async function pickDriveFolder(accessToken: string, parentFolderId?: string): Promise<PickedFolder | null> {
  await loadPickerApi();

  return new Promise((resolve, reject) => {
    try {
      const view = new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);
      if (parentFolderId) view.setParent(parentFolderId);

      const width = Math.round(Math.min(1051, window.innerWidth * 0.92));
      const height = Math.round(Math.min(650, window.innerHeight * 0.85));

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setSize(width, height)
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const doc = data.docs?.[0];
            resolve(doc ? { id: doc.id, name: doc.name } : null);
          } else if (data.action === window.google.picker.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      reject(err);
    }
  });
}
