/**
 * Image Extractor with Download Service
 * Extracts image URLs, creates JSON/TXT files, and downloads actual images
 * Creates a complete ZIP with both metadata and actual image files
 */

class ImageExtractor {
  constructor() {
    this.imageCache = new Map();
    this.downloadProgress = {
      total: 0,
      completed: 0,
      failed: 0
    };
  }

  /**
   * Extract all images from the page
   * @param {Object} options - Extraction options
   * @returns {Array} Array of image objects with URLs and metadata
   */
  async extractImages(options = {}) {
    const {
      minWidth = 0,
      minHeight = 0,
      includeBackgrounds = true,
      includeSVG = true,
      includeIcons = true,
      includeSrcset = true
    } = options;

    console.log('🔍 Extracting images from page...');
    const images = [];
    const seenUrls = new Set();

    // Helper to add image if not duplicate
    const addImage = (imageObj) => {
      if (imageObj.src && !seenUrls.has(imageObj.src)) {
        seenUrls.add(imageObj.src);
        images.push(imageObj);
      }
    };

    // 1. Extract from <img> tags
    const imgElements = document.querySelectorAll('img');
    for (const img of imgElements) {
      const imageObj = {
        src: img.src || img.getAttribute('src'),
        alt: img.alt || '',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        loading: img.loading || null,
        type: 'img'
      };

      // Add srcset if available
      if (includeSrcset && img.srcset) {
        imageObj.srcset = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
      }

      // Check minimum dimensions
      if (imageObj.width >= minWidth && imageObj.height >= minHeight) {
        addImage(imageObj);
      }

      // Also add srcset images as separate entries
      if (includeSrcset && imageObj.srcset) {
        imageObj.srcset.forEach(srcsetUrl => {
          if (!seenUrls.has(srcsetUrl)) {
            addImage({
              src: srcsetUrl,
              alt: img.alt || '',
              type: 'srcset',
              parentSrc: imageObj.src
            });
          }
        });
      }
    }

    // 2. Extract from <picture> elements
    const pictureElements = document.querySelectorAll('picture source');
    for (const source of pictureElements) {
      const srcset = source.srcset || source.getAttribute('srcset');
      if (srcset) {
        const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
        urls.forEach(url => {
          addImage({
            src: url,
            type: 'picture',
            media: source.media || null
          });
        });
      }
    }

    // 3. Extract from CSS background images
    if (includeBackgrounds) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const bgImage = window.getComputedStyle(el).backgroundImage;
        if (bgImage && bgImage !== 'none') {
          const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (urlMatch && urlMatch[1]) {
            addImage({
              src: urlMatch[1],
              type: 'background',
              element: el.tagName.toLowerCase()
            });
          }
        }
      }
    }

    // 4. Extract inline SVG
    if (includeSVG) {
      const svgElements = document.querySelectorAll('svg');
      svgElements.forEach((svg, index) => {
        const svgString = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        addImage({
          src: svgUrl,
          type: 'svg-inline',
          index: index,
          isBlob: true
        });
      });
    }

    // 5. Extract from meta tags (og:image, twitter:image, etc.)
    const metaTags = document.querySelectorAll('meta[property*="image"], meta[name*="image"]');
    for (const meta of metaTags) {
      const content = meta.content || meta.getAttribute('content');
      if (content) {
        addImage({
          src: content,
          type: 'meta',
          property: meta.property || meta.name
        });
      }
    }

    // 6. Extract from data attributes
    const dataImages = document.querySelectorAll('[data-src], [data-image], [data-bg]');
    for (const el of dataImages) {
      const src = el.getAttribute('data-src') || 
                  el.getAttribute('data-image') || 
                  el.getAttribute('data-bg');
      if (src) {
        addImage({
          src: src,
          type: 'data-attribute',
          element: el.tagName.toLowerCase()
        });
      }
    }

    console.log(`✅ Found ${images.length} unique images`);
    return images;
  }

  /**
   * Download actual image files from URLs
   * @param {Array} images - Array of image objects
   * @param {Function} progressCallback - Optional progress callback
   * @returns {Promise<Array>} Array of downloaded image blobs with metadata
   */
  async downloadImages(images, progressCallback = null) {
    console.log(`⬇️ Downloading ${images.length} images...`);
    
    this.downloadProgress = {
      total: images.length,
      completed: 0,
      failed: 0
    };

    const downloadedImages = [];
    const downloadPromises = images.map(async (imageObj, index) => {
      try {
        const blob = await this.downloadSingleImage(imageObj.src);
        
        if (blob) {
          const fileName = this.generateFileName(imageObj.src, index, blob.type);
          
          downloadedImages.push({
            fileName: fileName,
            blob: blob,
            size: blob.size,
            type: blob.type,
            originalUrl: imageObj.src,
            metadata: imageObj
          });

          this.downloadProgress.completed++;
          console.log(`✅ Downloaded: ${fileName} (${(blob.size / 1024).toFixed(2)} KB)`);
        } else {
          this.downloadProgress.failed++;
          console.warn(`❌ Failed to download: ${imageObj.src}`);
        }

        if (progressCallback) {
          progressCallback(this.downloadProgress);
        }
      } catch (error) {
        this.downloadProgress.failed++;
        console.error(`❌ Error downloading ${imageObj.src}:`, error);
        
        if (progressCallback) {
          progressCallback(this.downloadProgress);
        }
      }
    });

    await Promise.all(downloadPromises);
    
    console.log(`✅ Download complete: ${this.downloadProgress.completed} successful, ${this.downloadProgress.failed} failed`);
    return downloadedImages;
  }

  /**
   * Download a single image from URL
   * @param {String} url - Image URL
   * @returns {Promise<Blob>} Image blob
   */
  async downloadSingleImage(url) {
    // Check cache first
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url);
    }

    try {
      // Handle blob URLs
      if (url.startsWith('blob:')) {
        const response = await fetch(url);
        const blob = await response.blob();
        this.imageCache.set(url, blob);
        return blob;
      }

      // Handle data URLs
      if (url.startsWith('data:')) {
        const blob = this.dataURLToBlob(url);
        this.imageCache.set(url, blob);
        return blob;
      }

      // Handle regular URLs
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      this.imageCache.set(url, blob);
      return blob;
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error);
      return null;
    }
  }

  /**
   * Convert data URL to Blob
   * @param {String} dataURL - Data URL
   * @returns {Blob} Blob object
   */
  dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Generate filename from URL and type
   * @param {String} url - Image URL
   * @param {Number} index - Image index
   * @param {String} mimeType - MIME type
   * @returns {String} Generated filename
   */
  generateFileName(url, index, mimeType) {
    // Try to get extension from MIME type
    const extensionMap = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/x-icon': 'ico',
      'image/vnd.microsoft.icon': 'ico',
      'image/avif': 'avif'
    };

    let extension = extensionMap[mimeType] || 'jpg';

    // Try to get original filename from URL
    try {
      const urlObj = new URL(url, window.location.href);
      const pathname = urlObj.pathname;
      const urlFilename = pathname.split('/').pop();
      
      if (urlFilename && urlFilename.includes('.')) {
        const urlExt = urlFilename.split('.').pop().toLowerCase();
        if (Object.values(extensionMap).includes(urlExt)) {
          return this.sanitizeFileName(urlFilename);
        }
      }
    } catch (e) {
      // Invalid URL, use generated name
    }

    // Generate unique filename
    const paddedIndex = String(index + 1).padStart(4, '0');
    return `image_${paddedIndex}.${extension}`;
  }

  /**
   * Sanitize filename
   * @param {String} filename - Original filename
   * @returns {String} Sanitized filename
   */
  sanitizeFileName(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 100);
  }

  /**
   * Create complete ZIP with images, JSON, and TXT
   * @param {String} zipFileName - Name for the ZIP file
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Result object with success status and details
   */
  async createCompleteZip(zipFileName = 'images', options = {}) {
    try {
      console.log('📦 Creating complete image extraction ZIP...');

      // Step 1: Extract image URLs and metadata
      const images = await this.extractImages(options);

      if (images.length === 0) {
        return {
          success: false,
          message: 'No images found on the page',
          imageCount: 0
        };
      }

      // Step 2: Create metadata JSON
      const jsonData = {
        extractedFrom: window.location.href,
        extractedAt: new Date().toISOString(),
        totalImages: images.length,
        images: images.map((img, index) => ({
          index: index + 1,
          src: img.src,
          alt: img.alt || '',
          type: img.type,
          width: img.width || null,
          height: img.height || null,
          srcset: img.srcset || null
        }))
      };

      // Step 3: Create TXT list
      const txtData = `Image URLs from ${window.location.href}\n` +
                     `Extracted at: ${new Date().toLocaleString()}\n` +
                     `Total images: ${images.length}\n\n` +
                     `${'='.repeat(80)}\n\n` +
                     images.map((img, index) => 
                       `${index + 1}. ${img.src}\n   Alt: ${img.alt || 'N/A'}\n   Type: ${img.type}\n`
                     ).join('\n');

      // Step 4: Download actual images
      const downloadedImages = await this.downloadImages(images, (progress) => {
        console.log(`Progress: ${progress.completed}/${progress.total} (${progress.failed} failed)`);
      });

      // Step 5: Create ZIP file
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded');
      }

      const zip = new JSZip();

      // Add metadata files
      zip.file('image_links.json', JSON.stringify(jsonData, null, 2));
      zip.file('image_links.txt', txtData);

      // Create images folder and add downloaded images
      const imagesFolder = zip.folder('images');
      downloadedImages.forEach(img => {
        imagesFolder.file(img.fileName, img.blob);
      });

      // Add download summary
      const summary = {
        totalFound: images.length,
        totalDownloaded: downloadedImages.length,
        failed: this.downloadProgress.failed,
        totalSize: downloadedImages.reduce((sum, img) => sum + img.size, 0),
        files: downloadedImages.map(img => ({
          fileName: img.fileName,
          size: img.size,
          type: img.type,
          originalUrl: img.originalUrl
        }))
      };
      zip.file('download_summary.json', JSON.stringify(summary, null, 2));

      // Generate and download ZIP
      const blob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${zipFileName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ ZIP file created and downloaded successfully!');

      return {
        success: true,
        message: `Successfully created ${zipFileName}.zip`,
        imageCount: images.length,
        downloadedCount: downloadedImages.length,
        failedCount: this.downloadProgress.failed,
        zipFileName: `${zipFileName}.zip`,
        totalSize: blob.size
      };
    } catch (error) {
      console.error('❌ Error creating ZIP:', error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        imageCount: 0
      };
    }
  }

  /**
   * Clear image cache
   */
  clearCache() {
    this.imageCache.clear();
    console.log('🗑️ Image cache cleared');
  }
}

// Create global instance
window.imageExtractor = new ImageExtractor();

// Create simple wrapper function for agents
window.extractImagesAsZip = async function(zipFileName = 'images', options = {}) {
  return await window.imageExtractor.createCompleteZip(zipFileName, options);
};

// Also expose for command handlers
window.handleImageExtractionCommand = async function(params = {}) {
  const { zipFileName = 'images', ...options } = params;
  return await window.imageExtractor.createCompleteZip(zipFileName, options);
};

console.log('✅ Image Extractor loaded with download service');
console.log('   - window.extractImagesAsZip(zipFileName, options)');
console.log('   - window.imageExtractor.createCompleteZip(zipFileName, options)');
