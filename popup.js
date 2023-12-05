const form = document.getElementById('control-row');
const message = document.getElementById('message');
const changesList = document.getElementById('changes-list');
const cookiesList = document.getElementById('cookies');
const securityIssuesList = document.getElementById('security-issues');
const privacyScoreDisplay = document.getElementById('privacy-score');
const consentStatus = document.getElementById('consent-status')
const domainInput = document.getElementById('domain-input');
const fetchInfoButton = document.getElementById('fetch-info');
const filterInput = document.getElementById('filterInput');
const filterButton = document.getElementById('filterButton');


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

const allowValues = ["yes", "true", "allow"]
const denyValues = ["no", "false", "dismiss"]


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
            domainInput.value = url.hostname;
            displayNonConsentCookies(url.hostname);
        } catch (error) {
            console.error(`Error parsing URL: ${error}`);
            // ignore
        }
    } else {
        console.error('No active tab found');
    }

    domainInput.focus();
})();




// Add an event listener to the filter input for when the user enters text
filterButton.addEventListener('click', function () {
    const filterValue = filterInput.value.toLowerCase();
    const domain = domainInput.value; // Corrected: get the domain from the domainInput field
    displayNonConsentCookies(domain, filterValue); // Corrected: use a comma to separate arguments
});

document.getElementById('show-cookies').addEventListener('click', (event) => {
    event.preventDefault();
    displayNonConsentCookies(domainInput.value, filterInput.value);
});

document.getElementById('clear-cookies').addEventListener('click', async (event) => {
    event.preventDefault();
    const domain = domainInput.value;
    let msg = await deleteDomainCookies(domain);
    setMessage(msg);
    displayNonConsentCookies(domain, filterInput.value);
});


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
        'track': 'Tracking',
        'token': 'Authentication',
        'remember': 'Remember me',
        'gradescope_session': 'Gradescope session',
        'csrftoken': 'CSRF protection',
        'csrf': 'CSRF protection',
        'wordpress': 'WordPress authentication',
        'comment': 'Commenting',
        'consent': 'Consent management',
        'cookie': 'Cookie management',
        'privacy': 'Privacy settings',
        'cookielaw': 'Cookie consent',
        'cookietest': 'Cookie consent test',
        'cookie_notice': 'Cookie consent',
        'cookieconsent': 'Cookie consent',
        'cookie_consent': 'Cookie consent',
        'cookie-agree': 'Cookie consent',
        'cookie_decline': 'Cookie consent',
        'cookie-preferences': 'Cookie consent',
        'cookie_policy': 'Cookie consent',
        'cookiebanner': 'Cookie consent',
        'cookiecontrol': 'Cookie consent',
        'cookie_notice_accepted': 'Cookie consent',
        'cookiesDirective': 'Cookie consent',

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

function displayGeneralConsentCookies(consentCookies) {
    consentCookies.forEach(function (cookie, index) {
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

        checkbox.addEventListener('change', function () {
            let newCookieValue = "";
            var element = document.getElementById('test');
            if (!this.checked) {
                newCookieValue = turnOffMap[cookie.value];
            } else {
                newCookieValue = turnOnMap[cookie.value];
            }
            element.textContent = "Cookie value: " + cookie.value
                + " Mapping: " + turnOffMap[cookie.value]
                + " New value: " + newCookieValue;
            element.textContent = cookie.domain;
            chrome.cookies.set({
                name: cookie.name,
                value: newCookieValue,
                url: "http://" + cookie.domain + cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                expirationDate: cookie.expirationDate
            }, function(updatedCookie) {
                // element.textContent = "callback";
                // if (chrome.runtime.lastError) {
                //     element.textContent = chrome.runtime.lastError.message;
                // } else {
                //     element.textContent = "success";
                // }
            });;
        });

        listItem.appendChild(checkbox);
        listItem.appendChild(label);

        consentStatus.appendChild(listItem);
    });
}

