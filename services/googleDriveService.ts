
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BOSS_CLIENT_ID = "438907188354-gru9ppckvkmmg76n8dlg03iu88hd6h3t.apps.googleusercontent.com";

class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private folderCache: Record<string, string> = {};

  init(onAuthSuccess?: (token: string) => void) {
    if (!(window as any).google?.accounts?.oauth2) {
      console.warn("Google GIS script not loaded yet.");
      return;
    }

    try {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: BOSS_CLIENT_ID,
        scope: DRIVE_SCOPE,
        callback: (response: any) => {
          if (response.error) {
            console.error("Auth Error Response:", response);
            if (response.error === 'popup_closed_by_user') return;
            alert(`Auth Error: ${response.error_description || response.error}`);
            return;
          }
          this.accessToken = response.access_token;
          localStorage.setItem('boss_gdrive_token', response.access_token);
          if (onAuthSuccess) onAuthSuccess(response.access_token);
        },
      });

      const existingToken = localStorage.getItem('boss_gdrive_token');
      if (existingToken) {
        this.accessToken = existingToken;
      }
    } catch (err) {
      console.error("GIS Init Failed:", err);
    }
  }

  // Google policy REQUIREMENT: This must be called from a user-initiated event (like a button click)
  // Automatic popups on page load will trigger "invalid_request" or be blocked by browser.
  requestToken() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      // Re-init if needed
      this.init(() => this.tokenClient.requestAccessToken({ prompt: 'consent' }));
    }
  }

  isConnected() {
    return !!this.accessToken || !!localStorage.getItem('boss_gdrive_token');
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem('boss_gdrive_token');
    this.folderCache = {};
  }

  private getHeaders() {
    const token = this.accessToken || localStorage.getItem('boss_gdrive_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getOrCreateFolder(folderName: string): Promise<string> {
    if (this.folderCache[folderName]) return this.folderCache[folderName];

    const headers = this.getHeaders();
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, { headers });
      
      if (response.status === 401) {
        this.logout();
        throw new Error("Unauthorized: Token Expired");
      }

      const data = await response.json();
      if (data.files && data.files.length > 0) {
        this.folderCache[folderName] = data.files[0].id;
        return data.files[0].id;
      }

      const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      const folder = await createResponse.json();
      this.folderCache[folderName] = folder.id;
      return folder.id;
    } catch (error) {
      console.error("Drive Operation Failed:", error);
      throw error;
    }
  }

  async uploadFile(name: string, folderName: string, content: string, mimeType: string) {
    if (!this.isConnected()) return;

    try {
      const folderId = await this.getOrCreateFolder(folderName);
      const headers = this.getHeaders();

      const metadata = { name, parents: [folderId] };
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      
      if (mimeType === 'application/pdf' && content.includes('base64')) {
        const base64Parts = content.split(',');
        const byteCharacters = atob(base64Parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        formData.append('file', new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' }));
      } else {
        formData.append('file', new Blob([content], { type: mimeType }));
      }

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': headers['Authorization'] },
        body: formData,
      });

      if (response.status === 401) this.logout();
      return await response.json();
    } catch (error) {
      console.error("Cloud Upload Failed:", error);
    }
  }
}

export const gDrive = new GoogleDriveService();
