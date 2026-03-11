/**
 * ZIP File Manager Utility
 * Handles creation and download of ZIP files
 * Uses JSZip library for compression (bundled locally for Manifest V3 compliance)
 */

// JSZip is loaded from local bundle (src/utils/jszip.min.js)
// This ensures Manifest V3 compliance by avoiding remotely hosted code

class ZipManager {
  constructor() {
    this.JSZip = null;
    this.initialized = false;
  }

  /**
   * Initialize JSZip library
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.initialized && this.JSZip) {
      return true;
    }

    try {
      // Check if JSZip is available globally
      if (typeof JSZip !== 'undefined') {
        this.JSZip = JSZip;
        this.initialized = true;
        console.log('✅ ZipManager: JSZip initialized successfully');
        return true;
      }

      // Try to load JSZip dynamically
      await this.loadJSZip();
      return true;
    } catch (error) {
      console.error('❌ ZipManager: Failed to initialize JSZip', error);
      return false;
    }
  }

  /**
   * Dynamically load JSZip from local bundle
   * @returns {Promise<void>}
   */
  async loadJSZip() {
    return new Promise((resolve, reject) => {
      if (typeof JSZip !== 'undefined') {
        this.JSZip = JSZip;
        this.initialized = true;
        resolve();
        return;
      }

      // Load from local bundled file (Manifest V3 compliant)
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('src/utils/jszip.min.js');
      
      script.onload = () => {
        this.JSZip = JSZip;
        this.initialized = true;
        console.log('✅ ZipManager: JSZip loaded from local bundle');
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load JSZip from local bundle'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Create a ZIP file from multiple files
   * @param {Array<{name: string, content: string|Blob|ArrayBuffer, type?: string}>} files - Array of file objects
   * @param {string} zipFileName - Name of the output ZIP file (without .zip extension)
   * @returns {Promise<Blob>} ZIP file as Blob
   */
  async createZip(files, zipFileName = 'download') {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.JSZip) {
      throw new Error('JSZip is not available');
    }

    try {
      const zip = new this.JSZip();

      // Add files to ZIP
      for (const file of files) {
        if (!file.name || !file.content) {
          console.warn('⚠️ ZipManager: Skipping invalid file', file);
          continue;
        }

        // Determine file extension from type or name
        let fileName = file.name;
        
        // Add content to ZIP based on type
        if (file.content instanceof Blob) {
          const arrayBuffer = await file.content.arrayBuffer();
          zip.file(fileName, arrayBuffer);
        } else if (file.content instanceof ArrayBuffer) {
          zip.file(fileName, file.content);
        } else if (typeof file.content === 'string') {
          zip.file(fileName, file.content);
        } else if (typeof file.content === 'object') {
          // Convert object to JSON
          zip.file(fileName, JSON.stringify(file.content, null, 2));
        } else {
          zip.file(fileName, String(file.content));
        }

        console.log(`📁 ZipManager: Added file to ZIP: ${fileName}`);
      }

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9 // Maximum compression
        }
      });

      console.log(`✅ ZipManager: ZIP created successfully (${(zipBlob.size / 1024).toFixed(2)} KB)`);
      return zipBlob;

    } catch (error) {
      console.error('❌ ZipManager: Error creating ZIP', error);
      throw error;
    }
  }

  /**
   * Create and download a ZIP file
   * @param {Array<{name: string, content: string|Blob|ArrayBuffer, type?: string}>} files - Array of file objects
   * @param {string} zipFileName - Name of the output ZIP file (without .zip extension)
   * @returns {Promise<void>}
   */
  async downloadZip(files, zipFileName = 'download') {
    try {
      const zipBlob = await this.createZip(files, zipFileName);
      
      // Create download link
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${zipFileName}.zip`;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log(`✅ ZipManager: ZIP downloaded: ${zipFileName}.zip`);
      
    } catch (error) {
      console.error('❌ ZipManager: Error downloading ZIP', error);
      throw error;
    }
  }

  /**
   * Create ZIP from images (fetches images from URLs)
   * @param {Array<string>} imageUrls - Array of image URLs
   * @param {string} zipFileName - Name of the output ZIP file
   * @returns {Promise<void>}
   */
  async downloadImagesAsZip(imageUrls, zipFileName = 'images') {
    try {
      console.log(`📥 ZipManager: Downloading ${imageUrls.length} images...`);
      
      const files = [];
      
      for (let i = 0; i < imageUrls.length; i++) {
        const url = imageUrls[i];
        
        try {
          // Fetch image
          const response = await fetch(url);
          if (!response.ok) {
            console.warn(`⚠️ Failed to fetch image: ${url}`);
            continue;
          }
          
          const blob = await response.blob();
          
          // Extract filename from URL or use index
          let filename = url.split('/').pop().split('?')[0] || `image_${i + 1}`;
          
          // Ensure proper extension
          if (!filename.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
            const ext = blob.type.split('/')[1] || 'jpg';
            filename = `${filename}.${ext}`;
          }
          
          files.push({
            name: filename,
            content: blob
          });
          
          console.log(`✅ Downloaded: ${filename}`);
          
        } catch (error) {
          console.error(`❌ Error downloading image ${url}:`, error);
        }
      }
      
      if (files.length === 0) {
        throw new Error('No images were successfully downloaded');
      }
      
      console.log(`📦 ZipManager: Creating ZIP with ${files.length} images...`);
      await this.downloadZip(files, zipFileName);
      
    } catch (error) {
      console.error('❌ ZipManager: Error in downloadImagesAsZip', error);
      throw error;
    }
  }

  /**
   * Create ZIP from text files with custom content
   * @param {Object} filesMap - Object where keys are filenames and values are content
   * @param {string} zipFileName - Name of the output ZIP file
   * @returns {Promise<void>}
   */
  async downloadTextFilesAsZip(filesMap, zipFileName = 'files') {
    try {
      const files = Object.entries(filesMap).map(([name, content]) => ({
        name,
        content
      }));
      
      await this.downloadZip(files, zipFileName);
      
    } catch (error) {
      console.error('❌ ZipManager: Error in downloadTextFilesAsZip', error);
      throw error;
    }
  }

  /**
   * Add a folder structure to ZIP
   * @param {Array<{path: string, content: string|Blob}>} files - Files with folder paths
   * @param {string} zipFileName - Name of the output ZIP file
   * @returns {Promise<void>}
   */
  async downloadWithFolders(files, zipFileName = 'archive') {
    try {
      // Files should have 'path' property like 'folder/subfolder/file.txt'
      await this.downloadZip(files.map(f => ({
        name: f.path || f.name,
        content: f.content
      })), zipFileName);
      
    } catch (error) {
      console.error('❌ ZipManager: Error in downloadWithFolders', error);
      throw error;
    }
  }
}

// Create singleton instance
const zipManager = new ZipManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = zipManager;
}

// Make available globally for Chrome extension
if (typeof window !== 'undefined') {
  window.zipManager = zipManager;
}
