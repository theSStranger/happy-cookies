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


const consentNames = ["cookieconsent"];
const analyticsNames = ["Analytic", "analytic"];
const marketingNames = ["Market", "market", "Advertis", "advertis", "Target", "target"];
const personalizationNames = ["Personalization", "personalization", "Function", "function"];

let turnOffMap = {
    "yes": "no",
    "true": "false",
    "allow": "deny",
    "1": "0"
}
let turnOnMap = {
    "no": "yes",
    "false": "true",
    "deny": "allow",
    "0": "1"
}

const allowValues = ["yes", "true", "allow", "1"]
const denyValues = ["no", "false", "dismiss", "0"]


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
            displayConsentCookies(url.hostname);
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


function interpretCookieName(cookieName) {
    // Common cookie name patterns and their possible purposes
    // Some for github, some for google, 
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
        'guest_id': 'Twitter guest ID',
        '_fbp': 'Facebook Pixel tracking',
        'APISID': 'Google service functionality',
        'HSID': 'Google account security',
        'NID': 'Google preferences',
        'SID': 'Google session',
        'SSID': 'Google session',
        '1P_JAR': 'Google advertising',
        'lang': 'Language settings',
        'currency': 'Currency settings',
        'uuid': 'Unique user ID',
        'affiliate': 'Affiliate tracking',
        'utm_source': 'Marketing campaign source',
        'utm_medium': 'Marketing campaign medium',
        'utm_campaign': 'Marketing campaign name',
        'utm_term': 'Marketing campaign term',
        'utm_content': 'Marketing campaign content',
        'optimizely': 'A/B testing',
        'vuid': 'Vimeo analytics',
        'player': 'Video player settings',
        'recentlyViewed': 'Recently viewed items',
        'ab_test': 'A/B testing',
        '_cfuvid': 'Cloudflare bot management and security',
        '__cf_bm': 'Cloudflare bot management',
        '__cflb': 'Cloudflare load balancing',
        '_uasid': 'User analytics session ID',
        '_dd_s': 'Datadog security and performance monitoring',
        '_octo': 'GitHub user identification and analytics',
        'preferred_color_mode': 'User interface color preference',
        'tz': 'Time zone settings',
        '_device_id': 'Device identification for analytics and tracking',
        'saved_user_sessions': 'Stored user session information',
        'user_session': 'User session management',
        '__Host-user_session_same_site': 'Strict user session management for security',
        'color_mode': 'User interface color mode settings',
        'logged_in': 'User login status',
        'dotcom_user': 'GitHub user identification',
        'has_recent_activity': 'User activity tracking',
        '_github_classroom_session': 'GitHub Classroom session management',
        '_gh_sess': 'GitHub session management',
        'cf_clearance': 'Cloudflare security clearance',
        '__Secure-next-auth.callback-url': 'Secure callback URL for Next.js authentication',
        'OSID': 'Google account sign-in',
        '__Secure-OSID': 'Secure Google account sign-in',
        'S': 'General purpose identifier, often session-specific',
        'COMPASS': 'Google account navigation and preferences',
        'OTZ': 'Google Ads optimization and personalization',
        'm_ls': 'Facebook mobile login status',
        'sb': 'Facebook browser identification and authentication',
        'datr': 'Facebook security and fraud detection',
        'dpr': 'Facebook display settings, like screen resolution',
        'c_user': 'Facebook user ID',
        'wd': 'Facebook browser window dimensions',
        'xs': 'Facebook login authentication',
        'presence': 'Facebook chat and status presence',
        'fr': 'Facebook advertising and user tracking',
        'country_code': 'Geolocation-based country code',
        'geo_info': 'Geolocation information',
        'bdfpc': 'Bloomberg unique user tracking and personalization',
        '__stripe_mid': 'Stripe payment gateway unique session ID',
        '_sp_v1_ss': 'Snowplow analytics session tracking',
        '_sp_v1_p': 'Snowplow analytics user journey tracking',
        '_sp_v1_data': 'Snowplow analytics aggregated data storage',
        '_return-to': 'Return-to URL storage for user navigation',
        '_pxff_rf': 'Security and fraud prevention',
        'bbgconsentstring': 'Consent management',
        '_gcl_au': 'Google Adsense conversion tracking',
        'pxcts': 'Security and fraud prevention (likely related to PerimeterX)',
        '_pxvid': 'User identification for security (likely related to PerimeterX)',
        'ccpaUUID': 'Unique user ID for CCPA compliance',
        'consentUUID': 'Consent management for GDPR compliance',
        '_scid': 'Salesforce DMP tracking',
        '_ga': 'Google Analytics tracking',
        '_rdt_uuid': 'Reddit unique user ID',
        '_li_dcdm_c': 'LinkedIn cross-device matching',
        '_lc2_fpi': 'LiveChat identification',
        '_lc2_fpi_meta': 'Metadata for LiveChat identification',
        '_fbp': 'Facebook Pixel tracking',
        'afUserId': 'Appsflyer user ID',
        'AF_SYNC': 'Appsflyer synchronization',
        'optimizelyEndUserId': 'Optimizely user identification for A/B testing',
        'signedLspa': 'Legal Significance of the LSPA (likely for advertising)',
        '_sp_krux': 'Snowplow Krux data collection',
        '_sp_su': 'Snowplow session user tracking',
        '_user-token': 'User authentication token',
        '_user-id': 'User identification',
        '_breg-uid': 'Registration-specific user ID',
        '_breg-user': 'User settings for registered users',
        '_user-role': 'User role settings',
        'resolvedID': 'Resolved identification (purpose unclear)',
        'dnsDisplayed': 'DNS display settings (purpose unclear)',
        '_user-data': 'User data storage',
        '_gcl_aw': 'Google Ads conversion tracking (AdWords)',
        '_gcl_dc': 'Google Ads conversion tracking (DoubleClick)',
        '_parsely_session': 'Parse.ly session tracking',
        '_parsely_visitor': 'Parse.ly visitor tracking',
        '_sctr': 'Scorecard Research tracking',
        'opt-reg-modal-triggered': 'Opt-in registration modal trigger status',
        'country_code': 'Geolocation-based country code',
        'geo_info': 'Geolocation information',
        '_last-refresh': 'Timestamp of last refresh (context-specific)',
        'geo_info': 'Geolocation information',
        'bdfpc': 'Bloomberg unique user tracking and personalization',
        '_pxff_rf': 'Security and fraud prevention (likely related to PerimeterX)',
        '__gpi': 'Google Publisher Tags Identifier',
        '_clck': 'Click analytics and tracking',
        '_li_ss': 'LinkedIn session storage',
        '_uetsid': 'Microsoft Bing Ads tracking',
        '_uetvid': 'Microsoft Bing Ads visitor tracking',
        '_scid_r': 'Salesforce DMP tracking (repeated visit)',
        '_reg-csrf-token': 'Token for CSRF protection',
        'panoramaId_expiry': 'Panorama ID expiration (context-specific)',
        '_px3': 'Security and fraud prevention (likely related to PerimeterX)',
        '_px2': 'Security and fraud prevention (likely related to PerimeterX)',
        '_clsk': 'Clickstream tracking',
        '_li_ss_meta': 'Metadata for LinkedIn session storage',
        '_pxde': 'Security and fraud prevention (likely related to PerimeterX)',
        '_ga_GQ1PBLXZCT': 'Google Analytics tracking (customized setup)',
        
        // Add more patterns and purposes as needed


        // Add more patterns and purposes as needed


        // Add more patterns and purposes as needed


        // Add more patterns and purposes as needed

        // Add more patterns and purposes as needed
    };

    // Check if the cookie name matches any known patterns
    for (let pattern in purposes) {
        if (cookieName.toLowerCase().includes(pattern)) {
            return purposes[pattern];
        }
    }

    return 'Unkown Name'; // Default message if no pattern matches
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

