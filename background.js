chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "download_media") {
    const { username, date, postId } = message.data;
    // mediaUrls is retained for compatibility with older content-script builds.
    const mediaFiles = message.data.mediaFiles || (message.data.mediaUrls || []).map((url, index) => ({
      url,
      mediaNumber: index + 1,
      type: url.includes('.mp4') || url.includes('video') ? 'video' : 'image',
    }));

    mediaFiles.forEach(({ url, type, mediaNumber }) => {
      let extension = "jpg";
      if (type === 'video' || url.includes(".mp4") || url.includes("video")) extension = "mp4";
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
