// Global variables
let currentConnection = {
    ip: '',
    username: 'guest',
    password: 'guest',
    isConnected: false
};

const programTextElements = {};
const RESIZE_HANDLE_SIZE = 8;

// Helper function to validate IP address
function isValidIP(ip) {
    const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
}

// Helper function to validate required fields
function validateRequiredFields(fields, fieldNames) {
    const errors = [];
    fields.forEach((field, index) => {
        if (!field || field.toString().trim() === '') {
            errors.push(`${fieldNames[index]} is required`);
        }
    });
    return errors;
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    // Set up event listeners for file uploads
document.getElementById('image-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        document.getElementById('image-preview').src = event.target.result;
        document.getElementById('image-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('image', file);

    fetch('/upload/image', {
    method: 'POST',
    body: formData
})
    .then(res => res.json())
    .then(data => {
        if (data.status === 'success') {
            document.getElementById('image-path').value = data.relative_path;  // server-side saved path
        } else {
            alert('Image upload failed');
        }
    })
    .catch(() => alert('Image upload error'));
});



document.getElementById('video-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const videoPreview = document.getElementById('video-preview');
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = 'block';

    const formData = new FormData();
    formData.append('video', file);

    fetch('/upload/video', {
    method: 'POST',
    body: formData
})

.then(res => res.json())
.then(data => {
    if (data.status === 'success') {
        // relative path backend se
        document.getElementById('video-path').value = data.relative_path; 
    } else {
        alert('Video upload failed');
    }
})
.catch(() => alert('Video upload error'));

});


    // Initialize toast
    const toastEl = document.getElementById('liveToast');
    const toast = new bootstrap.Toast(toastEl);
});

// Helper function to show toast notifications
function showToast(title, message, isSuccess = true) {
    const toastEl = document.getElementById('liveToast');
    const toastTitle = document.getElementById('toast-title');
    const toastMessage = document.getElementById('toast-message');

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    // Change toast color based on success/error
    const toastHeader = toastEl.querySelector('.toast-header');
    if (isSuccess) {
        toastHeader.classList.remove('bg-danger');
        toastHeader.classList.add('bg-success');
    } else {
        toastHeader.classList.remove('bg-success');
        toastHeader.classList.add('bg-danger');
    }

    const toast = bootstrap.Toast.getInstance(toastEl);
    toast.show();
}

