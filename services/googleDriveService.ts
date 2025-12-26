
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private folderCache: Record<string, string> = {};

  // Initialize the client with a specific ID
  init(clientId: string, onAuthSuccess: (token: string) => void) {
    if (!(window as any).google?.accounts?.oauth2) {
      console.error("Google GSI script not loaded");
      return;
    }

    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response: any) => {
        if (response.error) {
          console.error("Auth Error:", response);
          return;
        }
        this.accessToken = response.access_token;
        localStorage.setItem('boss_gdrive_token', response.access_token);
        onAuthSuccess(response.access_token);
      },
    });
  }

  requestToken() {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      console.error("Token client not initialized. Call init() first.");
    }
  }

  isConnected() {
    return !!this.accessToken || !!localStorage.getItem('boss_gdrive_token');
  }

  logout() {
    this.accessToken = null;
    localStorage.removeItem('boss_gdrive_token');
    localStorage.removeItem('boss_gdrive_client_id');
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
      console.error("Folder creation failed:", error);
      throw error;
    }
  }

  async uploadFile(name: string, folderName: string, content: string, mimeType: string) {
    if (!this.isConnected()) return;

    try {
      const folderId = await this.getOrCreateFolder(folderName);
      const headers = this.getHeaders();

      const metadata = {
        name: name,
        parents: [folderId],
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      
      if (mimeType === 'application/pdf' && content.includes('base64')) {
        // Convert base64 to blob
        const base64Parts = content.split(',');
        const contentType = base64Parts[0].split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });
        formData.append('file', blob);
      } else {
        formData.append('file', new Blob([content], { type: mimeType }));
      }

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': headers['Authorization'] },
        body: formData,
      });

      return await response.json();
    } catch (error) {
      console.error("Upload failed:", error);
      // If unauthorized, clear token
      if ((error as any).status === 401) {
        this.logout();
      }
    }
  }
}

export const gDrive = new GoogleDriveService();
