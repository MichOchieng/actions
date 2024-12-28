// Listen for message from the popup
chrome.runtime.onMessage.addListener((req, _, sendResponse) => {
  // Response for getting the canonical URL
  if (req.type === "GET_CANONICAL_URL") {
    const canonicalLink = document.querySelector('link[rel="canonical"]');

    const canonicalUrl = canonicalLink
      ? canonicalLink.getAttribute("href")
      : null;

    sendResponse(canonicalUrl);
  }

  return true;
});
