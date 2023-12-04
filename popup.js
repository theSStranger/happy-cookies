const form = document.getElementById('control-row');
const input = document.getElementById('input');
const message = document.getElementById('message');
const changesList = document.getElementById('changes-list');
const cookiesList = document.getElementById('cookies');
const securityIssuesList = document.getElementById('security-issues');
const privacyScoreDisplay = document.getElementById('privacy-score');
const consentStatus = document.getElementById('consent-status')

const consentNames = ["cookieconsent_status", "cookieconsent_dismissed"]

let turnOffMap = {
    "yes": "no",
    "true": "false",
    "allow": "deny"
}
let turnOnMap = {
    "no": "yes",
    "false": "true",
    "deny": "allow"
}


// When the popup opens
chrome.runtime.sendMessage({
    popupOpen: true
});


(async function initPopupWindow() {
    let [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    if (tab && tab.url) {
        try {
            let url = new URL(tab.url);
            input.value = url.hostname;
            displayCookies(url.hostname);
        } catch {
            // ignore
        }
    }

    input.focus();
})();

function getCookiePurpose(cookieName) {
    // Common cookie name patterns and their possible purposes
    const purposes = {
        'session': 'Session management',
        'login': 'User login',
        'user': 'User settings',
        '_ga': 'Google Analytics tracking',
        '_gid': 'Google Analytics tracking',
        'pref': 'Preferences',
        'cart': 'Shopping cart',
        'ads': 'Advertising',
        'track': 'Tracking'
        // Add more patterns and purposes as needed
    };

    // Check if the cookie name matches any known patterns
    for (let pattern in purposes) {
        if (cookieName.toLowerCase().includes(pattern)) {
            return purposes[pattern];
        }
    }

    return 'Unknown purpose'; // Default message if no pattern matches
}


// When the popup window is unloaded (closed)
window.addEventListener('unload', function (event) {
    chrome.runtime.sendMessage({
        popupOpen: false
    });
});

form.addEventListener('submit', handleFormSubmit);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "cookieChange") {
        displayCookieChange(message.details);
    }
});

const MAX_CHANGES_DISPLAYED = 5;
let showAllChanges = false;
const toggleChangesButton = document.getElementById('toggleChanges');

// Event listener for the toggle button
toggleChangesButton.addEventListener('click', () => {
    showAllChanges = !showAllChanges;
    toggleChangesButton.textContent = showAllChanges ? 'Show Less' : 'Show All Cookie Changes';
    updateChangesList();
});

function displayConsentCookies(cookies) {
    const allowValues = ["yes", "true", "allow"]
    const denyValues = ["no", "false", "dismiss"]
    const consentCookies = cookies.filter(cookie => 
        consentNames.some(consentName => cookie.name.includes(consentName)));
    consentCookies.forEach(function(cookie,index) {
        const listItem = document.createElement('li');
        listItem.textContent = `Consent status:`

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'toggle-switch-' + index;
        checkbox.className = 'toggle-switch-checkbox';
        var label = document.createElement('label');
        label.htmlFor = 'toggle-switch-' + index;
        label.className = 'toggle-switch-label';

        if (allowValues.includes(cookie.value)) {
            checkbox.checked = true;
        } else if (denyValues.includes(cookie.value)) {
            checkbox.checked = false;
        } else {
            listItem.textContent = `Consent status: Unknown`
        }

        checkbox.addEventListener('change', function() {
            let newCookieValue = "";
            // var element = document.getElementById('test');
            if (!this.checked) {
                newCookieValue = turnOffMap[cookie.value];
            } else {
                newCookieValue = turnOnMap[cookie.value];
            }
            // element.textContent = "Cookie value: " + cookie.value
            //     + " Mapping: " + turnOffMap[cookie.value]
            //     + " New value: " + newCookieValue;
            // element.textContent = cookie.domain;
            chrome.cookies.set({
                url: cookie.url,
                name: cookie.name,
                value: newCookieValue,
                domain: cookie.domain,
                url: "http://" + cookie.domain.slice(1) + cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                expirationDate: cookie.expirationDate
            }, function(updatedCookie) {
                element.textContent = "callback";
                if (chrome.runtime.lastError) {
                    element.textContent = chrome.runtime.lastError.message;
                } else {
                    element.textContent = "success";
                }
            });;
        });

        listItem.appendChild(checkbox)
        listItem.appendChild(label)

        consentStatus.appendChild(listItem);
    });
}

