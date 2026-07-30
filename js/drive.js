import { GOOGLE_CLIENT_ID } from './drive-config.js';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const SYNC_FILENAME = 'my-madam-g-sync.enc.json';

let tokenClient = null;
let cachedToken = null;
let cachedTokenExpiresAt = 0;

function loadGisScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('gis-script');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const script = document.createElement('script');
    script.id = 'gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google Sign-In script (are you online?)'));
    document.head.appendChild(script);
  });
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt) return cachedToken;

  if (GOOGLE_CLIENT_ID.startsWith('YOUR_CLIENT_ID')) {
    throw new Error('Google Drive sync is not configured yet (see README.md).');
  }
  await loadGisScript();

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: () => {},
      });
    }
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      cachedToken = resp.access_token;
      cachedTokenExpiresAt = Date.now() + (Number(resp.expires_in) - 60) * 1000;
      resolve(cachedToken);
    };
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

async function driveFetch(url, token, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Drive API error ${res.status}: ${await res.text()}`);
  return res;
}

async function findFileId(token) {
  const q = encodeURIComponent(`name='${SYNC_FILENAME}' and trashed=false`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`,
    token
  );
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function createFile(token, contentStr) {
  const boundary = 'my_madam_g_sync_boundary';
  const metadata = { name: SYNC_FILENAME, mimeType: 'text/plain' };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: text/plain\r\n\r\n${contentStr}\r\n--${boundary}--`;
  const res = await driveFetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    token,
    { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
  );
  const data = await res.json();
  return data.id;
}

async function updateFile(token, fileId, contentStr) {
  await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    token,
    { method: 'PATCH', headers: { 'Content-Type': 'text/plain' }, body: contentStr }
  );
}

async function downloadFile(token, fileId) {
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, token);
  return res.text();
}

export async function pushToDrive(encryptedStr) {
  const token = await getAccessToken();
  let fileId = localStorage.getItem('ptrack_drive_fileid') || (await findFileId(token));
  if (!fileId) {
    fileId = await createFile(token, encryptedStr);
  } else {
    await updateFile(token, fileId, encryptedStr);
  }
  localStorage.setItem('ptrack_drive_fileid', fileId);
  localStorage.setItem('ptrack_drive_lastsync', new Date().toISOString());
  return fileId;
}

export async function pullFromDrive() {
  const token = await getAccessToken();
  const fileId = await findFileId(token);
  if (!fileId) throw new Error('No synced file found yet — ask your partner to sync at least once first.');
  return downloadFile(token, fileId);
}

export function getLastSyncTime() {
  return localStorage.getItem('ptrack_drive_lastsync');
}
