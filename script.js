const form = document.getElementById('upload-form');
const statusDiv = document.getElementById('status');
const submitButton = document.getElementById('submit-button');
// --- NEW: Get the progress bar elements ---
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');

// ... (Your GPS location code remains the same) ...

form.addEventListener('submit', async function(event) {
    event.preventDefault();
    const fileInput = document.getElementById('shelf_photo');
    const file = fileInput.files[0];

    if (!file) {
        statusDiv.textContent = 'Please take a photo.';
        return;
    }
    
    submitButton.disabled = true;
    statusDiv.textContent = 'Preparing upload...';
    // --- NEW: Hide progress bar initially ---
    progressContainer.style.display = 'none';

    // ... (Your metadata and first fetch call remain the same) ...
    const response = await fetch('/api/HttpTrigger', { /* ... */ });
    
    if (!response.ok) {
        statusDiv.textContent = 'Error: Could not get upload URL from server.';
        submitButton.disabled = false;
        return;
    }

    const { upload_url, image_id } = await response.json();
    statusDiv.textContent = `Uploading image (${image_id})...`;
    // --- NEW: Show and animate the progress bar ---
    progressContainer.style.display = 'block';
    progressBar.style.width = '50%'; // Indeterminate progress

    // Upload the file directly to Azure Blob Storage
    const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'x-ms-blob-type': 'BlockBlob' }
    });

    // --- NEW: Hide the progress bar after completion ---
    progressContainer.style.display = 'none';

    if (uploadResponse.ok) {
        statusDiv.textContent = '✅ Upload successful! The image is being processed.';
        form.reset();
        // ...
    } else {
        statusDiv.textContent = '❌ Upload failed. Please try again.';
    }
    submitButton.disabled = false;
});