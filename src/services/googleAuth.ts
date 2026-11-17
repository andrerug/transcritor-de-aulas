import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

const provider = new GoogleAuthProvider();
for (const scope of SCOPES) {
  provider.addScope(scope);
}

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage or sessionStorage).
let cachedAccessToken: string | null = null;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter o token de acesso do Google Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Lists audio and video files from the user's Google Drive.
 */
export const listDriveAudioFiles = async (
  searchQuery = '',
  pageToken?: string
): Promise<{ files: DriveFileItem[]; nextPageToken?: string }> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const baseFilter =
    "trashed = false and (mimeType contains 'audio/' or mimeType contains 'video/' or name contains '.mp3' or name contains '.wav' or name contains '.m4a' or name contains '.ogg' or name contains '.mp4' or name contains '.webm' or name contains '.flac')";

  const escapedSearch = searchQuery.trim().replace(/'/g, "\\'");
  const q = escapedSearch
    ? `${baseFilter} and name contains '${escapedSearch}'`
    : baseFilter;

  const params = new URLSearchParams({
    q,
    pageSize: '24',
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, iconLink)',
    orderBy: 'modifiedTime desc',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || 'Erro ao buscar arquivos no Google Drive.'
    );
  }

  const data = await res.json();
  return {
    files: data.files || [],
    nextPageToken: data.nextPageToken,
  };
};

/**
 * Downloads a file's binary content from Google Drive with progress reporting.
 */
export const downloadDriveFileAsFile = async (
  driveFile: DriveFileItem,
  onProgress?: (downloadedBytes: number, totalBytes: number) => void
): Promise<File> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_REQUIRED');
  }

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      driveFile.id
    )}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (res.status === 401 || res.status === 403) {
    cachedAccessToken = null;
    throw new Error('AUTH_REQUIRED');
  }

  if (!res.ok) {
    throw new Error('Falha ao baixar o arquivo selecionado do Google Drive.');
  }

  const totalBytes =
    parseInt(res.headers.get('content-length') || driveFile.size || '0', 10) || 0;

  if (!res.body) {
    const blob = await res.blob();
    return new File([blob], driveFile.name, {
      type: driveFile.mimeType || 'audio/mp3',
    });
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      receivedLength += value.length;
      onProgress?.(receivedLength, totalBytes);
    }
  }

  const blob = new Blob(chunks as BlobPart[], {
    type: driveFile.mimeType || 'audio/mp3',
  });
  return new File([blob], driveFile.name, {
    type: driveFile.mimeType || 'audio/mp3',
  });
};
