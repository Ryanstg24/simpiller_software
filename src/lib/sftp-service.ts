// Mock SFTP service to avoid build issues with native modules
// This will be replaced with actual SFTP functionality when deployed to a non-serverless environment

export interface SFTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
  completedPath: string;
}

export interface MedicationFile {
  filename: string;
  content: string;
  size: number;
  modifiedTime: Date;
}

export class SFTPService {
  private config: SFTPConfig;
  private client: any;

  constructor(config: SFTPConfig) {
    this.config = config;
    this.client = null;
  }

  private async initializeClient(): Promise<void> {
    if (!this.client) {
      // Mock client for build compatibility
      this.client = {
        connect: async () => {
          console.log('[SFTP Mock] Mock connection established');
        },
        disconnect: async () => {
          console.log('[SFTP Mock] Mock disconnection');
        },
        list: async () => {
          console.log('[SFTP Mock] Mock file listing - returning empty array');
          return [];
        },
        get: async () => {
          console.log('[SFTP Mock] Mock file read - returning empty content');
          return Buffer.from('');
        },
        stat: async () => {
          console.log('[SFTP Mock] Mock file stats');
          return { size: 0, modifyTime: Date.now() };
        },
        rename: async () => {
          console.log('[SFTP Mock] Mock file rename');
        },
        mkdir: async () => {
          console.log('[SFTP Mock] Mock directory creation');
        }
      };
    }
  }

  async connect(): Promise<void> {
    try {
      await this.initializeClient();
      await this.client.connect({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        readyTimeout: 20000,
        retries: 3,
        retry_minTimeout: 2000,
      });
      console.log('[SFTP] Connected successfully to', this.config.host);
    } catch (error) {
      console.error('[SFTP] Connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.end();
        console.log('[SFTP] Disconnected successfully');
      }
    } catch (error) {
      console.error('[SFTP] Disconnect error:', error);
    }
  }

  async listFiles(): Promise<string[]> {
    try {
      if (!this.client) {
        await this.initializeClient();
      }
      const files = await this.client.list(this.config.remotePath);
      // Filter for .rpj files only
      const rpjFiles = files
        .filter((file: any) => file.name.endsWith('.rpj'))
        .map((file: any) => file.name);
      
      console.log(`[SFTP] Found ${rpjFiles.length} .rpj files in ${this.config.remotePath}`);
      return rpjFiles;
    } catch (error) {
      console.error('[SFTP] Error listing files:', error);
      throw error;
    }
  }

  async readFile(filename: string): Promise<MedicationFile> {
    try {
      if (!this.client) {
        await this.initializeClient();
      }
      const filePath = `${this.config.remotePath}/${filename}`;
      const stats = await this.client.stat(filePath);
      const content = await this.client.get(filePath);
      
      console.log(`[SFTP] Read file: ${filename} (${stats.size} bytes)`);
      
      return {
        filename,
        content: content.toString(),
        size: stats.size,
        modifiedTime: new Date(stats.modifyTime)
      };
    } catch (error) {
      console.error(`[SFTP] Error reading file ${filename}:`, error);
      throw error;
    }
  }

  async moveFileToCompleted(filename: string): Promise<void> {
    try {
      if (!this.client) {
        await this.initializeClient();
      }
      const sourcePath = `${this.config.remotePath}/${filename}`;
      const destPath = `${this.config.completedPath}/${filename}`;
      
      // Ensure completed directory exists
      await this.ensureDirectoryExists(this.config.completedPath);
      
      // Move the file
      await this.client.rename(sourcePath, destPath);
      
      console.log(`[SFTP] Moved ${filename} to completed folder`);
    } catch (error) {
      console.error(`[SFTP] Error moving file ${filename}:`, error);
      throw error;
    }
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      if (!this.client) {
        await this.initializeClient();
      }
      await this.client.mkdir(path, true);
    } catch (error) {
      // Directory might already exist, which is fine
      if (!(error instanceof Error) || !error.message?.includes('File exists')) {
        throw error;
      }
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }
      await this.client.list('.');
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Configuration for The Chautauqua Center
export const CHAUTAUQUA_SFTP_CONFIG: SFTPConfig = {
  host: process.env.CHAUTAUQUA_SFTP_HOST || '',
  port: parseInt(process.env.CHAUTAUQUA_SFTP_PORT || '22'),
  username: process.env.CHAUTAUQUA_SFTP_USERNAME || '',
  password: process.env.CHAUTAUQUA_SFTP_PASSWORD || '',
  remotePath: process.env.CHAUTAUQUA_SFTP_REMOTE_PATH || '/incoming',
  completedPath: process.env.CHAUTAUQUA_SFTP_COMPLETED_PATH || '/completed'
};
