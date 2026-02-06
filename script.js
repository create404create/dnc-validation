// Main Validation Script
let fileContent = null;
let phoneNumbers = [];
let validationResults = [];
let currentStep = 1;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupDragAndDrop();
    setupFileInput();
});

// Drag and Drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// File Input
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });
}

// Handle File
function handleFile(file) {
    if (!file.name.endsWith('.txt')) {
        alert('Please select a .txt file');
        return;
    }
    
    // Update file info
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').classList.remove('d-none');
    
    // Enable validate button
    document.getElementById('validateBtn').disabled = false;
    
    // Read file
    const reader = new FileReader();
    reader.onload = function(e) {
        fileContent = e.target.result;
    };
    reader.readAsText(file);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Start Basic Validation
function startBasicValidation() {
    if (!fileContent) {
        alert('Please select a file first');
        return;
    }
    
    // Reset results
    validationResults = [];
    phoneNumbers = [];
    
    // Parse file content
    const lines = fileContent.split('\n');
    let totalNumbers = 0;
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const cleaned = cleanPhoneNumber(line);
            const isValid = isValidUSNumber(cleaned);
            const areaCode = cleaned.substring(0, 3);
            const state = getStateFromAreaCode(areaCode);
            
            const result = {
                original: line,
                cleaned: cleaned,
                areaCode: areaCode,
                state: state,
                isValid: isValid,
                dncStatus: 'pending', // pending, checking, clean, dnc
                dncDetails: null
            };
            
            validationResults.push(result);
            phoneNumbers.push(result);
            totalNumbers++;
        }
    }
    
    // Update UI
    updateValidationProgress(100);
    document.getElementById('totalCount').textContent = totalNumbers;
    
    // Count valid numbers
    const validCount = validationResults.filter(r => r.isValid).length;
    document.getElementById('validCount').textContent = validCount;
    
    // Move to step 2
    showStep(2);
}

// Clean phone number
function cleanPhoneNumber(number) {
    // Remove all non-digit characters
    let cleaned = number.replace(/\D/g, '');
    
    // Remove US country code if present
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = cleaned.substring(1);
    }
    
    // If still longer than 10 digits, take last 10
    if (cleaned.length > 10) {
        cleaned = cleaned.substring(cleaned.length - 10);
    }
    
    return cleaned;
}

// Validate US phone number
function isValidUSNumber(number) {
    // Must be exactly 10 digits
    if (number.length !== 10) return false;
    
    // First digit cannot be 0 or 1
    if (number[0] === '0' || number[0] === '1') return false;
    
    // Area code validation
    const areaCode = number.substring(0, 3);
    if (!isValidAreaCode(areaCode)) return false;
    
    // Exchange code validation
    const exchangeCode = number.substring(3, 6);
    if (exchangeCode[0] === '0' || exchangeCode[0] === '1') return false;
    
    return true;
}

// Update validation progress
function updateValidationProgress(percent) {
    const progressBar = document.getElementById('validationProgress');
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
}

// Update DNC progress
function updateDNCProgress(percent) {
    const progressBar = document.getElementById('dncProgress');
    progressBar.style.width = percent + '%';
    progressBar.textContent = percent + '%';
}

// Show specific step
function showStep(stepNumber) {
    // Hide all steps
    document.getElementById('step1').classList.add('d-none');
    document.getElementById('step2').classList.add('d-none');
    document.getElementById('step3').classList.add('d-none');
    
    // Show current step
    document.getElementById('step' + stepNumber).classList.remove('d-none');
    
    // Show results section in step 3
    if (stepNumber === 3) {
        document.getElementById('resultsSummary').classList.remove('d-none');
        document.getElementById('liveCheckDisplay').classList.remove('d-none');
    }
}

// Download clean numbers
function downloadCleanNumbers() {
    const cleanNumbers = validationResults.filter(r => r.dncStatus === 'clean');
    const content = cleanNumbers.map(n => n.cleaned).join('\n');
    downloadFile('clean-numbers.txt', content);
}

// Download DNC numbers
function downloadDNCNumbers() {
    const dncNumbers = validationResults.filter(r => r.dncStatus === 'dnc');
    const content = dncNumbers.map(n => `${n.cleaned}|${n.dncDetails}`).join('\n');
    downloadFile('dnc-numbers.txt', content);
}

// Download all as ZIP
async function downloadAllAsZip() {
    const zip = new JSZip();
    
    // Clean numbers
    const cleanNumbers = validationResults.filter(r => r.dncStatus === 'clean');
    const cleanContent = cleanNumbers.map(n => n.cleaned).join('\n');
    zip.file("clean-numbers.txt", cleanContent);
    
    // DNC numbers
    const dncNumbers = validationResults.filter(r => r.dncStatus === 'dnc');
    const dncContent = dncNumbers.map(n => `${n.cleaned}|${n.dncDetails}`).join('\n');
    zip.file("dnc-numbers.txt", dncContent);
    
    // Summary report
    const summary = generateSummaryReport();
    zip.file("summary.txt", summary);
    
    // Generate and download
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "phone-results.zip");
}

// Generate summary report
function generateSummaryReport() {
    let report = "PHONE NUMBER PROCESSING REPORT\n";
    report += "===============================\n";
    report += `Date: ${new Date().toLocaleString()}\n\n`;
    
    const total = validationResults.length;
    const valid = validationResults.filter(r => r.isValid).length;
    const dnc = validationResults.filter(r => r.dncStatus === 'dnc').length;
    const clean = validationResults.filter(r => r.dncStatus === 'clean').length;
    
    report += `Total Numbers: ${total}\n`;
    report += `Valid Numbers: ${valid}\n`;
    report += `DNC Numbers: ${dnc}\n`;
    report += `Clean Numbers: ${clean}\n\n`;
    
    return report;
}

// Download helper
function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Get state from area code (from states-data.js)
function getStateFromAreaCode(areaCode) {
    // This function should be imported from states-data.js
    // For now, using a simplified version
    for (const [state, codes] of Object.entries(USA_STATES_AREA_CODES)) {
        if (codes.includes(areaCode)) {
            return state;
        }
    }
    return "Unknown";
}

// Check if area code is valid (from states-data.js)
function isValidAreaCode(areaCode) {
    // This function should be imported from states-data.js
    return ALL_AREA_CODES.has(areaCode);
}
