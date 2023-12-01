// Description: This is the background script for the extension.
//              It runs in the background even when the popup is closed.
//              It is responsible for handling cookie operations.

//   try {
//     cookieStore.addEventListener('change', (event) => {
//       console.log('Cookie change event:', event);
//     });
  
//     const one_day = 24 * 60 * 60; 
//     chrome.cookies.set({
//       url: 'https://www.google.com',
//       name: "cookie1",
//       value: "cookie1-value",
//       expirationDate: (Date.now() / 1000) + one_day, 
//       // Ensure this domain is under your control or relevant
//     }).then(() => {
//       console.log("Cookie set successfully");
//     }).catch((error) => {
//       console.error("Error setting cookie:", error);
//     });
//   } catch (error) {
//     console.error("Error in cookie operations:", error);
//   }
  
//     // Listen for cookie changes
//   chrome.cookies.onChanged.addListener((changeInfo) => {
//     // Send message to popup if it's open
//     chrome.runtime.sendMessage({ type: "cookieChange", details: changeInfo });
//   });


let isPopupOpen = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.popupOpen !== undefined) {
    isPopupOpen = message.popupOpen;
  }
});

chrome.cookies.onChanged.addListener((changeInfo) => {
  if (isPopupOpen) {
    chrome.runtime.sendMessage({ type: "cookieChange", details: changeInfo });
  }
});
