const token = localStorage.getItem('token');
if (!token) window.location.href = '/login.html';

let map;
let marker;
let selectedLocation = null;
let geocoder;

document.addEventListener('DOMContentLoaded', async () => {
    initMap();

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('translate-x-full');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenu.classList.add('translate-x-full');
            }
        });
    }

    // Sidebar Logic
    const sidebar = document.getElementById('report-sidebar');
    const confirmLocBtn = document.getElementById('btn-confirm-loc');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');

    if (confirmLocBtn && sidebar) {
        confirmLocBtn.addEventListener('click', () => {
            // Open bottom sheet
            sidebar.classList.remove('translate-y-full');
        });
    }

    if (closeSidebarBtn && sidebar) {
        closeSidebarBtn.addEventListener('click', () => {
            // Close bottom sheet (mob only really)
            sidebar.classList.add('translate-y-full');
        });
    }

    // Photo Input Trigger & Camera Logic
    const dropzone = document.getElementById('photo-dropzone');
    const fileInput = document.getElementById('photo-input');
    const openCameraBtn = document.getElementById('btn-open-camera');
    const cameraModal = document.getElementById('camera-modal');
    const cameraStream = document.getElementById('camera-stream');
    const captureBtn = document.getElementById('btn-capture-photo');
    const closeCameraBtn = document.getElementById('btn-close-camera');
    const canvas = document.getElementById('camera-canvas');
    let stream = null;

    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                updatePhotoPreview(e.target.files[0]);
            }
        });
    }

    // Camera Features
    if (openCameraBtn) {
        openCameraBtn.addEventListener('click', async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' } // Prefer back camera
                });
                cameraStream.srcObject = stream;
                cameraModal.classList.remove('hidden');
            } catch (err) {
                console.error("Camera access denied:", err);
                alert("Could not access camera. Please check permissions.");
            }
        });
    }

    if (closeCameraBtn) {
        closeCameraBtn.addEventListener('click', stopCamera);
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            if (!stream) return;

            // Setup canvas matching video dimensions
            canvas.width = cameraStream.videoWidth;
            canvas.height = cameraStream.videoHeight;
            const ctx = canvas.getContext('2d');

            // Draw video frame to canvas
            ctx.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

            // Convert to Blob/File
            canvas.toBlob((blob) => {
                const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });

                // Update file input using DataTransfer
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;

                // Update preview
                updatePhotoPreview(file);

                // Close modal
                stopCamera();
            }, 'image/jpeg', 0.8);
        });
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraModal.classList.add('hidden');
    }

    function updatePhotoPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            // Update both dropzone and camera button to show selection
            dropzone.style.backgroundImage = `url(${e.target.result})`;
            dropzone.style.backgroundSize = 'cover';
            dropzone.style.backgroundPosition = 'center';
            dropzone.innerHTML = ''; // Remove text/icon

            // Visual indicator on camera button too
            openCameraBtn.innerHTML = '<span class="material-icons text-primary/50 text-4xl mb-2">check_circle</span><p class="text-xs font-bold text-primary">Photo Taken</p>';
        };
        reader.readAsDataURL(file);
    }

    // Locate Me Button
    const locateBtn = document.getElementById('btn-locate-me');
    if (locateBtn) {
        locateBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission if inside one
            if (navigator.geolocation) {
                locateBtn.classList.add('animate-pulse'); // Feedback
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        locateBtn.classList.remove('animate-pulse');
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        map.setCenter(pos);
                        map.setZoom(16);
                        placeMarker(pos);
                    },
                    (error) => {
                        locateBtn.classList.remove('animate-pulse');
                        console.error("Geolocation failed:", error);
                        // Show a more user-friendly error
                        let msg = "Could not get your location.";
                        if (error.code === 1) msg = "Location permission denied. Please enable it in browser settings.";
                        if (error.code === 2) msg = "Location unavailable.";
                        if (error.code === 3) msg = "Location request timed out.";
                        alert(msg + " You can still tap on the map to select a location.");
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                alert("Your browser does not support geolocation.");
            }
        });
    }

    // Form Submission
    const form = document.getElementById('report-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!selectedLocation) {
                alert('Please select a location on the map.');
                return;
            }

            const formData = new FormData();
            formData.append('latitude', typeof selectedLocation.lat === 'function' ? selectedLocation.lat() : selectedLocation.lat);
            formData.append('longitude', typeof selectedLocation.lng === 'function' ? selectedLocation.lng() : selectedLocation.lng);
            formData.append('address', document.getElementById('selected-address').innerText);

            const severity = document.querySelector('input[name="severity"]:checked').value;
            formData.append('severity', severity.toUpperCase());

            const details = form.querySelector('textarea').value;
            if (details) formData.append('admin_notes', details);

            if (fileInput.files[0]) {
                formData.append('image', fileInput.files[0]);
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="material-icons animate-spin">refresh</span> Submitting...';

            try {
                const res = await fetch('/reports', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (res.ok) {
                    const successDiv = form.querySelector('.animate-fade-in');
                    if (successDiv) successDiv.classList.remove('hidden');

                    Array.from(form.children).forEach(child => {
                        if (child !== successDiv) child.classList.add('hidden');
                    });

                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 2000);
                } else {
                    const data = await res.json();
                    alert(data.error || 'Submission failed');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span class="material-icons group-hover:translate-x-1 transition-transform">send</span> Submit Report';
                }
            } catch (err) {
                console.error(err);
                alert('Error submitting report');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span class="material-icons group-hover:translate-x-1 transition-transform">send</span> Submit Report';
            }
        });
    }
});

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    const { Geocoder } = await google.maps.importLibrary("geocoding");

    geocoder = new Geocoder();

    const mapContainer = document.getElementById("report-map");
    // Initial center (India)
    const initialPos = { lat: 20.5937, lng: 78.9629 };

    map = new Map(mapContainer, {
        center: initialPos,
        zoom: 5,
        mapId: 'REPORT_MAP_ID',
        disableDefaultUI: true, // Clean look
        zoomControl: false, // We'll rely on custom or default? User said "clean". Let's enable zoomControl for usability.
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
    });

    map.addListener('click', (e) => {
        placeMarker(e.latLng);
    });

    // Attempt auto-locate on load? Maybe too intrusive. 
    // Let the user click the button if they want.
}

async function placeMarker(latLng) {
    if (!latLng) return;

    // Normalize latLng object
    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
    const position = { lat, lng };

    selectedLocation = position;

    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

    if (marker) {
        marker.position = position;
    } else {
        marker = new AdvancedMarkerElement({
            map: map,
            position: position,
            title: "Report Location",
            gmpDraggable: true
        });

        marker.addListener('dragend', (e) => {
            if (marker.position) {
                const newLat = typeof marker.position.lat === 'function' ? marker.position.lat() : marker.position.lat;
                const newLng = typeof marker.position.lng === 'function' ? marker.position.lng() : marker.position.lng;
                selectedLocation = { lat: newLat, lng: newLng };
                updateAddress(selectedLocation);
            }
        });
    }

    // Update UI
    document.getElementById('selected-coords').innerText = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
    updateAddress(position);
}

function updateAddress(latLng) {
    if (!geocoder) return;

    geocoder.geocode({ location: latLng }, (results, status) => {
        if (status === "OK") {
            if (results[0]) {
                document.getElementById('selected-address').innerText = results[0].formatted_address;
            } else {
                document.getElementById('selected-address').innerText = "Unknown location";
            }
        } else {
            console.warn("Geocoder failed due to: " + status);
            document.getElementById('selected-address').innerText = "Location pinned (Address unavailable)";
        }
    });
}
