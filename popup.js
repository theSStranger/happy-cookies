const form = document.getElementById('control-row');
const input = document.getElementById('input');
const message = document.getElementById('message');
const changesList = document.getElementById('changes-list');
const cookiesList = document.getElementById('cookies');


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
        // Optionally refresh the cookie list
        let domain = new URL(input.value).hostname;
        displayCookies(domain);
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

async function displayCookies(domain) {
    try {
        const cookies = await chrome.cookies.getAll({
            domain
        });
        cookiesList.innerHTML = '';
        cookies.forEach(cookie => {
            const listItem = document.createElement('li');
            const purpose = getCookiePurpose(cookie.name);
            const interpretedValue = interpretCookieValue(cookie.value);
            listItem.textContent = `Name: ${cookie.name}, Value: ${cookie.value}, TrueValue: ${interpretedValue} , Purpose: ${purpose}, Domain: ${cookie.domain}, Path: ${cookie.path}`;
            cookiesList.appendChild(listItem);
        });
    } catch (error) {
        setMessage(`Error fetching cookies: ${error.message}`);
    }
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
    try {
        return new URL(input);
    } catch {
        try {
            return new URL('http://' + input);
        } catch {
            return null;
        }
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

function setMessage(str) {
    message.textContent = str;
    message.hidden = false;
}

function clearMessage() {
    message.hidden = true;
    message.textContent = '';
}