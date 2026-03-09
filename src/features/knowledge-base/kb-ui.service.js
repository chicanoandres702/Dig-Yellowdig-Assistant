/**
 * KB UI Service: Slim orchestrator for Knowledge Base UI.
 * Why: The original 886-line monolith has been split into 10 focused modules
 * under kb/ — each under 100 lines. This file remains as the public entry point
 * so existing callers (sidebar tabs, scan toolbar) continue to work unchanged.
 *
 * Sub-modules loaded via manifest.json (content_scripts):
 *   kb-tab-render          → renderKnowledgeTab, _augmentWithSharedClasses
 *   kb-upload-overlay      → _wireUploadButton, _buildUploadOverlay, _setupFileEntries
 *   kb-upload-process      → _wireUploadOverlayEvents, _storeInChromeStorage, _saveKbEntry
 *   kb-upload-file-handlers→ _tryPdfExtraction, _uploadAsDataUrl, _showUploadError
 *   kb-header-migrate      → _wireHeaderButtons, _wireMigrateButton, _fallbackExportAsHtml
 *   kb-class-items         → renderKBClassItems, _buildBookTopicHtml, _buildItemListHtml
 *   kb-class-item-events   → _wireClassItemEvents + export/delete/view handlers
 *   kb-save-dialog         → showSaveToBucketDialog, _buildSaveDialogOverlay
 *   kb-save-dialog-helpers → accessibility, shared checkbox, topic pickers, close
 *   kb-save-dialog-picker  → element picker + cross-frame search
 *   kb-save-dialog-confirm → confirm save with shared/local routing, makeVisible, copyAll
 */

// No additional code needed — all functions are loaded directly via content_scripts.
// This file serves as documentation and the original import path for any dynamic references.
