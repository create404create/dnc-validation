// DNC Checker with API Integration
let isCheckingDNC = false;
let currentCheckIndex = 0;
let cleanCount = 0;
let dncCount = 0;

// DNC APIs (Replace with your actual API keys)
const DNC_APIS = {
    TCPA_V1: 'https://tcpa.api.uspeoplesearch.net/tcpa/v1?x=',
    PERSON_V3: 'https://person.api.uspeoplesearch.net/person/v3?x=',
    PREMIUM: 'https://premium_lookup-1-h4761841.deta.app/person?x=',
    TCPA_REPORT: 'https://tcpa.api.uspeoplesearch.net/tcpa/report?x='
};

// Start DNC Check
function startDNCCheck() {
    if (validationResults.length === 0) {
        alert('Please complete basic validation first');
        return;
    }
    
    if (isCheckingDNC) {
        alert('DNC check is already in progress');
        return;
    }
    
    // Reset counters
    isCheckingDNC = true;
    currentCheckIndex = 0;
    cleanCount = 0;
    dncCount = 0;
    
    // Show step 3
    showStep(3);
    
    // Start checking
    checkNextNumber();
}

// Check next number in queue
async function checkNextNumber() {
    if (!isCheckingDNC || currentCheckIndex >= validationResults.length) {
        finishDNCCheck();
        return;
    }
    
    const result = validationResults[currentCheckIndex];
    
    // Skip invalid numbers
    if (!result.isValid) {
        result.dncStatus = 'invalid';
        currentCheckIndex++;
        updateDNCProgress((currentCheckIndex / validationResults.length) * 100);
        setTimeout(checkNextNumber, 10);
        return;
    }
    
    // Update UI for current number
    updateCurrentNumberDisplay(result.cleaned);
    
    // Check DNC status
    result.dncStatus = 'checking';
    const dncResult = await checkDNCStatus(result.cleaned);
    
    // Update result
    if (dncResult.isDNC) {
        result.dncStatus = 'dnc';
        result.dncDetails = dncResult.details;
        dncCount++;
    } else {
        result.dncStatus = 'clean';
        cleanCount++;
    }
    
    // Update counters
    updateCounters();
    
    // Move to next number
    currentCheckIndex++;
    updateDNCProgress((currentCheckIndex / validationResults.length) * 100);
    
    // Add small delay to show progress (like slow checking)
    setTimeout(checkNextNumber, 100);
}

// Check DNC status using APIs
async function checkDNCStatus(phoneNumber) {
    try {
        // Try multiple APIs
        const results = await Promise.allSettled([
            checkTCPA(phoneNumber),
            checkPersonLookup(phoneNumber),
            checkPremiumLookup(phoneNumber)
        ]);
        
        // Check if any API returned DNC
        for (const result of results) {
            if (result.status === 'fulfilled' && result.value.isDNC) {
                return result.value;
            }
        }
        
        // If no DNC found
        return {
            isDNC: false,
            details: 'Clean - Not in any DNC list'
        };
        
    } catch (error) {
        console.error('DNC check error:', error);
        return {
            isDNC: false,
            details: 'Error checking DNC status'
        };
    }
}

// Check TCPA API
async function checkTCPA(phoneNumber) {
    try {
        const apiUrl = `${DNC_APIS.TCPA_V1}${phoneNumber}`;
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`TCPA API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse response (adjust based on actual API response format)
        if (data.is_dnc || data.dnc === true || data.tcpa === true) {
            return {
                isDNC: true,
                details: 'TCPA DNC List',
                source: 'TCPA_V1',
                data: data
            };
        }
        
        return {
            isDNC: false,
            details: 'Not in TCPA DNC',
            source: 'TCPA_V1'
        };
        
    } catch (error) {
        return {
            isDNC: false,
            details: 'TCPA API Error',
            error: error.message
        };
    }
}

// Check Person Lookup API
async function checkPersonLookup(phoneNumber) {
    try {
        const apiUrl = `${DNC_APIS.PERSON_V3}${phoneNumber}`;
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Person API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse response (adjust based on actual API response format)
        if (data.blacklist || data.litigator || data.national_dnc || data.state_dnc) {
            let details = [];
            if (data.national_dnc) details.push('National DNC');
            if (data.state_dnc) details.push('State DNC');
            if (data.blacklist) details.push('Blacklist');
            if (data.litigator) details.push('Litigator');
            
            return {
                isDNC: true,
                details: details.join(', '),
                source: 'PERSON_V3',
                data: data
            };
        }
        
        return {
            isDNC: false,
            details: 'Not in Person DNC',
            source: 'PERSON_V3'
        };
        
    } catch (error) {
        return {
            isDNC: false,
            details: 'Person API Error',
            error: error.message
        };
    }
}

// Check Premium Lookup API
async function checkPremiumLookup(phoneNumber) {
    try {
        const apiUrl = `${DNC_APIS.PREMIUM}${phoneNumber}`;
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Premium API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Parse response
        if (data.dnc_status && data.dnc_status !== 'clean') {
            return {
                isDNC: true,
                details: data.dnc_status,
                source: 'PREMIUM',
                data: data
            };
        }
        
        return {
            isDNC: false,
            details: 'Premium Check Clean',
            source: 'PREMIUM'
        };
        
    } catch (error) {
        return {
            isDNC: false,
            details: 'Premium API Error',
            error: error.message
        };
    }
}

// Update current number display
function updateCurrentNumberDisplay(number) {
    document.getElementById('currentNumber').textContent = number;
    document.getElementById('currentStatus').textContent = 'Checking DNC status...';
    document.getElementById('currentStatus').className = 'checking-status status-checking';
}

// Update counters
function updateCounters() {
    document.getElementById('dncCount').textContent = dncCount;
    document.getElementById('cleanCount').textContent = cleanCount;
    
    // Update file info
    document.getElementById('cleanFileInfo').textContent = `${cleanCount} clean numbers`;
    document.getElementById('dncFileInfo').textContent = `${dncCount} DNC numbers`;
}

// Finish DNC check
function finishDNCCheck() {
    isCheckingDNC = false;
    
    // Update UI
    document.getElementById('currentNumber').textContent = 'DNC Check Complete!';
    document.getElementById('currentStatus').textContent = `Found ${dncCount} DNC numbers and ${cleanCount} clean numbers`;
    document.getElementById('currentStatus').className = 'checking-status status-valid';
    
    // Show download section
    document.getElementById('downloadSection').classList.remove('d-none');
    
    // Enable download buttons
    if (cleanCount > 0) {
        document.querySelector('button[onclick="downloadCleanNumbers()"]').disabled = false;
    }
    if (dncCount > 0) {
        document.querySelector('button[onclick="downloadDNCNumbers()"]').disabled = false;
    }
}

// Cancel DNC check
function cancelDNCCheck() {
    isCheckingDNC = false;
    alert('DNC check cancelled');
}
