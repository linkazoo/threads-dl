chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "download_media") {
    const { username, date, postId, mediaUrls } = message.data;

    mediaUrls.forEach((url, index) => {
      const mediaNumber = index + 1;
      let extension = "jpg";
      if (url.includes(".mp4") || url.includes("video")) extension = "mp4";
      if (url.includes(".webp")) extension = "webp";

      const filename = `${username}_${date}_${postId}_${mediaNumber}.${extension}`;

      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false
      });
    });
  }
});
