import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

let supabaseClient: SupabaseClient | null = null;

if (config.supabase.url && config.supabase.serviceRoleKey) {
  supabaseClient = createClient(config.supabase.url, config.supabase.serviceRoleKey);
}

export interface UploadFileOptions {
  fileName: string;
  contentType: string;
  buffer: Buffer | Uint8Array;
  folder?: string;
}

export interface UploadResult {
  storagePath: string;
  publicUrl: string;
}

export class StorageService {
  private static localUploadsDir = path.resolve(process.cwd(), 'uploads');

  static isConfigured(): boolean {
    return !!supabaseClient;
  }

  static async upload(options: UploadFileOptions): Promise<UploadResult> {
    const timestamp = Date.now();
    const sanitizedName = options.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folder = options.folder ? `${options.folder}/` : '';
    const storagePath = `${folder}${timestamp}-${sanitizedName}`;

    if (supabaseClient) {
      const { data, error } = await supabaseClient.storage
        .from(config.supabase.bucket)
        .upload(storagePath, options.buffer, {
          contentType: options.contentType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase Storage upload failed: ${error.message}`);
      }

      const { data: urlData } = supabaseClient.storage
        .from(config.supabase.bucket)
        .getPublicUrl(storagePath);

      return {
        storagePath: data.path,
        publicUrl: urlData.publicUrl,
      };
    }

    // Local filesystem fallback when Supabase credentials are not yet supplied
    if (!fs.existsSync(this.localUploadsDir)) {
      fs.mkdirSync(this.localUploadsDir, { recursive: true });
    }

    const localFilePath = path.join(this.localUploadsDir, `${timestamp}-${sanitizedName}`);
    fs.writeFileSync(localFilePath, Buffer.from(options.buffer));

    const publicUrl = `/assets/local/${timestamp}-${sanitizedName}`;

    return {
      storagePath,
      publicUrl,
    };
  }

  static async delete(storagePath: string): Promise<void> {
    if (supabaseClient) {
      const { error } = await supabaseClient.storage
        .from(config.supabase.bucket)
        .remove([storagePath]);

      if (error) {
        throw new Error(`Supabase Storage deletion failed: ${error.message}`);
      }
      return;
    }

    // Local filesystem fallback
    const localFilePath = path.join(this.localUploadsDir, path.basename(storagePath));
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  }

  static getPublicUrl(storagePath: string): string {
    if (supabaseClient) {
      const { data } = supabaseClient.storage
        .from(config.supabase.bucket)
        .getPublicUrl(storagePath);
      return data.publicUrl;
    }
    return `/assets/local/${path.basename(storagePath)}`;
  }
}