// interpretCookieValue() decodes and parses cookie values
function interpretCookieValue(value) {
    try {
        // Attempt URL decoding
        let decodedValue = decodeURIComponent(value);

        // Attempt Base64 decoding
        decodedValue = atob(decodedValue);

        // Attempt to parse as JSON
        let parsedValue = JSON.parse(decodedValue);
        return JSON.stringify(parsedValue, null, 2); // Beautify JSON
    } catch (e) {
        return value; // Return original value if decoding/parsing fails
    }
}

function calculatePrivacyScore(cookies) {
    let score = 100;
    const totalCookies = cookies.length;
    if (totalCookies === 0) return score;

    cookies.forEach(cookie => {
        if (!cookie.secure) score -= 10;
        if (!cookie.httpOnly) score -= 10;
        if (!cookie.sameSite || cookie.sameSite === 'none') score -= 5;
    });

    return Math.max(score, 0); // Ensure score does not go below 0
}


async function displayCookies(domain) {
    try {
        const cookies = await chrome.cookies.getAll({
            domain
        });
        displayConsentCookies(cookies);
        displayNonConsentCookies(cookies);
        let securityIssues = [];
        cookies.forEach(cookie => {
            const issues = analyzeCookieSecurity(cookie);
            if (issues.length > 0) {
                securityIssues.push(`Cookie ${cookie.name} has the following issues: ${issues.join(', ')}`);
            }
        })
        displaySecurityIssues(securityIssues);
    } catch (error) {
        setMessage(`Error fetching cookies: ${error.message}`);
    }
}

async function displayNonConsentCookies(domain) {
    const cookies = await chrome.cookies.getAll({
        domain
    });
    const nonConsentCookies = cookies.filter(cookie => !consentNames.some(consentName => cookie.name.includes(consentName)));
    cookiesList.innerHTML = '';
    const privacyScore = calculatePrivacyScore(nonConsentCookies);
    privacyScoreDisplay.textContent = `Privacy Score: ${privacyScore}/100`;
    nonConsentCookies.forEach(cookie => {
        const listItem = document.createElement('li');
        listItem.textContent = generateCookieText(cookie);
        cookiesList.appendChild(listItem);
    });
}

function generateCookieText(cookie) {
    // ... existing checkbox checks ...
    const showName = document.getElementById('show-name').checked;
    const showValue = document.getElementById('show-value').checked;
    const showInterpretedValue = document.getElementById('show-interpreted-value').checked;
    const showPurpose = document.getElementById('show-purpose').checked;
    const showDomain = document.getElementById('show-domain').checked;
    // const showPath = document.getElementById('show-path').checked;
    
  
    let text = '';
    if (showName) text += `Name: ${cookie.name}, `;
    if (showValue) text += `Value: ${cookie.value}, `;
    if (showInterpretedValue) {
      const interpretedValue = interpretCookieValue(cookie.value);
      text += `Interpreted Value: ${interpretedValue}, `;
    }
    if (showPurpose) text += `Purpose: ${getCookiePurpose(cookie.name)}, `;
    if (showDomain) text += `Domain: ${cookie.domain}, `;
    // if (showPath) text += `Path: ${cookie.path}, `;
  
    // Trim any trailing comma and space
    return text.replace(/, $/, '');
  }


// Event listeners for checkboxes
document.querySelectorAll('#field-selectors input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // Refresh the cookies display when any checkbox changes
      const urlObject = stringToUrl(input.value);
      if (urlObject) {
        displayNonConsentCookies(urlObject.hostname);
      }
    });
  });