// Enhanced connection check with validation
function checkConnection() {
    const ip = document.getElementById('ip').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Validate inputs
    const errors = validateRequiredFields([ip, username, password], ['IP address', 'Username', 'Password']);
    if (!isValidIP(ip)) {
        errors.push('Invalid IP address format');
    }

    if (errors.length > 0) {
        showToast('Validation Error', errors.join('<br>'), false);
        document.getElementById('connection-status').textContent = 'Not Connected';
        currentConnection.isConnected = false;
        return;
    }

    currentConnection = { ip, username, password, isConnected: false };

    fetch(`/led/check_connection?ip=${encodeURIComponent(ip)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const outputText = data.output ? data.output.toLowerCase() : "";

            if (data.status === 'success' && outputText.includes('successful')) {
                showToast('Success', data.output);
                document.getElementById('connection-status').textContent = 'Connected';
                currentConnection.isConnected = true;
                updateConnectionInfo(ip, username, password);
            } else {
                showToast('Connection Failed', data.output, false);
                document.getElementById('connection-status').textContent = 'Not Connected';
                currentConnection.isConnected = false;
            }
        })
        .catch(error => {
            showToast('Connection Error', error.message, false);
            document.getElementById('connection-status').textContent = 'Not Connected';
            currentConnection.isConnected = false;
        });
}


function updateConnectionInfo(ip, username, password) {
    // Update all hidden fields in forms
    const forms = ['text', 'image', 'video', 'brightness', 'program'];
    forms.forEach(form => {
        document.getElementById(`${form}-ip`).value = ip;
        document.getElementById(`${form}-username`).value = username;
        document.getElementById(`${form}-password`).value = password;
    });

    // Also update network form
    document.getElementById('network-controller-ip').value = ip;
}




// Enhanced displayImage with validation
function displayImage() {
    if (!currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

    const formData = {
        ip: document.getElementById('image-ip').value,
        username: document.getElementById('image-username').value,
        password: document.getElementById('image-password').value,
        i_x: parseInt(document.getElementById('image-x').value),
        i_y: parseInt(document.getElementById('image-y').value),
        i_width: parseInt(document.getElementById('image-width').value),
        i_height: parseInt(document.getElementById('image-height').value),
        image_path: document.getElementById('image-path').value
    };

    const errors = [];

    // Validate required string fields
    if (!formData.ip) errors.push('IP is required');
    if (!formData.username) errors.push('Username is required');
    if (!formData.password) errors.push('Password is required');
    if (!formData.image_path) errors.push('Image path is required');

    // Validate numeric fields (allow 0 but not NaN)
    if (isNaN(formData.i_x)) errors.push('X position must be a number');
    if (isNaN(formData.i_y)) errors.push('Y position must be a number');
    if (isNaN(formData.i_width)) errors.push('Width must be a number');
    if (isNaN(formData.i_height)) errors.push('Height must be a number');

    if (errors.length > 0) {
        showToast('Validation Error', errors.join('<br>'), false);
        return;
    }

    fetch('/led/display_image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.output || 'Failed to display image');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output);
        } else {
            showToast('Display Failed', data.output || 'Failed to display image', false);
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
    });
}


// Enhanced playVideo with validation
function playVideo() {
    if (!currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

    const formData = {
        ip: document.getElementById('video-ip').value,
        username: document.getElementById('video-username').value,
        password: document.getElementById('video-password').value,
        v_x: parseInt(document.getElementById('video-x').value),
        v_y: parseInt(document.getElementById('video-y').value),
        v_width: parseInt(document.getElementById('video-width').value),
        v_height: parseInt(document.getElementById('video-height').value),
        video_path: document.getElementById('video-path').value
    };

    const errors = [];

    // Validate required string fields
    if (!formData.ip) errors.push('IP is required');
    if (!formData.username) errors.push('Username is required');
    if (!formData.password) errors.push('Password is required');
    if (!formData.video_path) errors.push('Video path is required');

    // Validate numeric fields (allow 0 but not NaN)
    if (isNaN(formData.v_x)) errors.push('X position must be a number');
    if (isNaN(formData.v_y)) errors.push('Y position must be a number');
    if (isNaN(formData.v_width)) errors.push('Width must be a number');
    if (isNaN(formData.v_height)) errors.push('Height must be a number');

    if (errors.length > 0) {
        showToast('Validation Error', errors.join('<br>'), false);
        return;
    }

    fetch('/led/play_video', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.output || 'Failed to play video');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output);  // <-- Show raw backend output
        } else {
            showToast('Playback Failed', data.output || 'Failed to play video', false);
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
    });
}

// Initialize brightness control
document.addEventListener('DOMContentLoaded', function () {
    const brightnessInput = document.getElementById('brightness-value');

    brightnessInput.addEventListener('input', function () {
        const value = parseInt(this.value);
        if (isNaN(value) || value < 1 || value > 255) return;

        // Update visual indicator
        const widthPercentage = (value / 255) * 100;
        document.getElementById('brightness-bar').style.width = `${widthPercentage}%`;
    });
});

// Enhanced changeBrightness with validation
function changeBrightness() {
    if (!currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

    const brightnessValue = parseInt(document.getElementById('brightness-value').value);
    
    if (isNaN(brightnessValue) || brightnessValue < 1 || brightnessValue > 255) {
        showToast('Error', 'Please enter a valid brightness value (1-255)', false);
        return;
    }

    const queryParams = new URLSearchParams({
        ip: currentConnection.ip,
        username: currentConnection.username,
        password: currentConnection.password,
        brightness: brightnessValue.toString()
    });

    fetch(`/led/change_brightness?${queryParams}`, {
        method: 'POST',  // Keep POST method, just move data to query params
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.output || 'Failed to change brightness');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output);  // Show raw backend output
        } else {
            showToast('Brightness Change Failed', data.output || 'Failed to change brightness', false);
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
    });
}



// Enhanced setNetwork with validation
function setNetwork() {
    const controllerIp = document.getElementById('network-controller-ip').value;
    const newIp = document.getElementById('new-ip').value;
    const subnetMask = document.getElementById('subnet-mask').value;
    const gateway = document.getElementById('gateway').value;

    // Validate inputs
    const errors = [];
    if (!isValidIP(controllerIp)) errors.push('Invalid controller IP');
    if (!isValidIP(newIp)) errors.push('Invalid new IP');
    if (!isValidIP(subnetMask)) errors.push('Invalid subnet mask');
    if (gateway && !isValidIP(gateway)) errors.push('Invalid gateway');

    if (errors.length > 0) {
        showToast('Validation Error', errors.join('<br>'), false);
        return;
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
        controller_ip: controllerIp,
        new_ip: newIp,
        subnetmask: subnetMask,
        gateway: gateway
    });

    fetch(`/led/set_controller_ip?${queryParams}`, {
        method: 'POST',  // POST method (no body)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.message || 'Failed to update network');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'failure') {
            // If top-level status is failure
            showToast('Network Update Failed', data.message || 'Failed to update network', false);
        } else if (data.remotefunction) {
            // If remotefunction exists -> Assume success
            showToast('Success', 'Network configuration updated successfully! Please restart the network.');
        } else {
            // Unexpected response
            showToast('Error', 'Unexpected response from server', false);
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
    });
}

function restartNetwork() {
    const controllerIp = document.getElementById('network-controller-ip').value;

    if (!isValidIP(controllerIp)) {
        showToast('Error', 'Invalid controller IP', false);
        return;
    }

    const queryParams = new URLSearchParams({
        controller_ip: controllerIp
    });

    fetch(`/led/restart_controller_network?${queryParams}`, {  // <-- correct endpoint + query params
        method: 'POST',
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.message || 'Failed to restart network');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'failure') {
            showToast('Restart Failed', data.message || 'Failed to restart network', false);
        } else if (data.remotefunction) {
            showToast('Success', 'Network restarted successfully! Your controller now has the new IP.');
        } else {
            showToast('Error', 'Unexpected response from server', false);
        }
    })
    .catch(error => {
        showToast('Error', 'Error restarting network: ' + error.message, false);
    });
}

function addProgram() {
    const programContainer = document.getElementById('program-container');
    const programCount = programContainer.querySelectorAll('.program-card').length;
    const programId = `program-${programCount + 1}`;

    const programCard = document.createElement('div');
    programCard.className = 'program-card card mb-3';
    programCard.id = programId;
    programCard.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Program #${programCount + 1}</h5>
            <button type="button" class="btn btn-sm btn-danger" onclick="removeProgram('${programId}')">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        <div class="card-body">
            <div class="row mb-3" id="${programId}-canvas-controls">
                <div class="col-md-3">
                    <label for="${programId}-canvasWidth" class="form-label">Width</label>
                    <input type="number" id="${programId}-canvasWidth" class="form-control" value="192" min="32" max="1024">
                </div>
                <div class="col-md-3">
                    <label for="${programId}-canvasHeight" class="form-label">Height</label>
                    <input type="number" id="${programId}-canvasHeight" class="form-control" value="96" min="32" max="1024">
                </div>
                <div class="col-md-3">
                    <button type="button" id="${programId}-updateCanvas" class="btn btn-primary mt-4" 
                            onclick="updateProgramCanvasSize('${programId}')">
                        Update Canvas
                    </button>
                </div>
            </div>
            <div class="row">
                <div class="col-md-3">
                    <div class="mb-3">
                        <label for="${programId}-type" class="form-label">Type</label>
                        <select class="form-select program-type" id="${programId}-type" onchange="updateProgramFields('${programId}')">
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-2">
                    <div class="mb-3">
                        <label for="${programId}-no" class="form-label">Program No</label>
                        <input type="number" class="form-control" id="${programId}-no" value="${programCount + 1}">
                    </div>
                </div>
                <div class="col-md-2">
                <div class="mb-3" id="${programId}-duration-container">
                    <label for="${programId}-duration" class="form-label">Duration (sec)</label>
                    <input type="number" class="form-control" id="${programId}-duration" value="5">
                </div>
            </div>
            
            <div id="${programId}-fields">
                <div class="row image-fields" style="display: none;">
                    <div class="col-md-12">
                        <div class="mb-3">
                            <label for="${programId}-image-path" class="form-label">Image Path</label>
                            <input type="text" class="form-control" id="${programId}-image-path" placeholder="Full path to image file">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-image-x" class="form-label">X Position</label>
                        <input type="number" class="form-control" id="${programId}-image-x" value="0">
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-image-y" class="form-label">Y Position</label>
                        <input type="number" class="form-control" id="${programId}-image-y" value="0">
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-image-width" class="form-label">Width</label>
                        <input type="number" class="form-control" id="${programId}-image-width" value="192">
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-image-height" class="form-label">Height</label>
                        <input type="number" class="form-control" id="${programId}-image-height" value="96">
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-image-duration" class="form-label">Duration (sec)</label>
                        <input type="number" class="form-control" id="${programId}-image-duration" value="5">
                    </div>
                </div>
                
                <div class="row video-fields" style="display: none;">
                    <div class="col-md-12">
                        <div class="mb-3">
                            <label for="${programId}-video-path" class="form-label">Video Path</label>
                            <input type="text" class="form-control" id="${programId}-video-path" placeholder="Full path to video file">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-video-x" class="form-label">X Position</label>
                        <input type="number" class="form-control" id="${programId}-video-x" value="0">
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-video-y" class="form-label">Y Position</label>
                        <input type="number" class="form-control" id="${programId}-video-y" value="0">
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-video-width" class="form-label">Width</label>
                        <input type="number" class="form-control" id="${programId}-video-width" value="192">
                    </div>
                    <div class="col-md-3">
                        <label for="${programId}-video-height" class="form-label">Height</label>
                        <input type="number" class="form-control" id="${programId}-video-height" value="96">
                    </div>
                </div>
                
                <div class="text-fields">
                    <div class="row mt-3">
                        <div class="col-md-3">
                            <button type="button" id="${programId}-add-text-btn" class="btn btn-success" onclick="addTextElementToProgram('${programId}')">
                                <i class="bi bi-plus"></i> Add Text Element
                            </button>
                        </div>
                        <div class="col-md-3">
                            <button type="button" id="${programId}-clear-text-btn" class="btn btn-danger" onclick="clearTextElementsInProgram('${programId}')">
                                <i class="bi bi-trash"></i> Clear All
                            </button>
                        </div>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-12">
                            <div class="canvas-container" style="border: 1px solid #ddd; padding: 10px;">
                                <canvas id="${programId}-canvas" width="192" height="96" style="background-color: #000;"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <div class="element-properties mt-3" id="${programId}-text-properties" style="display: none;">
                        <h4>Selected Text Element Properties</h4>
                        <div class="row">
                            <div class="col-md-2">
                                <label for="${programId}-elemX" class="form-label">X Position</label>
                                <input type="number" class="form-control" id="${programId}-elemX">
                            </div>
                            <div class="col-md-2">
                                <label for="${programId}-elemY" class="form-label">Y Position</label>
                                <input type="number" class="form-control" id="${programId}-elemY">
                            </div>
                            <div class="col-md-2">
                                <label for="${programId}-elemWidth" class="form-label">Width</label>
                                <input type="number" class="form-control" id="${programId}-elemWidth">
                            </div>
                            <div class="col-md-2">
                                <label for="${programId}-elemHeight" class="form-label">Height</label>
                                <input type="number" class="form-control" id="${programId}-elemHeight">
                            </div>
                            <div class="col-md-2">
                                <label for="${programId}-elemText" class="form-label">Text Content</label>
                                <input type="text" class="form-control" id="${programId}-elemText">
                            </div>
                            
                        </div>
                        <div class="row mt-2">
                            <div class="col-md-3">
                                <label for="${programId}-elemFont" class="form-label">Font</label>
                                <select id="${programId}-elemFont" class="form-select">
                                    <option value="Arial">Arial</option>
                                    <option value="Arial Black">Arial Black</option>
                                    <option value="Verdana">Verdana</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Courier New">Courier New</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Palatino">Palatino</option>
                                    <option value="Garamond">Garamond</option>
                                    <option value="Impact">Impact</option>
                                    <option value="Comic Sans MS">Comic Sans MS</option>
                                    <option value="Trebuchet MS">Trebuchet MS</option>
                                    <option value="Lucida Sans Unicode">Lucida Sans Unicode</option>
                                    <option value="Tahoma">Tahoma</option>
                                    <option value="Nirmala UI">Nirmala UI</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label for="${programId}-elemFontSize" class="form-label">Font Size</label>
                                <input type="number" id="${programId}-elemFontSize" class="form-control">
                            </div>
                            <div class="col-md-2">
                                <label for="${programId}-elemColor" class="form-label">Text Color</label>
                                <input type="color" id="${programId}-elemColor" class="form-control form-control-color" value="#ffffff">
                            </div>
                            <div class="col-md-2">
                                <label for="${programId}-elemBgColor" class="form-label">BG Color</label>
                                <input type="color" id="${programId}-elemBgColor" class="form-control form-control-color" value="#000000">
                            </div>
                            <div class="col-md-2">
                                <label for="${programId}-elemAnimationSpeed" class="form-label">Animation Speed (1-16)</label>
                                <input type="range" class="form-range" id="${programId}-elemAnimationSpeed" min="1" max="16" value="8">
                                <div class="text-center"><span id="${programId}-animationSpeedValue">8</span></div>
                            </div>
                           
                        </div>
                        <div class="row mt-2">
                            <div class="col-md-3">
                                <label for="${programId}-elemAlign" class="form-label">Text Alignment</label>
                                <select id="${programId}-elemAlign" class="form-select">
                                    <option value="near">Near</option>
                                    <option value="center">Center</option>
                                    <option value="far">Far</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="${programId}-elemVerticalAlign" class="form-label">Vertical Alignment</label>
                                <select id="${programId}-elemVerticalAlign" class="form-select">
                                    <option value="near">Near</option>
                                    <option value="center">Center</option>
                                    <option value="far">Far</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="${programId}-elemFontStyle" class="form-label">Font Style</label>
                                <select id="${programId}-elemFontStyle" class="form-select">
                                    <option value="normal">Normal</option>
                                    <option value="bold">Bold</option>
                                    <option value="italic">Italic</option>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label for="${programId}-elemAnimationType" class="form-label">Animation Type</label>
                                <select id="${programId}-elemAnimationType" class="form-select">
                                    <option value="50">Scroll UP</option>
                                    <option value="51">Scroll Down</option>
                                    <option value="52">Scroll Left</option>
                                    <option value="53">Scroll Right</option>
                                    <option value="2">Static</option>
                                </select>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-md-3">
                                <button type="button" id="${programId}-updateElement" class="btn btn-primary mt-4" onclick="updateTextElementInProgram('${programId}')">Update Element</button>
                            </div>
                            <div class="col-md-2">
                                <button type="button" id="${programId}-deleteElement" class="btn btn-danger mt-4" onclick="deleteSelectedTextElementInProgram('${programId}')">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    programContainer.appendChild(programCard);
    initializeProgramCanvas(programId);
    updateProgramsDropdown();
}



function updateProgramCanvasSize(programId) {
    const programData = programTextElements[programId];
    if (!programData) return;

    const newWidth = parseInt(document.getElementById(`${programId}-canvasWidth`).value);
    const newHeight = parseInt(document.getElementById(`${programId}-canvasHeight`).value);

    if (isNaN(newWidth) || isNaN(newHeight) || newWidth < 32 || newHeight < 32) {
        showToast('Error', 'Please enter valid canvas dimensions (minimum 32x32)', false);
        return;
    }

    // Update canvas dimensions
    programData.canvas.width = newWidth;
    programData.canvas.height = newHeight;

    // Redraw all elements
    redrawProgramCanvas(programId);
}


function initializeProgramCanvas(programId) {
    const canvas = document.getElementById(`${programId}-canvas`);
    const ctx = canvas.getContext('2d');

    programTextElements[programId] = {
        elements: [],
        selectedElement: null,
        canvas: canvas,
        ctx: ctx,
        isDragging: false,
        isResizing: false,
        resizeDirection: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
        originalWidth: canvas.width,  // Store original dimensions
        originalHeight: canvas.height
    };

    canvas.addEventListener('mousedown', (e) => handleProgramCanvasMouseDown(e, programId));
    canvas.addEventListener('mousemove', (e) => handleProgramCanvasMouseMove(e, programId));
    canvas.addEventListener('mouseup', () => handleProgramCanvasMouseUp(programId));
    canvas.addEventListener('mouseleave', () => handleProgramCanvasMouseUp(programId));

    document.getElementById(`${programId}-elemAnimationSpeed`).addEventListener('input', function() {
        document.getElementById(`${programId}-animationSpeedValue`).textContent = this.value;
        const programData = programTextElements[programId];
        if (programData.selectedElement) {
            programData.selectedElement.animationSpeed = parseInt(this.value);
            redrawProgramCanvas(programId);
        }
    });

    addTextElementToProgram(programId);
}

function addTextElementToProgram(programId) {
    const programData = programTextElements[programId];
    const newElement = {
        id: Date.now(),
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        text: 'Sample Text',
        font: 'Arial',
        fontSize: 16,
        color: '#ffffff',
        bgColor: '#000000',
        align: 'center',
        verticalAlign: 'center',
        fontStyle: 'normal',
        animationType: '2',
        animationSpeed: 8,
        originalWidth: 100,
        originalHeight: 50
    };

    programData.elements.push(newElement);
    programData.selectedElement = newElement;
    updateTextPropertiesPanelInProgram(programId, newElement);
    redrawProgramCanvas(programId);
}
function redrawProgramCanvas(programId) {
    const programData = programTextElements[programId];
    if (!programData) return;

    const ctx = programData.ctx;
    const canvas = programData.canvas;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= canvas.width; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= canvas.height; y += 16) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw all text elements (clipping to canvas bounds)
    programData.elements.forEach(element => {
        // Only draw elements that are at least partially visible
        if (element.x < canvas.width && element.y < canvas.height &&
            element.x + element.width > 0 && element.y + element.height > 0) {
            drawTextElementInProgram(programId, element);
        }
    });
}

function drawTextElementInProgram(programId, element) {
    const programData = programTextElements[programId];
    const ctx = programData.ctx;

    if (element.bgColor && element.bgColor !== '#000000') {
        ctx.fillStyle = element.bgColor;
        ctx.fillRect(element.x, element.y, element.width, element.height);
    }

    ctx.font = `${element.fontStyle} ${element.fontSize}px ${element.font}`;
    ctx.fillStyle = element.color;
    ctx.textBaseline = 'alphabetic';

    const lines = wrapText(ctx, element.text, element.width);
    const lineHeight = element.fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;

    let textBlockX = element.x;
    let textBlockY = element.y;

    if (lines.length > 0) {
        const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));

        switch (element.align) {
            case 'center':
                textBlockX = element.x + (element.width - maxLineWidth) / 2;
                break;
            case 'far':
                textBlockX = element.x + element.width - maxLineWidth;
                break;
        }
    }

    switch (element.verticalAlign) {
        case 'center':
            textBlockY = element.y + (element.height - totalTextHeight) / 2;
            break;
        case 'far':
            textBlockY = element.y + element.height - totalTextHeight;
            break;
    }

    lines.forEach((line, i) => {
        let lineX = textBlockX;
        ctx.fillText(line, lineX, textBlockY + (i * lineHeight) + element.fontSize);
    });

    if (element === programData.selectedElement) {
        drawSelectionIndicatorsInProgram(programId, element, textBlockX, textBlockY, lines, totalTextHeight);
    }
}
//word wrap previous use 

// Mouse interaction functions
function handleProgramCanvasMouseDown(e, programId) {
    const programData = programTextElements[programId];
    if (!programData) return;

    const rect = programData.canvas.getBoundingClientRect();
    const scaleX = programData.canvas.width / rect.width;
    const scaleY = programData.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (programData.selectedElement) {
        const direction = getResizeDirectionInProgram(programData.selectedElement, x, y);
        if (direction) {
            programData.isResizing = true;
            programData.resizeDirection = direction;
            return;
        }
    }

    for (let i = programData.elements.length - 1; i >= 0; i--) {
        const element = programData.elements[i];
        if (x >= element.x && x <= element.x + element.width &&
            y >= element.y && y <= element.y + element.height) {

            programData.selectedElement = element;
            updateTextPropertiesPanelInProgram(programId, element);
            redrawProgramCanvas(programId);

            programData.isDragging = true;
            programData.dragOffsetX = x - element.x;
            programData.dragOffsetY = y - element.y;
            return;
        }
    }

    programData.selectedElement = null;
    document.getElementById(`${programId}-text-properties`).style.display = 'none';
    redrawProgramCanvas(programId);
}



function handleProgramCanvasMouseMove(e, programId) {
    const programData = programTextElements[programId];
    if (!programData) return;

    const rect = programData.canvas.getBoundingClientRect();
    const scaleX = programData.canvas.width / rect.width;
    const scaleY = programData.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    updateProgramCursorStyle(programId, x, y);

    if (programData.isDragging && programData.selectedElement) {
        programData.selectedElement.x = Math.max(0, Math.min(x - programData.dragOffsetX, programData.canvas.width - programData.selectedElement.width));
        programData.selectedElement.y = Math.max(0, Math.min(y - programData.dragOffsetY, programData.canvas.height - programData.selectedElement.height));

        document.getElementById(`${programId}-elemX`).value = programData.selectedElement.x;
        document.getElementById(`${programId}-elemY`).value = programData.selectedElement.y;

        redrawProgramCanvas(programId);
    }
    else if (programData.isResizing && programData.selectedElement && programData.resizeDirection) {
        handleTextResizeInProgram(programId, programData.selectedElement, programData.resizeDirection, x, y);
        redrawProgramCanvas(programId);
    }
}

function handleProgramCanvasMouseUp(programId) {
    const programData = programTextElements[programId];
    if (!programData) return;

    programData.isDragging = false;
    programData.isResizing = false;
    programData.resizeDirection = null;
}


function updateProgramCursorStyle(programId, x, y) {
    const programData = programTextElements[programId];
    if (!programData) return;

    if (programData.selectedElement) {
        const direction = getResizeDirectionInProgram(programData.selectedElement, x, y);

        if (direction) {
            let cursor;
            switch (direction) {
                case 'nw': 
                case 'se': 
                    cursor = 'nwse-resize'; 
                    break;
                case 'ne': 
                case 'sw': 
                    cursor = 'nesw-resize'; 
                    break;
                case 'n':
                case 's':
                    cursor = 'ns-resize';
                    break;
                case 'w':
                case 'e':
                    cursor = 'ew-resize';
                    break;
            }
            programData.canvas.style.cursor = cursor;
            return;
        }

        if (x >= programData.selectedElement.x && x <= programData.selectedElement.x + programData.selectedElement.width &&
            y >= programData.selectedElement.y && y <= programData.selectedElement.y + programData.selectedElement.height) {
            programData.canvas.style.cursor = 'move';
            return;
        }
    }

    programData.canvas.style.cursor = 'default';
}


function getResizeDirectionInProgram(element, x, y) {
    const handles = {
        'nw': { x: element.x - RESIZE_HANDLE_SIZE / 2, y: element.y - RESIZE_HANDLE_SIZE / 2 },
        'ne': { x: element.x + element.width - RESIZE_HANDLE_SIZE / 2, y: element.y - RESIZE_HANDLE_SIZE / 2 },
        'sw': { x: element.x - RESIZE_HANDLE_SIZE / 2, y: element.y + element.height - RESIZE_HANDLE_SIZE / 2 },
        'se': { x: element.x + element.width - RESIZE_HANDLE_SIZE / 2, y: element.y + element.height - RESIZE_HANDLE_SIZE / 2 },
        'n': { x: element.x + element.width / 2 - RESIZE_HANDLE_SIZE / 2, y: element.y - RESIZE_HANDLE_SIZE / 2 },
        's': { x: element.x + element.width / 2 - RESIZE_HANDLE_SIZE / 2, y: element.y + element.height - RESIZE_HANDLE_SIZE / 2 },
        'w': { x: element.x - RESIZE_HANDLE_SIZE / 2, y: element.y + element.height / 2 - RESIZE_HANDLE_SIZE / 2 },
        'e': { x: element.x + element.width - RESIZE_HANDLE_SIZE / 2, y: element.y + element.height / 2 - RESIZE_HANDLE_SIZE / 2 }
    };

    for (const [dir, handle] of Object.entries(handles)) {
        if (x >= handle.x && x <= handle.x + RESIZE_HANDLE_SIZE &&
            y >= handle.y && y <= handle.y + RESIZE_HANDLE_SIZE) {
            return dir;
        }
    }

    return null;
}

function handleTextResizeInProgram(programId, element, direction, x, y) {
    const programData = programTextElements[programId];
    if (!programData) return;

    const minSize = 10;
    const canvas = programData.canvas;

    switch (direction) {
        case 'nw':
            element.width = Math.max(minSize, element.x + element.width - x);
            element.height = Math.max(minSize, element.y + element.height - y);
            element.x = Math.max(0, x);
            element.y = Math.max(0, y);
            break;
        case 'ne':
            element.width = Math.max(minSize, x - element.x);
            element.height = Math.max(minSize, element.y + element.height - y);
            element.y = Math.max(0, y);
            element.width = Math.min(element.width, canvas.width - element.x);
            break;
        case 'sw':
            element.width = Math.max(minSize, element.x + element.width - x);
            element.height = Math.max(minSize, y - element.y);
            element.x = Math.max(0, x);
            element.height = Math.min(element.height, canvas.height - element.y);
            break;
        case 'se':
            element.width = Math.max(minSize, x - element.x);
            element.height = Math.max(minSize, y - element.y);
            element.width = Math.min(element.width, canvas.width - element.x);
            element.height = Math.min(element.height, canvas.height - element.y);
            break;
        case 'n':
            element.height = Math.max(minSize, element.y + element.height - y);
            element.y = Math.max(0, y);
            break;
        case 's':
            element.height = Math.max(minSize, y - element.y);
            element.height = Math.min(element.height, canvas.height - element.y);
            break;
        case 'w':
            element.width = Math.max(minSize, element.x + element.width - x);
            element.x = Math.max(0, x);
            break;
        case 'e':
            element.width = Math.max(minSize, x - element.x);
            element.width = Math.min(element.width, canvas.width - element.x);
            break;
    }

    if (event.shiftKey && element.originalWidth && element.originalHeight) {
        const scale = element.width / element.originalWidth;
        element.fontSize = Math.max(8, Math.round(element.fontSize * scale));
    }

    document.getElementById(`${programId}-elemWidth`).value = element.width;
    document.getElementById(`${programId}-elemHeight`).value = element.height;
}

function drawSelectionIndicatorsInProgram(programId, element, textBlockX, textBlockY, lines, totalTextHeight) {
    const programData = programTextElements[programId];
    if (!programData) return;

    const ctx = programData.ctx;

    ctx.strokeStyle = '#0d6efd';
    ctx.lineWidth = 2;
    ctx.strokeRect(element.x, element.y, element.width, element.height);

    if (element.align !== 'near' || element.verticalAlign !== 'near') {
        ctx.strokeStyle = 'rgba(13, 110, 253, 0.5)';
        ctx.lineWidth = 1;

        const maxLineWidth = lines.length > 0
            ? Math.max(...lines.map(line => ctx.measureText(line).width))
            : 0;

        ctx.strokeRect(textBlockX, textBlockY, maxLineWidth, totalTextHeight);
    }

    ctx.fillStyle = 'rgba(13, 110, 253, 0.7)';

    if (lines.length > 0) {
        const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        ctx.fillRect(textBlockX, element.y + element.height + 2, maxLineWidth, 3);
    }

    ctx.fillRect(element.x + element.width + 2, textBlockY, 3, totalTextHeight);

    drawResizeHandlesInProgram(programId, element);
}
function drawResizeHandlesInProgram(programId, element) {
    const programData = programTextElements[programId];
    if (!programData) return;

    const ctx = programData.ctx;
    ctx.fillStyle = '#0d6efd';

    // Corner handles
    ctx.fillRect(element.x - RESIZE_HANDLE_SIZE / 2, element.y - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE); // NW
    ctx.fillRect(element.x + element.width - RESIZE_HANDLE_SIZE / 2, element.y - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE); // NE
    ctx.fillRect(element.x - RESIZE_HANDLE_SIZE / 2, element.y + element.height - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE); // SW
    ctx.fillRect(element.x + element.width - RESIZE_HANDLE_SIZE / 2, element.y + element.height - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE); // SE
    
    // Middle handles
    ctx.fillRect(element.x + element.width / 2 - RESIZE_HANDLE_SIZE / 2, element.y - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE); // N
    ctx.fillRect(element.x + element.width / 2 - RESIZE_HANDLE_SIZE / 2, element.y + element.height - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE); // S
    ctx.fillRect(element.x - RESIZE_HANDLE_SIZE / 2, element.y + element.height / 2 - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE); // W
    ctx.fillRect(element.x + element.width - RESIZE_HANDLE_SIZE / 2, element.y + element.height / 2 - RESIZE_HANDLE_SIZE / 2, RESIZE_HANDLE_SIZE, RESIZE_HANDLE_SIZE); // E
}

function updateTextPropertiesPanelInProgram(programId, element) {
    const panel = document.getElementById(`${programId}-text-properties`);
    panel.style.display = 'block';

    document.getElementById(`${programId}-elemX`).value = element.x;
    document.getElementById(`${programId}-elemY`).value = element.y;
    document.getElementById(`${programId}-elemWidth`).value = element.width;
    document.getElementById(`${programId}-elemHeight`).value = element.height;
    document.getElementById(`${programId}-elemText`).value = element.text;
    document.getElementById(`${programId}-elemFont`).value = element.font;
    document.getElementById(`${programId}-elemFontSize`).value = element.fontSize;
    document.getElementById(`${programId}-elemColor`).value = element.color;
    document.getElementById(`${programId}-elemBgColor`).value = element.bgColor;
    document.getElementById(`${programId}-elemAlign`).value = element.align;
    document.getElementById(`${programId}-elemVerticalAlign`).value = element.verticalAlign;
    document.getElementById(`${programId}-elemFontStyle`).value = element.fontStyle;
    document.getElementById(`${programId}-elemAnimationType`).value = element.animationType;
    document.getElementById(`${programId}-elemAnimationSpeed`).value = element.animationSpeed;
    document.getElementById(`${programId}-animationSpeedValue`).textContent = element.animationSpeed;
}
function updateTextElementInProgram(programId) {
    const programData = programTextElements[programId];
    if (!programData || !programData.selectedElement) return;

    const element = programData.selectedElement;

    element.x = parseInt(document.getElementById(`${programId}-elemX`).value);
    element.y = parseInt(document.getElementById(`${programId}-elemY`).value);
    element.width = parseInt(document.getElementById(`${programId}-elemWidth`).value);
    element.height = parseInt(document.getElementById(`${programId}-elemHeight`).value);
    element.text = document.getElementById(`${programId}-elemText`).value;
    element.font = document.getElementById(`${programId}-elemFont`).value;
    element.fontSize = parseInt(document.getElementById(`${programId}-elemFontSize`).value);
    element.color = document.getElementById(`${programId}-elemColor`).value;
    element.bgColor = document.getElementById(`${programId}-elemBgColor`).value;
    element.align = document.getElementById(`${programId}-elemAlign`).value;
    element.verticalAlign = document.getElementById(`${programId}-elemVerticalAlign`).value;
    element.fontStyle = document.getElementById(`${programId}-elemFontStyle`).value;
    element.animationType = document.getElementById(`${programId}-elemAnimationType`).value;
    element.animationSpeed = parseInt(document.getElementById(`${programId}-elemAnimationSpeed`).value);

    redrawProgramCanvas(programId);
}

function deleteSelectedTextElementInProgram(programId) {
    const programData = programTextElements[programId];
    if (!programData || !programData.selectedElement) return;

    programData.elements = programData.elements.filter(el => el.id !== programData.selectedElement.id);
    programData.selectedElement = null;
    document.getElementById(`${programId}-text-properties`).style.display = 'none';
    redrawProgramCanvas(programId);
}

function clearTextElementsInProgram(programId) {
    const programData = programTextElements[programId];
    if (!programData) return;

    programData.elements = [];
    programData.selectedElement = null;
    document.getElementById(`${programId}-text-properties`).style.display = 'none';
    redrawProgramCanvas(programId);
}
function removeProgram(programId) {
    const programCard = document.getElementById(programId);
    if (programCard) {
        programCard.remove();
    }
    delete programTextElements[programId];
    updateProgramsDropdown();
}
// Update the updateProgramFields function to show/hide canvas controls
function updateProgramFields(programId) {
    const programType = document.getElementById(`${programId}-type`).value;
    const fieldsContainer = document.getElementById(`${programId}-fields`);
    const canvasControls = document.getElementById(`${programId}-canvas-controls`);
    
    // Show/hide canvas controls based on program type
    canvasControls.style.display = programType === 'text' ? 'flex' : 'none';
    
    // Hide all field groups first
    fieldsContainer.querySelectorAll('.text-fields, .image-fields, .video-fields').forEach(group => {
        group.style.display = 'none';
    });
    
    // Show the appropriate fields
    fieldsContainer.querySelectorAll(`.${programType}-fields`).forEach(group => {
        group.style.display = 'flex';
    });
    
    // Show/hide only the update button based on program type
    const updateButton = document.getElementById(`${programId}-updateCanvas`);
    if (updateButton) {
        updateButton.style.display = programType === 'text' ? 'block' : 'none';
    }
    const textduration = document.getElementById(`${programId}-duration-container`);
    if (textduration){
        textduration.style.display = programType === 'text' ? 'block' : 'none';
    }
}




// Enhanced sendPrograms with validation
function sendPrograms() {
    if (!currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

    const programCards = document.getElementById('program-container').querySelectorAll('.program-card');
    if (programCards.length === 0) {
        showToast('Error', 'Please add at least one program', false);
        return;
    }

    const programs = [];
    const errors = [];

    programCards.forEach(card => {
        const programId = card.id;
        const type = document.getElementById(`${programId}-type`).value;
        const programData = programTextElements[programId];

        const program = {
            program_no: parseInt(document.getElementById(`${programId}-no`).value),
            type: type
        };

        if (isNaN(program.program_no) || program.program_no <= 0) {
            errors.push(`Program ${programId}: Invalid program number`);
        }

        if (type === 'text') {
            if (!programData || programData.elements.length === 0) {
                errors.push(`Program ${programId}: No text elements added`);
            } else {
                program.text_areas = programData.elements.map(element => ({
                    x: element.x,
                    y: element.y,
                    width: element.width,
                    height: element.height,
                    text: element.text,
                    font_name: element.font,
                    font_size: element.fontSize,
                    font_color: element.color,
                    bg_color: element.bgColor,
                    h_align: element.align.toUpperCase(),
                    v_align: element.verticalAlign.toUpperCase(),
                    font_style: element.fontStyle.toUpperCase(),
                    animation_type: parseInt(element.animationType),
                    animation_speed: parseInt(element.animationSpeed),
                    duration: parseInt(document.getElementById(`${programId}-duration`).value)
                }));

                // Validate text elements
                program.text_areas.forEach((area, idx) => {
                    if (!area.text || area.text.trim() === '') {
                        errors.push(`Program ${programId}: Text element ${idx + 1} has no content`);
                    }
                    if (isNaN(area.duration)) {
                        errors.push(`Program ${programId}: Invalid duration for text element ${idx + 1}`);
                    }
                });
            }
        } else if (type === 'image') {
            program.x = parseInt(document.getElementById(`${programId}-image-x`).value);
            program.y = parseInt(document.getElementById(`${programId}-image-y`).value);
            program.width = parseInt(document.getElementById(`${programId}-image-width`).value);
            program.height = parseInt(document.getElementById(`${programId}-image-height`).value);
            program.media_path = document.getElementById(`${programId}-image-path`).value;
            program.duration = parseInt(document.getElementById(`${programId}-image-duration`).value);

            if (!program.media_path || program.media_path.trim() === '') {
                errors.push(`Program ${programId}: Image path is required`);
            }
            if (isNaN(program.duration)) {
                errors.push(`Program ${programId}: Invalid image duration`);
            }
        } else if (type === 'video') {
            program.x = parseInt(document.getElementById(`${programId}-video-x`).value);
            program.y = parseInt(document.getElementById(`${programId}-video-y`).value);
            program.width = parseInt(document.getElementById(`${programId}-video-width`).value);
            program.height = parseInt(document.getElementById(`${programId}-video-height`).value);
            program.media_path = document.getElementById(`${programId}-video-path`).value;
            program.duration = parseInt(document.getElementById(`${programId}-duration`).value);

            if (!program.media_path || program.media_path.trim() === '') {
                errors.push(`Program ${programId}: Video path is required`);
            }
            if (isNaN(program.duration)) {
                errors.push(`Program ${programId}: Invalid video duration`);
            }
        }

        programs.push(program);
    });

    if (errors.length > 0) {
        showToast('Validation Error', errors.join('<br>'), false);
        return;
    }

    const formData = {
        ip: currentConnection.ip,
        username: currentConnection.username,
        password: currentConnection.password,
        programs: programs
    };

    fetch('/led/send_multiple_programs_with_textareas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.output || 'Failed to send programs');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output);  // <-- show raw backend output
        } else {
            showToast('Program Send Failed', data.output || 'Failed to send programs', false);
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
    });
}


// Enhanced syncTime with validation









function syncTime() {
    if (!currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

    const queryParams = new URLSearchParams({
        ip: currentConnection.ip,
        username: currentConnection.username,
        password: currentConnection.password
    });

    fetch(`/led/sync_time?${queryParams}`, {
        method: 'POST',  // Keep method POST, but move params to query
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.output || 'Failed to sync time');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output);  // <-- show raw backend output
        } else {
            showToast('Time Sync Failed', data.output || 'Failed to sync time', false);
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
    });
}



// Enhanced captureScreen with validation

function captureScreen() {
    if (!currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

    const loadingDiv = document.getElementById('screen-capture-loading');
    const previewImg = document.getElementById('screen-capture-preview');

    loadingDiv.classList.remove('d-none');
    previewImg.style.display = 'none';

    fetch('/led/capture', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            ...currentConnection
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.output || 'Failed to capture screen');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output);

            if (data.image_url) {
                previewImg.src = data.image_url + '?t=' + new Date().getTime(); // cache-busting
                previewImg.style.display = 'block';
            }
        } else {
            showToast('Capture Failed', data.output || 'Failed to capture screen', false);
            previewImg.src = '/static/images/no-image.png';
            previewImg.style.display = 'block';
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
        previewImg.src = '/static/images/no-image.png';
        previewImg.style.display = 'block';
    })
    .finally(() => {
        loadingDiv.classList.add('d-none');
    });
}









// Initialize play mode controls when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Play mode switch button handler
    document.getElementById('applyPlayModeBtn').addEventListener('click', function () {
        const selectedMode = document.getElementById('playModeSelect').value;
        const modeValue = selectedMode === 'sync' ? 'sync' : 'normal';
        switchPlayMode(modeValue);
    });
});

// Enhanced switchPlayMode with validation
function switchPlayMode(mode) {
    if (!currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

    const modeName = mode === 'sync' ? 'HDMI IN' : 'NORMAL';
    showToast('Info', `Switching to ${modeName} mode...`, true);

    fetch('/led/switch_play_mode', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            ...currentConnection,
            mode 
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.output || `Failed to switch to ${modeName} mode`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output);  // <-- Show backend output
        } else {
            showToast('Switch Mode Failed', data.output || `Failed to switch to ${modeName} mode`, false);
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
    });
}



// Global variables for text editor
let previewCanvas, previewCtx;
let textElements = [];
let selectedTextElement = null;
// Add these global variables at the top with other globals
let isDraggingText = false;
let isResizingText = false;
let resizeDirection = null;
let dragOffsetX, dragOffsetY;
const resizeHandleSize = 8;

// Initialize the text editor when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initialize canvas
    previewCanvas = document.getElementById('previewCanvas');
    previewCtx = previewCanvas.getContext('2d');
    setupTextEditor();

});

function setupTextEditor() {
    // Set up event listeners for canvas controls
    document.getElementById('updateCanvas').addEventListener('click', function () {
        previewCanvas.width = parseInt(document.getElementById('canvasWidth').value);
        previewCanvas.height = parseInt(document.getElementById('canvasHeight').value);
        redrawTextCanvas();
        // Add mouse event listeners for the canvas
        previewCanvas.addEventListener('mousedown', handleCanvasMouseDown);
        previewCanvas.addEventListener('mousemove', handleCanvasMouseMove);
        previewCanvas.addEventListener('mouseup', handleCanvasMouseUp);
        previewCanvas.addEventListener('mouseleave', handleCanvasMouseUp);
    });

    document.getElementById('addTextBtn').addEventListener('click', addTextElement);
    document.getElementById('updateElement').addEventListener('click', updateTextElementFromPanel);
    document.getElementById('deleteElement').addEventListener('click', deleteSelectedTextElement);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllTextElements);


    // Animation speed slider
    document.getElementById('elemAnimationSpeed').addEventListener('input', function() {
        document.getElementById('animationSpeedValue').textContent = this.value;
        if (selectedTextElement) {
            selectedTextElement.animationSpeed = parseInt(this.value);
            redrawTextCanvas();
        }
    });

    // Initialize with one default text element
    addTextElement();
}

// Add these new functions for handling mouse interactions
function handleCanvasMouseDown(e) {
    const rect = previewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on a resize handle
    if (selectedTextElement) {
        const direction = getResizeDirection(selectedTextElement, x, y);
        if (direction) {
            isResizingText = true;
            resizeDirection = direction;
            return;
        }
    }

    // Check if clicked on an element
    for (let i = textElements.length - 1; i >= 0; i--) {
        const element = textElements[i];
        if (x >= element.x && x <= element.x + element.width &&
            y >= element.y && y <= element.y + element.height) {

            selectedTextElement = element;
            updateTextPropertiesPanel(element);
            redrawTextCanvas();

            // Setup for dragging
            isDraggingText = true;
            dragOffsetX = x - element.x;
            dragOffsetY = y - element.y;
            return;
        }
    }

    // Clicked on empty space
    selectedTextElement = null;
    document.querySelector('.element-properties').style.display = 'none';
    redrawTextCanvas();
}

function handleCanvasMouseMove(e) {
    const rect = previewCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateCursorStyle(x, y);

    if (isDraggingText && selectedTextElement) {
        // Update element position
        selectedTextElement.x = Math.max(0, Math.min(x - dragOffsetX, previewCanvas.width - selectedTextElement.width));
        selectedTextElement.y = Math.max(0, Math.min(y - dragOffsetY, previewCanvas.height - selectedTextElement.height));

        // Update properties panel
        document.getElementById('elemX').value = selectedTextElement.x;
        document.getElementById('elemY').value = selectedTextElement.y;

        redrawTextCanvas();
    }
    else if (isResizingText && selectedTextElement && resizeDirection) {
        handleTextResize(selectedTextElement, resizeDirection, x, y);
        redrawTextCanvas();
    }
}

function handleCanvasMouseUp() {
    isDraggingText = false;
    isResizingText = false;
    resizeDirection = null;
}

function updateCursorStyle(x, y) {
    if (selectedTextElement) {
        const direction = getResizeDirection(selectedTextElement, x, y);

        if (direction) {
            let cursor;
            switch (direction) {
                case 'nw': case 'se': cursor = 'nwse-resize'; break;
                case 'ne': case 'sw': cursor = 'nesw-resize'; break;
                case 'n': case 's': cursor = 'ns-resize'; break;
                case 'w': case 'e': cursor = 'ew-resize'; break;
            }
            previewCanvas.style.cursor = cursor;
            return;
        }

        if (x >= selectedTextElement.x && x <= selectedTextElement.x + selectedTextElement.width &&
            y >= selectedTextElement.y && y <= selectedTextElement.y + selectedTextElement.height) {
            previewCanvas.style.cursor = 'move';
            return;
        }
    }

    previewCanvas.style.cursor = 'default';
}

function getResizeDirection(element, x, y) {
    const handles = {
        'nw': { x: element.x - resizeHandleSize / 2, y: element.y - resizeHandleSize / 2 },
        'ne': { x: element.x + element.width - resizeHandleSize / 2, y: element.y - resizeHandleSize / 2 },
        'sw': { x: element.x - resizeHandleSize / 2, y: element.y + element.height - resizeHandleSize / 2 },
        'se': { x: element.x + element.width - resizeHandleSize / 2, y: element.y + element.height - resizeHandleSize / 2 },
        'n': { x: element.x + element.width / 2 - resizeHandleSize / 2, y: element.y - resizeHandleSize / 2 },
        's': { x: element.x + element.width / 2 - resizeHandleSize / 2, y: element.y + element.height - resizeHandleSize / 2 },
        'w': { x: element.x - resizeHandleSize / 2, y: element.y + element.height / 2 - resizeHandleSize / 2 },
        'e': { x: element.x + element.width - resizeHandleSize / 2, y: element.y + element.height / 2 - resizeHandleSize / 2 }
    };

    for (const [dir, handle] of Object.entries(handles)) {
        if (x >= handle.x && x <= handle.x + resizeHandleSize &&
            y >= handle.y && y <= handle.y + resizeHandleSize) {
            return dir;
        }
    }

    return null;
}

function handleTextResize(element, direction, x, y) {
    const minSize = 10; // Minimum width/height

    switch (direction) {
        case 'nw':
            element.width = Math.max(minSize, element.x + element.width - x);
            element.height = Math.max(minSize, element.y + element.height - y);
            element.x = x;
            element.y = y;
            break;
        case 'ne':
            element.width = Math.max(minSize, x - element.x);
            element.height = Math.max(minSize, element.y + element.height - y);
            element.y = y;
            break;
        case 'sw':
            element.width = Math.max(minSize, element.x + element.width - x);
            element.height = Math.max(minSize, y - element.y);
            element.x = x;
            break;
        case 'se':
            element.width = Math.max(minSize, x - element.x);
            element.height = Math.max(minSize, y - element.y);
            break;
        case 'n':
            element.height = Math.max(minSize, element.y + element.height - y);
            element.y = y;
            break;
        case 's':
            element.height = Math.max(minSize, y - element.y);
            break;
        case 'w':
            element.width = Math.max(minSize, element.x + element.width - x);
            element.x = x;
            break;
        case 'e':
            element.width = Math.max(minSize, x - element.x);
            break;
    }

    // Update font size proportionally if holding shift key
    if (event.shiftKey && element.originalWidth && element.originalHeight) {
        const scale = element.width / element.originalWidth;
        element.fontSize = Math.max(8, Math.round(element.fontSize * scale));
    }

    // Update properties panel
    document.getElementById('elemWidth').value = element.width;
    document.getElementById('elemHeight').value = element.height;
}
function drawTextElement(element) {
    // Draw background if specified
    if (element.bgColor && element.bgColor !== '#000000') {
        previewCtx.fillStyle = element.bgColor;
        previewCtx.fillRect(element.x, element.y, element.width, element.height);
    }

    // Set font properties
    previewCtx.font = `${element.fontStyle} ${element.fontSize}px ${element.font}`;
    previewCtx.fillStyle = element.color;
    previewCtx.textBaseline = 'alphabetic'; // Better vertical alignment

    // Split text into lines that fit within the element's width
    const lines = wrapText(previewCtx, element.text, element.width);
    const lineHeight = element.fontSize * 1.2;

    // Calculate total text height
    const totalTextHeight = lines.length * lineHeight;

    // Calculate vertical position based on alignment
    let textY = element.y;
    if (element.verticalAlign === 'center') {
        textY = element.y + (element.height - totalTextHeight) / 2;
    } else if (element.verticalAlign === 'far') {
        textY = element.y + element.height - totalTextHeight;
    }

    // Draw each line of text
    lines.forEach((line, i) => {
        let textX = element.x;
        const textWidth = previewCtx.measureText(line).width;

        // Apply horizontal alignment
        switch (element.align) {
            case 'center':
                textX = element.x + (element.width - textWidth) / 2;
                break;
            case 'far':
                textX = element.x + element.width - textWidth;
                break;
            // 'near' is the default (left-aligned)
        }

        previewCtx.fillText(line, textX, textY + (i * lineHeight) + element.fontSize);
    });

    // Draw selection indicators
    if (element === selectedTextElement) {
        drawSelectionIndicators(element, lines, totalTextHeight);
    }
}
function drawSelectionIndicators(element, textBlockX, textBlockY, lines, totalTextHeight) {
    // Draw element boundary
    previewCtx.strokeStyle = '#0d6efd';
    previewCtx.lineWidth = 2;
    previewCtx.strokeRect(element.x, element.y, element.width, element.height);

    // Draw text block boundary if different from element boundary
    if (element.align !== 'near' || element.verticalAlign !== 'near') {
        previewCtx.strokeStyle = 'rgba(13, 110, 253, 0.5)';
        previewCtx.lineWidth = 1;

        const maxLineWidth = lines.length > 0
            ? Math.max(...lines.map(line => previewCtx.measureText(line).width))
            : 0;

        previewCtx.strokeRect(
            textBlockX,
            textBlockY,
            maxLineWidth,
            totalTextHeight
        );
    }

    // Draw alignment indicators
    previewCtx.fillStyle = 'rgba(13, 110, 253, 0.7)';

    // Horizontal alignment indicator
    if (lines.length > 0) {
        const indicatorHeight = 3;
        const maxLineWidth = Math.max(...lines.map(line => previewCtx.measureText(line).width));

        previewCtx.fillRect(
            textBlockX,
            element.y + element.height + 2,
            maxLineWidth,
            indicatorHeight
        );
    }

    // Vertical alignment indicator
    previewCtx.fillRect(
        element.x + element.width + 2,
        textBlockY,
        3,
        totalTextHeight
    );

    // Draw resize handles (existing resize handle code)
    drawResizeHandles(element);
}
function drawAlignmentIndicators(element, lines, totalTextHeight, lineHeight) {
    if (lines.length === 0) return;

    previewCtx.fillStyle = 'rgba(13, 110, 253, 0.3)';
    const markerSize = 5;

    // Horizontal alignment indicator
    const firstLine = lines[0];
    const firstLineWidth = previewCtx.measureText(firstLine).width;

    switch (element.align) {
        case 'near':
            previewCtx.fillRect(
                element.x,
                element.y + element.height + 2,
                firstLineWidth,
                markerSize
            );
            break;
        case 'center':
            previewCtx.fillRect(
                element.x + (element.width - firstLineWidth) / 2,
                element.y + element.height + 2,
                firstLineWidth,
                markerSize
            );
            break;
        case 'far':
            previewCtx.fillRect(
                element.x + element.width - firstLineWidth,
                element.y + element.height + 2,
                firstLineWidth,
                markerSize
            );
            break;
    }

    // Vertical alignment indicator
    switch (element.verticalAlign) {
        case 'near':
            previewCtx.fillRect(
                element.x + element.width + 2,
                element.y,
                markerSize,
                totalTextHeight
            );
            break;
        case 'center':
            previewCtx.fillRect(
                element.x + element.width + 2,
                element.y + (element.height - totalTextHeight) / 2,
                markerSize,
                totalTextHeight
            );
            break;
        case 'far':
            previewCtx.fillRect(
                element.x + element.width + 2,
                element.y + element.height - totalTextHeight,
                markerSize,
                totalTextHeight
            );
            break;
    }
}
function drawResizeHandles(element) {
    previewCtx.fillStyle = '#0d6efd';

    // Top-left
    previewCtx.fillRect(
        element.x - resizeHandleSize / 2,
        element.y - resizeHandleSize / 2,
        resizeHandleSize,
        resizeHandleSize
    );
    // Top-right
    previewCtx.fillRect(
        element.x + element.width - resizeHandleSize / 2,
        element.y - resizeHandleSize / 2,
        resizeHandleSize,
        resizeHandleSize
    );
    // Bottom-left
    previewCtx.fillRect(
        element.x - resizeHandleSize / 2,
        element.y + element.height - resizeHandleSize / 2,
        resizeHandleSize,
        resizeHandleSize
    );
    // Bottom-right
    previewCtx.fillRect(
        element.x + element.width - resizeHandleSize / 2,
        element.y + element.height - resizeHandleSize / 2,
        resizeHandleSize,
        resizeHandleSize
    );
}


// Update the addTextElement function to include original dimensions
function addTextElement() {
    const newElement = {
        id: Date.now(),
        x: 10,
        y: 10,
        width: 100,
        height: 50,
        text: 'Sample Text',
        font: 'Arial',
        fontSize: 16,
        color: '#ffffff',
        bgColor: '#000000',
        align: 'center',  // Default to center alignment
        verticalAlign: 'center',  // Default to center alignment
        fontStyle: 'normal',
        animationType: '2',  // No animation by default
        animationSpeed: 8,   // Medium speed by default
        originalWidth: 100,
        originalHeight: 50
    };

    textElements.push(newElement);
    selectedTextElement = newElement;
    updateTextPropertiesPanel(newElement);
    redrawTextCanvas();
}

function redrawTextCanvas() {
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    // Draw grid
    previewCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    previewCtx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= previewCanvas.width; x += 16) {
        previewCtx.beginPath();
        previewCtx.moveTo(x, 0);
        previewCtx.lineTo(x, previewCanvas.height);
        previewCtx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= previewCanvas.height; y += 16) {
        previewCtx.beginPath();
        previewCtx.moveTo(0, y);
        previewCtx.lineTo(previewCanvas.width, y);
        previewCtx.stroke();
    }

    // Draw all text elements
    textElements.forEach(element => {
        drawTextElement(element);
    });
}
function drawTextElement(element) {
    // Draw background if specified
    if (element.bgColor && element.bgColor !== '#000000') {
        previewCtx.fillStyle = element.bgColor;
        previewCtx.fillRect(element.x, element.y, element.width, element.height);
    }

    // Set font properties
    previewCtx.font = `${element.fontStyle} ${element.fontSize}px ${element.font}`;
    previewCtx.fillStyle = element.color;
    previewCtx.textBaseline = 'alphabetic';

    // Split text into lines that fit within the element's width
    const lines = wrapText(previewCtx, element.text, element.width);
    const lineHeight = element.fontSize * 1.2;
    const totalTextHeight = lines.length * lineHeight;

    // Calculate text block position within element
    let textBlockX = element.x;
    let textBlockY = element.y;

    // Horizontal alignment of text block
    if (lines.length > 0) {
        const maxLineWidth = Math.max(...lines.map(line => previewCtx.measureText(line).width));

        switch (element.align) {
            case 'center':
                textBlockX = element.x + (element.width - maxLineWidth) / 2;
                break;
            case 'far':
                textBlockX = element.x + element.width - maxLineWidth;
                break;
            // 'near' (left) is default
        }
    }

    // Vertical alignment of text block
    switch (element.verticalAlign) {
        case 'center':
            textBlockY = element.y + (element.height - totalTextHeight) / 2;
            break;
        case 'far':
            textBlockY = element.y + element.height - totalTextHeight;
            break;
        // 'near' (top) is default
    }

    // Draw each line of text
    lines.forEach((line, i) => {
        let lineX = textBlockX;
        const lineWidth = previewCtx.measureText(line).width;

        // For center/far alignment, keep text block aligned but individual lines left-aligned
        // within the block (or adjust per your requirements)
        previewCtx.fillText(line, lineX, textBlockY + (i * lineHeight) + element.fontSize);
    });

    // Draw selection indicators if this is the selected element
    if (element === selectedTextElement) {
        drawSelectionIndicators(element, textBlockX, textBlockY, lines, totalTextHeight);
    }
}
function wrapText(context, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + ' ' + word).width;

        if (width <= maxWidth) {
            currentLine += ' ' + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
}

function updateTextPropertiesPanel(element) {
    document.querySelector('.element-properties').style.display = 'block';
    document.getElementById('elemX').value = element.x;
    document.getElementById('elemY').value = element.y;
    document.getElementById('elemWidth').value = element.width;
    document.getElementById('elemHeight').value = element.height;
    document.getElementById('elemText').value = element.text;
    document.getElementById('elemFont').value = element.font;
    document.getElementById('elemFontSize').value = element.fontSize;
    document.getElementById('elemColor').value = element.color;
    document.getElementById('elemBgColor').value = element.bgColor;
    document.getElementById('elemAlign').value = element.align;
    document.getElementById('elemVerticalAlign').value = element.verticalAlign;
    document.getElementById('elemFontStyle').value = element.fontStyle;
    document.getElementById('elemAnimationType').value = element.animationType;
    document.getElementById('elemAnimationSpeed').value = element.animationSpeed;
    document.getElementById('animationSpeedValue').textContent = element.animationSpeed;
}

function updateTextElementFromPanel() {
    if (!selectedTextElement) return;

    selectedTextElement.x = parseInt(document.getElementById('elemX').value);
    selectedTextElement.y = parseInt(document.getElementById('elemY').value);
    selectedTextElement.width = parseInt(document.getElementById('elemWidth').value);
    selectedTextElement.height = parseInt(document.getElementById('elemHeight').value);
    selectedTextElement.text = document.getElementById('elemText').value;
    selectedTextElement.font = document.getElementById('elemFont').value;
    selectedTextElement.fontSize = parseInt(document.getElementById('elemFontSize').value);
    selectedTextElement.color = document.getElementById('elemColor').value;
    selectedTextElement.bgColor = document.getElementById('elemBgColor').value;
    selectedTextElement.align = document.getElementById('elemAlign').value;
    selectedTextElement.verticalAlign = document.getElementById('elemVerticalAlign').value;
    selectedTextElement.fontStyle = document.getElementById('elemFontStyle').value;
    selectedTextElement.animationType = document.getElementById('elemAnimationType').value;
    selectedTextElement.animationSpeed = parseInt(document.getElementById('elemAnimationSpeed').value);

    redrawTextCanvas();
}

function deleteSelectedTextElement() {
    if (!selectedTextElement) return;

    textElements = textElements.filter(el => el.id !== selectedTextElement.id);
    selectedTextElement = null;
    document.querySelector('.element-properties').style.display = 'none';
    redrawTextCanvas();
}

function clearAllTextElements() {
    textElements = [];
    selectedTextElement = null;
    document.querySelector('.element-properties').style.display = 'none';
    redrawTextCanvas();
}


// Enhanced sendTextDesign with validation
// function sendTextDesign() {
//     if (!currentConnection.isConnected) {
//         showToast('Error', 'Please connect to a controller first', false);
//         return;
//     }

//     if (textElements.length === 0) {
//         showToast('Error', 'Please add at least one text element', false);
//         return;
//     }

//     // Validate text elements
//     const errors = [];
//     textElements.forEach((element, index) => {
//         if (!element.text || element.text.trim() === '') {
//             errors.push(`Text element ${index + 1} has no content`);
//         }
//     });

//     if (errors.length > 0) {
//         showToast('Validation Error', errors.join('<br>'), false);
//         return;
//     }

//     const commonData = {
//         ip: currentConnection.ip,
//         username: currentConnection.username,
//         password: currentConnection.password
//     };

//     const textAreas = textElements.map(element => ({
//         x: element.x,
//         y: element.y,
//         width: element.width,
//         height: element.height,
//         text: element.text,
//         font_name: element.font,
//         font_size: element.fontSize,
//         font_color: element.color,
//         bg_color: element.bgColor,
//         h_align: element.align.toUpperCase(),
//         v_align: element.verticalAlign.toUpperCase(),
//         font_style: element.fontStyle.toUpperCase(),
//         animation_type: parseInt(element.animationType),
//         animation_speed: parseInt(element.animationSpeed)
//     }));

//     const endpoint = textElements.length === 1 ? '/led/display_text' : '/led/display_multiple_text_areas';
//     const requestData = textElements.length === 1
//         ? {
//             ...commonData,
//             t_x: textAreas[0].x,
//             t_y: textAreas[0].y,
//             t_width: textAreas[0].width,
//             t_height: textAreas[0].height,
//             text: textAreas[0].text,
//             font_name: textAreas[0].font_name,
//             font_size: textAreas[0].font_size,
//             font_color: textAreas[0].font_color,
//             bg_color: textAreas[0].bg_color,
//             h_align: textAreas[0].h_align,
//             v_align: textAreas[0].v_align,
//             font_style: textAreas[0].font_style,
//             animation_type: textAreas[0].animation_type,
//             animation_speed: textAreas[0].animation_speed
//         }
//         : { ...commonData, 
//             text_areas: textAreas 
//         };

//     fetch(endpoint, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(requestData)
//     })
//     .then(response => {
//         if (!response.ok) {
//             return response.json().then(errData => {
//                 throw new Error(errData.output || 'Failed to display text');
//             });
//         }
//         return response.json();
//     })
//     .then(data => {
//         if (data.status === 'success') {
//             const message = textElements.length === 1
//                 ? 'Text displayed successfully!'
//                 : `${textElements.length} text areas displayed successfully!`;
//             showToast('Success', message);
//         } else {
//             throw new Error(data.output || 'Failed to display text');
//         }
//     })
//     .catch(error => {
//         showToast('Error', error.message, false);
//     });
// }
function sendTextDesign() {
    if (!currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

    if (textElements.length === 0) {
        showToast('Error', 'Please add at least one text element', false);
        return;
    }

    // Validate text elements
    const errors = [];
    textElements.forEach((element, index) => {
        if (!element.text || element.text.trim() === '') {
            errors.push(`Text element ${index + 1} has no content`);
        }
    });

    if (errors.length > 0) {
        showToast('Validation Error', errors.join('<br>'), false);
        return;
    }

    const commonData = {
        ip: currentConnection.ip,
        username: currentConnection.username,
        password: currentConnection.password
    };

    const textAreas = textElements.map(element => ({
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        text: element.text,
        font_name: element.font,
        font_size: element.fontSize,
        font_color: element.color,
        bg_color: element.bgColor,
        h_align: element.align.toUpperCase(),
        v_align: element.verticalAlign.toUpperCase(),
        font_style: element.fontStyle.toUpperCase(),
        animation_type: parseInt(element.animationType),
        animation_speed: parseInt(element.animationSpeed)
    }));

    const endpoint = textElements.length === 1 ? '/led/display_text' : '/led/display_multiple_text_areas';
    const requestData = textElements.length === 1
        ? {
            ...commonData,
            t_x: textAreas[0].x,
            t_y: textAreas[0].y,
            t_width: textAreas[0].width,
            t_height: textAreas[0].height,
            text: textAreas[0].text,
            font_name: textAreas[0].font_name,
            font_size: textAreas[0].font_size,
            font_color: textAreas[0].font_color,
            bg_color: textAreas[0].bg_color,
            h_align: textAreas[0].h_align,
            v_align: textAreas[0].v_align,
            font_style: textAreas[0].font_style,
            animation_type: textAreas[0].animation_type,
            animation_speed: textAreas[0].animation_speed
        }
        : { ...commonData, 
            text_areas: textAreas 
        };

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(errData => {
                throw new Error(errData.output || 'Failed to display text');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output);  // <-- show raw backend output
        } else {
            showToast('Display Text Failed', data.output || 'Failed to display text', false);
        }
    })
    .catch(error => {
        showToast('Error', error.message, false);
    });
}


function convertAlignmentValue(value) {
    // Convert near/far/center to NEAR/FAR/CENTER
    return value.toUpperCase();
}
function convertFontStyle(value) {
    // Convert normal/bold/italic to NORMAL/BOLD/ITALIC
    const styles = {
        'normal': 'NORMAL',
        'bold': 'BOLD',
        'italic': 'ITALIC',

    };
    return styles[value.toLowerCase()] || 'NORMAL';
}


let programDropdownOpen = false;

// Update the DOMContentLoaded event listener to initialize the programs dropdown
document.addEventListener('DOMContentLoaded', function () {
    // Initialize programs dropdown toggle
    document.getElementById('programs-nav-link').addEventListener('click', function(e) {
        // Don't toggle if clicking on the badge
        if (!e.target.classList.contains('badge')) {
            programDropdownOpen = !programDropdownOpen;
            updateProgramsDropdown();
        }
    });
});

// New function to update the programs dropdown
function updateProgramsDropdown() {
    const dropdown = document.getElementById('programs-dropdown');
    const badge = document.getElementById('program-count-badge');
    const chevron = document.getElementById('programs-chevron');
    
    // Get all program IDs
    const programIds = Object.keys(programTextElements);
    badge.textContent = programIds.length;
    
    // Update dropdown content
    if (programIds.length === 0) {
        dropdown.innerHTML = '<li class="nav-item"><span class="nav-link text-muted">No programs</span></li>';
    } else {
        let html = '';
        programIds.forEach(id => {
            const programData = programTextElements[id];
            const programNumber = id.split('-')[1];
            
            html += `
                <li class="nav-item">
                    <a class="nav-link" href="#programs" data-bs-toggle="tab" onclick="scrollToProgram('${id}')">
                        <i class="bi bi-collection-play me-1"></i>
                        Program ${programNumber}
                        <span class="badge bg-secondary float-end">${programData.elements.length}</span>
                    </a>
                </li>
            `;
        });
        dropdown.innerHTML = html;
    }
    
    // Toggle dropdown visibility
    if (programDropdownOpen && programIds.length > 0) {
        dropdown.classList.add('show');
    } else {
        dropdown.classList.remove('show');
    }
}
// New function to scroll to a specific program
function scrollToProgram(programId) {
    const programElement = document.getElementById(programId);
    if (programElement) {
        programElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Highlight the program briefly
        programElement.classList.add('highlight-program');
        setTimeout(() => {
            programElement.classList.remove('highlight-program');
        }, 1000);
    }
}





function clearScreen() {


    if (!currentConnection || !currentConnection.isConnected) {
        showToast('Error', 'Please connect to a controller first', false);
        return;
    }

   

    // Build query params
    const queryParams = new URLSearchParams({
        ip: currentConnection.ip,
        username: currentConnection.username,
        password: currentConnection.password
    });

    // Send fetch request
    fetch(`/led/clear_display?${queryParams}`, {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.output || 'Failed to clear display');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            showToast('Success', data.output || 'Display cleared successfully.');
        } else {
            showToast('Clear Failed', data.output || 'Failed to clear display.', false);
        }
    })
    .catch(error => {
        showToast('Error', 'Exception: ' + error.message, false);
    });
}

