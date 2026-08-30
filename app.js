// Stash Photos - TPDB Hash Generator
// Client-side hash generation for ThePornDB

let selectedFiles = [];
let generatedHashes = [];

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectBtn = document.getElementById('selectBtn');
const clearBtn = document.getElementById('clearBtn');
const generateBtn = document.getElementById('generateBtn');
const exportBtn = document.getElementById('exportBtn');
const copyBtn = document.getElementById('copyBtn');
const fileList = document.getElementById('fileList');
const selectedFilesSection = document.getElementById('selectedFiles');
const generateSection = document.getElementById('generateSection');
const resultsSection = document.getElementById('resultsSection');
const fileCount = document.getElementById('fileCount');
const hashCount = document.getElementById('hashCount');
const hashPreview = document.getElementById('hashPreview');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Event Listeners
selectBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);
clearBtn.addEventListener('click', clearFiles);
generateBtn.addEventListener('click', generateHashes);
exportBtn.addEventListener('click', exportJSON);
copyBtn.addEventListener('click', copyToClipboard);

// Drag and Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles({ target: { files: e.dataTransfer.files } });
});

function handleFiles(event) {
    const files = Array.from(event.target.files);
    selectedFiles = [...selectedFiles, ...files];
    updateFileList();
}

function updateFileList() {
    if (selectedFiles.length === 0) {
        selectedFilesSection.style.display = 'none';
        generateSection.style.display = 'none';
        return;
    }

    selectedFilesSection.style.display = 'block';
    generateSection.style.display = 'block';
    fileCount.textContent = selectedFiles.length;

    fileList.innerHTML = selectedFiles.map((file, index) => `
        <div class="file-item">
            <span class="name">${file.name}</span>
            <span class="size">${formatFileSize(file.size)}</span>
        </div>
    `).join('');
}

function clearFiles() {
    selectedFiles = [];
    generatedHashes = [];
    updateFileList();
    resultsSection.style.display = 'none';
    fileInput.value = '';
}

async function generateHashes() {
    if (selectedFiles.length === 0) return;

    generateBtn.disabled = true;
    progressContainer.style.display = 'block';
    generatedHashes = [];

    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const progress = ((i + 1) / selectedFiles.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `Processing: ${i + 1}/${selectedFiles.length}`;

        try {
            const hash = await generateFileHash(file);
            generatedHashes.push(hash);
        } catch (error) {
            console.error(`Error processing ${file.name}:`, error);
        }
    }

    generateBtn.disabled = false;
    progressContainer.style.display = 'none';
    showResults();
}

async function generateFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Generate OSHash for video files
    let osHash = null;
    if (isVideoFile(file.name)) {
        osHash = generateOSHash(buffer, file.size);
    }

    return {
        sha256: hashHex,
        osHash: osHash,
        size: file.size,
        filename: file.name
    };
}

function generateOSHash(buffer, fileSize) {
    // Simplified OSHash-like hash for videos
    // Takes first and last 64KB of file
    const CHUNK_SIZE = 65536;
    const firstChunk = buffer.slice(0, Math.min(CHUNK_SIZE, fileSize));
    const lastChunk = buffer.slice(Math.max(0, fileSize - CHUNK_SIZE), fileSize);

    // Combine file size + first chunk + last chunk
    const combined = new Uint8Array(firstChunk.byteLength + lastChunk.byteLength + 8);
    const view = new DataView(combined.buffer);

    // Add file size as 8 bytes
    view.setBigUint64(0, BigInt(fileSize), true);

    // Add first chunk
    combined.set(new Uint8Array(firstChunk), 8);

    // Add last chunk
    combined.set(new Uint8Array(lastChunk), 8 + firstChunk.byteLength);

    // Hash the combined data
    return crypto.subtle.digest('SHA-256', combined)
        .then(hash => {
            const hashArray = Array.from(new Uint8Array(hash));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        });
}

function isVideoFile(filename) {
    const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
    return videoExtensions.includes(ext);
}

function showResults() {
    if (generatedHashes.length === 0) {
        alert('No hashes generated. Please try again.');
        return;
    }

    hashCount.textContent = generatedHashes.length;
    hashPreview.textContent = JSON.stringify(generatedHashes.slice(0, 3), null, 2) +
        (generatedHashes.length > 3 ? `\n... and ${generatedHashes.length - 3} more` : '');

    resultsSection.style.display = 'block';
}

function exportJSON() {
    if (generatedHashes.length === 0) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `tpdb_hashes_${timestamp}.json`;
    const json = JSON.stringify(generatedHashes, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function copyToClipboard() {
    if (generatedHashes.length === 0) return;

    const json = JSON.stringify(generatedHashes, null, 2);
    try {
        await navigator.clipboard.writeText(json);
        alert('Hashes copied to clipboard!');
    } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy to clipboard');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