function analyzeCookieSecurity(cookie) {
    let issues = [];

    if (!cookie.secure) {
        issues.push('Not Secure (missing Secure flag)');
    }
    if (!cookie.httpOnly) {
        issues.push('Accessible to JavaScript (missing HttpOnly flag)');
    }
    if (!cookie.sameSite || cookie.sameSite === 'none') {
        issues.push('Not SameSite or SameSite=None (potential CSRF risk)');
    }

    return issues;
}

function displaySecurityIssues(issues) {
    securityIssuesList.innerHTML = '';
    if (issues.length === 0) {
        securityIssuesList.innerHTML = '<li>No security issues detected</li>';
        return;
    }

    issues.forEach(issue => {
        const listItem = document.createElement('li');
        listItem.textContent = issue;
        securityIssuesList.appendChild(listItem);
    });
}


function displayCookieChange(changeDetails) {
    const listItem = document.createElement('li');
    listItem.textContent = `Cookie ${changeDetails.cookie.name} changed: ${changeDetails.cause}`;
    changesList.prepend(listItem); // Add the new change at the top of the list
    updateChangesList();
}

function updateChangesList() {
    const items = changesList.getElementsByTagName('li');
    for (let i = 0; i < items.length; i++) {
        if (!showAllChanges && i >= MAX_CHANGES_DISPLAYED) {
            items[i].style.display = 'none';
        } else {
            items[i].style.display = '';
        }
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    clearMessage();

    let url = stringToUrl(input.value);
    if (!url) {
        setMessage('Invalid URL');
        return;
    }

    let msg = await deleteDomainCookies(url.hostname);
    setMessage(msg);
    displayCookies(url.hostname);
}

function stringToUrl(input) {
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
        input = 'http://' + input; // Assume http if no protocol is specified
    }
    try {
        return new URL(input);
    } catch (error) {
        console.error("Invalid URL", error);
        return null;
    }
}

async function deleteDomainCookies(domain) {
    let cookiesDeleted = 0;
    try {
        const cookies = await chrome.cookies.getAll({
            domain
        });
        if (cookies.length === 0) {
            return 'No cookies found';
        }

        let pending = cookies.map(deleteCookie);
        await Promise.all(pending);
        cookiesDeleted = pending.length;
    } catch (error) {
        return `Unexpected error: ${error.message}`;
    }

    return `Deleted ${cookiesDeleted} cookie(s).`;
}

function deleteCookie(cookie) {
    const protocol = cookie.secure ? 'https:' : 'http:';
    const cookieUrl = `${protocol}//${cookie.domain}${cookie.path}`;

    return chrome.cookies.remove({
        url: cookieUrl,
        name: cookie.name,
        storeId: cookie.storeId
    });
}

// export cookies functionality
// const exportButton = document.getElementById('export-cookies');

// async function exportCookies(domain) {
//   try {
//     const cookies = await chrome.cookies.getAll({ domain });
//     const cookieData = cookies.map(cookie => {
//       return {
//         name: cookie.name,
//         value: cookie.value,
//         domain: cookie.domain,
//         path: cookie.path,
//         expires: cookie.expirationDate,
//         secure: cookie.secure,
//         httpOnly: cookie.httpOnly,
//         sameSite: cookie.sameSite
//       };
//     });

//     const blob = new Blob([JSON.stringify(cookieData, null, 2)], { type: 'application/json' });
//     const url = URL.createObjectURL(blob);
//     chrome.downloads.download({
//       url: url,
//       filename: `cookies-${domain}.json`
//     });
//   } catch (error) {
//     setMessage(`Error exporting cookies: ${error.message}`);
//   }
// }

// exportButton.addEventListener('click', () => {
//     const urlObject = stringToUrl(input.value);
//     if (urlObject) {
//       exportCookies(urlObject.hostname);
//     } else {
//       setMessage('Invalid URL for exporting cookies');
//     }
// });


function setMessage(str) {
    message.textContent = str;
    message.hidden = false;
}

function clearMessage() {
    message.hidden = true;
    message.textContent = '';
}