function displayConsentCookies(cookies) {
    // Display general consent cookies
    const consentCookies = cookies.filter(cookie => 
        consentNames.some(consentName => cookie.name.includes(consentName)));
    displayGeneralConsentCookies(consentCookies);
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


async function displayNonConsentCookies(domain, filter) {
    try {
        const cookies = await chrome.cookies.getAll({
            domain
        });
        // displayConsentCookies(cookies);
        const nonConsentCookies = cookies.filter(cookie => !consentNames.some(consentName => cookie.name.includes(consentName)));
        let securityIssues = [];
        const privacyScore = calculatePrivacyScore(nonConsentCookies);
        const filteredCookies = filterCookies(nonConsentCookies, filter);
        privacyScoreDisplay.textContent = `Privacy Score: ${privacyScore}/100`;

        cookiesList.innerHTML = '';

        filteredCookies.forEach(cookie => {
            const cookieItem = document.createElement('li');
            cookieItem.innerHTML = generateCookieText(cookie);
            cookiesList.appendChild(cookieItem);
            // Create and append the delete button
            // let deleteButton = createDeleteButton(cookie);
            // cookieItem.appendChild(deleteButton);
        });
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


// Function to create a delete button for each cookie
// function createDeleteButton(cookie) {
//     let button = document.createElement('button');
//     button.textContent = 'Delete';
//     button.addEventListener('click', function () {
//         deleteCookie(cookie);
//     });
//     return button;
// }

// Function to delete a cookie
// function deleteCookie(cookie) {
//     const protocol = cookie.secure ? 'https:' : 'http:';
//     const cookieUrl = `${protocol}//${cookie.domain}${cookie.path}`;

//     chrome.cookies.remove({
//         url: cookieUrl,
//         name: cookie.name,
//         storeId: cookie.storeId
//     }, function () {
//         if (chrome.runtime.lastError) {
//             console.error(`Error deleting cookie: ${chrome.runtime.lastError}`);
//         } else {
//             console.log(`Cookie ${cookie.name} deleted`);
//             // Optional: remove the cookie from the displayed list
//         }
//     });
// }


function filterCookies(cookies, filter) {
    if (!filter) {
        return cookies; // If no filter is provided, return all cookies
    }
    // Split the filter input into field name and value
    const [fieldName, filterValue] = filter.split(':').map(part => part.trim());

    // Filter cookies based on field name and value
    return cookies.filter(cookie => {
        switch (fieldName.toLowerCase()) {
            case 'name':
                return cookie.name.toLowerCase().includes(filterValue.toLowerCase());
            case 'value':
                return cookie.value.toLowerCase().includes(filterValue.toLowerCase());
            case 'domain':
                return cookie.domain.toLowerCase().includes(filterValue.toLowerCase());
            case 'purpose':
                return getCookiePurpose(cookie.name).toLowerCase().includes(filterValue.toLowerCase());
            case 'interpreted value':
                return interpretCookieValue(cookie.value).toLowerCase().includes(filterValue.toLowerCase());
                // Add more cases for other fields if needed
                // Add more cases for other fields if needed
            default:
                return false; // Invalid field name
        }
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
    if (showName) text += `<strong>Name:</strong> ${cookie.name}<br> `;
    if (showValue) text += `<strong>Value:</strong> ${cookie.value}<br> `;
    if (showInterpretedValue) {
        const interpretedValue = interpretCookieValue(cookie.value);
        text += `<strong>Interpreted Value:</strong> ${interpretedValue}<br>`;
    }
    if (showPurpose) text += `<strong>Purpose:</strong> ${getCookiePurpose(cookie.name)}<br> `;
    if (showDomain) text += `<strong>Domain:</strong> ${cookie.domain}<br> `;
    // if (showPath) text += `Path: ${cookie.path}, `;


    // Trim any trailing comma and space
    return text.replace(/<br>, $/, '');
    // return text.replace(/, $/, '');

}


// Event listeners for checkboxes
document.querySelectorAll('#field-selectors input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // Refresh the cookies display when any checkbox changes
      const urlObject = stringToUrl(domainInput.value);
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

    let url = stringToUrl(domainInput.value);
    if (!url) {
        setMessage('Invalid URL');
        return;
    }

    let msg = await deleteDomainCookies(url.hostname);
    setMessage(msg);
    displayNonConsentCookies(url.hostname, filterInput.value);
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