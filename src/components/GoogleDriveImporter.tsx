import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  listDriveAudioFiles,
  downloadDriveFileAsFile,
  DriveFileItem,
  getCurrentUser,
  getAccessToken,
} from '../services/googleAuth';
import {
  Search,
  RefreshCw,
  Music,
  Film,
  DownloadCloud,
  Sparkles,
  AlertCircle,
  LogOut,
  CheckCircle2,
  Scissors,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { estimateSplitPartsCount, formatSecondsToTime } from '../utils/audioUtils';

interface GoogleDriveImporterProps {
  onFileImported: (
    file: File,
    title?: string,
    subject?: string,
    durationSec?: number | null
  ) => void;
  isLoading: boolean;
}

export const GoogleDriveImporter: React.FC<GoogleDriveImporterProps> = ({
  onFileImported,
  isLoading,
}) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);

  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFileItem | null>(
    null
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    downloaded: number;
    total: number;
  } | null>(null);

  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureSubject, setLectureSubject] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser) => {
        setUser(authUser);
        setNeedsAuth(false);
        fetchDriveFiles('');
      },
      () => {
        setUser(getCurrentUser());
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchDriveFiles = async (query = searchQuery, pageToken?: string) => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setIsFetchingFiles(true);
    setErrorMsg(null);

    try {
      const result = await listDriveAudioFiles(query, pageToken);
      if (pageToken) {
        setFiles((prev) => [...prev, ...result.files]);
      } else {
        setFiles(result.files);
      }
      setNextPageToken(result.nextPageToken);
    } catch (err: any) {
      if (err.message === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        setErrorMsg(
          err.message || 'Não foi possível carregar seus arquivos do Google Drive.'
        );
      }
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        await fetchDriveFiles('');
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setErrorMsg(
        err?.message || 'Não foi possível autenticar com o Google Drive.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setFiles([]);
    setSelectedDriveFile(null);
  };

  const handleSelectAndTranscribe = async (driveFile: DriveFileItem) => {
    setSelectedDriveFile(driveFile);
    setDownloadingId(driveFile.id);
    setDownloadProgress({ downloaded: 0, total: parseInt(driveFile.size || '0', 10) });
    setErrorMsg(null);

    const autoTitle =
      lectureTitle.trim() ||
      driveFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    try {
      const downloadedFile = await downloadDriveFileAsFile(
        driveFile,
        (downloaded, total) => {
          setDownloadProgress({ downloaded, total });
        }
      );

      // Probe audio duration quickly so the auto-splitter knows the exact length
      const durationSec = await new Promise<number | null>((resolve) => {
        const tempUrl = URL.createObjectURL(downloadedFile);
        const audio = new Audio(tempUrl);
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(tempUrl);
          resolve(null);
        }, 4000);
        audio.onloadedmetadata = () => {
          clearTimeout(timeout);
          const d = Number.isFinite(audio.duration) ? audio.duration : null;
          URL.revokeObjectURL(tempUrl);
          resolve(d);
        };
        audio.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(tempUrl);
          resolve(null);
        };
      });

      onFileImported(
        downloadedFile,
        autoTitle,
        lectureSubject.trim() || undefined,
        durationSec
      );
    } catch (err: any) {
      if (err.message === 'AUTH_REQUIRED') {
        setNeedsAuth(true);
      } else {
        setErrorMsg(
          err.message || 'Falha ao importar o arquivo do Google Drive.'
        );
      }
    } finally {
      setDownloadingId(null);
      setDownloadProgress(null);
    }
  };

  const formatFileSize = (sizeStr?: string) => {
    const bytes = parseInt(sizeStr || '0', 10);
    if (!bytes) return 'Tamanho variável';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Importar Áudio ou Vídeo do Google Drive
            </h3>
            <p className="text-xs text-slate-400">
              Selecione gravações direto do seu Drive • Arquivos grandes são divididos e unificados automaticamente
            </p>
          </div>
        </div>

        {!needsAuth && user && (
          <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Usuário'}
                className="w-6 h-6 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="text-xs">
              <span className="text-slate-200 font-medium block">
                {user.displayName || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
              title="Desconectar Google Drive"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* If Not Authenticated: Show Official Sign in with Google Card */}
      {needsAuth ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/60 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <HardDrive className="w-8 h-8" />
          </div>

          <div className="max-w-md space-y-1.5">
            <h4 className="text-base font-bold text-white">
              Conecte seu Google Drive para acessar suas aulas
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Faça login com sua conta Google para listar e importar seus arquivos de áudio ou vídeo (MP3, WAV, M4A, MP4, gravações do Meet) com permissão somente-leitura.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="gsi-material-button"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isLoggingIn ? 'Conectando ao Google...' : 'Sign in with Google'}
              </span>
              <span style={{ display: 'none' }}>Sign in with Google</span>
            </div>
          </button>
        </div>
      ) : (
        /* Authenticated: Show Title/Subject Inputs, Search Bar, and Drive File Browser */
        <div className="space-y-5">
          {/* Optional Title & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Título da Aula (Opcional)
              </label>
              <input
                type="text"
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
                disabled={isLoading || !!downloadingId}
                placeholder="Preenchido automaticamente pelo nome do arquivo"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Disciplina / Área (Opcional)
              </label>
              <input
                type="text"
                value={lectureSubject}
                onChange={(e) => setLectureSubject(e.target.value)}
                disabled={isLoading || !!downloadingId}
                placeholder="Ex: Direito Constitucional, Física..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Search & Refresh Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchDriveFiles(searchQuery);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar aulas por nome no seu Google Drive..."
                className="w-full bg-slate-950/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isFetchingFiles}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
            >
              Buscar
            </button>

            <button
              type="button"
              onClick={() => fetchDriveFiles(searchQuery)}
              disabled={isFetchingFiles}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              title="Atualizar lista do Drive"
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetchingFiles ? 'animate-spin' : ''}`}
              />
            </button>
          </form>

          {/* Active Download Progress Banner */}
          {downloadingId && selectedDriveFile && (
            <div className="p-4 rounded-2xl bg-indigo-950/50 border border-indigo-500/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-200 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Baixando do Google Drive: {selectedDriveFile.name}
                </span>
                {downloadProgress && downloadProgress.total > 0 && (
                  <span className="font-mono text-indigo-300">
                    {Math.min(
                      100,
                      Math.round(
                        (downloadProgress.downloaded / downloadProgress.total) * 100
                      )
                    )}
                    %
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-200"
                  style={{
                    width:
                      downloadProgress && downloadProgress.total > 0
                        ? `${Math.min(
                            100,
                            Math.round(
                              (downloadProgress.downloaded /
                                downloadProgress.total) *
                                100
                            )
                          )}%`
                        : '60%',
                  }}
                />
              </div>
            </div>
          )}

          {/* Files Grid */}
          {isFetchingFiles && files.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <span className="text-xs sm:text-sm">
                Buscando arquivos de áudio e vídeo no seu Google Drive...
              </span>
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-2">
              <p className="text-sm font-medium text-slate-300">
                Nenhum arquivo de áudio ou vídeo encontrado com esse filtro.
              </p>
              <p className="text-xs text-slate-500">
                Verifique se o seu Google Drive possui arquivos MP3, WAV, M4A, OGG, WEBM ou MP4.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {files.map((file) => {
                const sizeNum = parseInt(file.size || '0', 10);
                const estParts = estimateSplitPartsCount(sizeNum, null);
                const isVideo = file.mimeType?.includes('video');
                const isThisDownloading = downloadingId === file.id;

                return (
                  <div
                    key={file.id}
                    className="p-4 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        {isVideo ? (
                          <Film className="w-5 h-5 text-violet-400" />
                        ) : (
                          <Music className="w-5 h-5 text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4
                          className="text-xs sm:text-sm font-semibold text-white truncate"
                          title={file.name}
                        >
                          {file.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{formatFileSize(file.size)}</span>
                          {file.modifiedTime && (
                            <>
                              <span>•</span>
                              <span>{formatDate(file.modifiedTime)}</span>
                            </>
                          )}
                          {estParts > 1 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                              <Scissors className="w-2.5 h-2.5" /> ~{estParts}{' '}
                              partes
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectAndTranscribe(file)}
                      disabled={isLoading || !!downloadingId}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      {isThisDownloading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Importando...</span>
                        </>
                      ) : (
                        <>
                          <DownloadCloud className="w-3.5 h-3.5" />
                          <span>Transcrever</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {nextPageToken && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => fetchDriveFiles(searchQuery, nextPageToken)}
                disabled={isFetchingFiles}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
              >
                Carregar mais arquivos do Drive
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
