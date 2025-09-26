const form = document.getElementById('upload-form');
const statusDiv = document.getElementById('status');
const locationInput = document.getElementById('location_gps');
const submitButton = document.getElementById('submit-button');

// Get GPS location as soon as the page loads
window.addEventListener('load', () => {
    statusDiv.textContent = "Getting GPS location...";
    if (!navigator.geolocation) {
        statusDiv.textContent = "Geolocation is not supported by your browser.";
    } else {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                locationInput.value = `${lat}, ${lon}`;
                statusDiv.textContent = "GPS Location Captured. Ready to scan.";
            },
            () => {
                statusDiv.textContent = "Unable to retrieve your location. Please enable GPS.";
            }
        );
    }
});

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

    const metadata = {
        sales_id: form.sales_id.value,
        outlet_name: form.outlet_name.value,
        city: form.city.value,
        address: form.address.value,
        territory: form.territory.value,
        location_gps: locationInput.value,
        filename: file.name
    };

    const response = await fetch('/api/HttpTrigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
    });

    if (!response.ok) {
        statusDiv.textContent = 'Error: Could not get upload URL from server.';
        submitButton.disabled = false;
        return;
    }

    const { upload_url, image_id } = await response.json();
    statusDiv.textContent = `Uploading image (${image_id})...`;

    const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'x-ms-blob-type': 'BlockBlob' }
    });

    if (uploadResponse.ok) {
        statusDiv.textContent = '✅ Upload successful! The image is being processed.';
        form.reset();
        window.dispatchEvent(new Event('load'));
    } else {
        statusDiv.textContent = '❌ Upload failed. Please try again.';
    }
    submitButton.disabled = false;
});