function displayConsentCookiesPerCategory(category, cookies) {
    cookies.forEach(function (cookie, index) {
        const listItem = document.createElement('li');
        listItem.textContent = category + ` status:`;

        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'toggle-switch-' + category + '-' + index;
        checkbox.className = 'toggle-switch-checkbox';
        var label = document.createElement('label');
        label.htmlFor = 'toggle-switch-' + category + '-' + index;
        label.className = 'toggle-switch-label';

        if (allowValues.includes(cookie.value)) {
            checkbox.checked = true;
        } else if (denyValues.includes(cookie.value)) {
            checkbox.checked = false;
        } else {
            listItem.textContent = category + ` status: Unknown`
        }

        checkbox.addEventListener('change', function () {
            let newCookieValue = "";
            if (!this.checked) {
                newCookieValue = turnOffMap[cookie.value];
            } else {
                newCookieValue = turnOnMap[cookie.value];
            }
            chrome.cookies.set({
                name: cookie.name,
                value: newCookieValue,
                url: "http://" + cookie.domain + cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                expirationDate: cookie.expirationDate
            }, function (updatedCookie) {
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

async function displayConsentCookies(domain, filter) {
    // Display general consent cookies
    const cookies = await chrome.cookies.getAll({
        domain
    });
    const filteredCookies = filterCookies(cookies, filter);
    const consentCookies = filteredCookies.filter(cookie =>
        consentNames.some(consentName => cookie.name.includes(consentName)));
    displayConsentCookiesPerCategory('Essential', consentCookies);

    const marketingCookies = filteredCookies.filter(cookie =>
        marketingNames.some(marketingName => cookie.name.includes(marketingName)));
    displayConsentCookiesPerCategory('Marketing', marketingCookies);

    const personalizationCookies = filteredCookies.filter(cookie =>
        personalizationNames.some(personalizationName => cookie.name.includes(personalizationName)));
    displayConsentCookiesPerCategory('Personalization', personalizationCookies);

    const analyticsCookies = filteredCookies.filter(cookie =>
        analyticsNames.some(analyticsName => cookie.name.includes(analyticsName)));
    displayConsentCookiesPerCategory('Analytical', analyticsCookies);
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

            // Create and append the delete button
            let deleteButton = createDeleteButton(cookie);
            cookieItem.appendChild(deleteButton);

            cookiesList.appendChild(cookieItem);

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


function createDeleteButton(cookie) {
    let button = document.createElement('button');
    button.textContent = 'Delete';
    button.className = 'delete-button'; // Add this line
    button.addEventListener('click', function () {
        deleteIndividualCookie(cookie);
    });
    return button;
}

function deleteIndividualCookie(cookie) {
    const protocol = cookie.secure ? 'https:' : 'http:';
    const cookieUrl = `${protocol}//${cookie.domain}${cookie.path}`;

    chrome.cookies.remove({
        url: cookieUrl,
        name: cookie.name,
        storeId: cookie.storeId
    }, function () {
        if (chrome.runtime.lastError) {
            console.error(`Error deleting cookie: ${chrome.runtime.lastError}`);
        } else {
            console.log(`Cookie ${cookie.name} deleted`);
            // Optional: Refresh the cookies list to reflect the deletion
            displayNonConsentCookies(domainInput.value, filterInput.value);
        }
    });
}


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
            case 'interpreted name':
                return interpretCookieName(cookie.name).toLowerCase().includes(filterValue.toLowerCase());
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
    const showInterpretedName = document.getElementById('show-interpreted-name').checked;
    const showDomain = document.getElementById('show-domain').checked;
    // const showPath = document.getElementById('show-path').checked;

    // Exploration with value interpretation prediction using LLM
    // getCookieValuePrediction(cookie.name, cookie.value)
    //     .then(prediction => {
    //         const predictionElement = document.createElement('div');
    //         predictionElement.textContent = `Prediction: ${prediction}`;
    //         cookieItem.appendChild(predictionElement);
    //     })
    //     .catch(error => console.error('Prediction error:', error));

    let text = '';
    if (showName) text += `<strong>Name:</strong> ${cookie.name}<br> `;
    if (showInterpretedName) {
        const interpretedName = interpretCookieName(cookie.name);
        text += `<strong>Interpreted Name:</strong> ${interpretedName}<br> `;
    }
    if (showValue) text += `<strong>Value:</strong> ${cookie.value}<br> `;
    if (showInterpretedValue) {
        const interpretedValue = interpretCookieValue(cookie.value);
        text += `<strong>Interpreted Value:</strong> ${interpretedValue}<br>`;
    }

    if (showDomain) text += `<strong>Domain:</strong> ${cookie.domain}<br> `;
    // if (showPath) text += `Path: ${cookie.path}, `;


    // Trim any trailing comma and space
    return text.replace(/<br>, $/, '');
    // return text.replace(/, $/, '');

}

// Experimenting with value interpretation prediction using LLM
// async function getCookieValuePrediction(cookieName, cookieValue) {
//     const apiUrl = 'https://example-llm-api.com/predict'; // Replace with the actual LLM API URL
//     const apiKey = 'YOUR_API_KEY'; // Replace with your API key

//     try {
//         const response = await fetch(apiUrl, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${apiKey}`
//             },
//             body: JSON.stringify({
//                 prompt: `make a prediction on what the possible interpretation of the 
//                 value field of this cookie is by using only a few words:
//                 Name: ${cookieName}, Value: ${cookieValue}.
//                 Only provide with the final prediction.`,
//                 maxTokens: 50 // Adjust based on the LLM's capabilities
//             })
//         });

//         const data = await response.json();
//         return data.prediction; // Adjust based on the LLM's response structure
//     } catch (error) {
//         console.error('Error fetching prediction:', error);
//         return 'Prediction unavailable';
//     }
// }



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