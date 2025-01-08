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
});

// Get generator meta tag content - Check for Sitefinity
chrome.runtime.onMessage.addListener((req, _, sendResponse) => {
  if(req.type === "GET_GENERATOR") {
    const generatorMeta = document.querySelector('meta[name="Generator"]');

    const generator = generatorMeta
      ? generatorMeta.getAttribute("content")
      : null;

    if (generator && generator.includes("Sitefinity")) {
      sendResponse("Sitefinity");
    }
    else {
      sendResponse(generator);
    }
  }
});