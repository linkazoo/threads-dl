function formatYYMMDD(dateObj) {
  if (isNaN(dateObj)) return "unknown_date";
  const yy = String(dateObj.getFullYear()).slice(-2);
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function downloadPostMedia(clickedButton) {
  // 1. ANCHOR THE LOWEST BODY CONTAINER CELL (CLIMB EXACTLY 4 LEVELS)
  let lowestBodyBox = clickedButton;
  for (let i = 0; i < 4; i++) {
    if (lowestBodyBox && lowestBodyBox.parentElement) {
      lowestBodyBox = lowestBodyBox.parentElement;
    }
  }

  if (!lowestBodyBox) return;

  // 2. CHECK TIMESTAMPS AND ALLOCATE THE PRIMARY MEDIA BOX ONLY
  const localTimestamps = lowestBodyBox.querySelectorAll('time');
  let finalMediaContainer = null; // Enforce strict allocation initialization

  if (localTimestamps.length === 0) {
    // CASE A: Standard post (No internal timestamps inside the body box)
    finalMediaContainer = lowestBodyBox;
  } else {
    // CASE B: Quote post (Inner timestamp detected -> Scan Level 1 siblings)
    const siblingBoxes = Array.from(lowestBodyBox.children);
    for (let sibling of siblingBoxes) {
      const hasMedia = sibling.querySelector('img, video');
      const hasTime = sibling.querySelector('time');
      
      // The primary media box container holds assets but completely lacks time nodes
      if (hasMedia && !hasTime) {
        finalMediaContainer = sibling;
        break;
      }
    }
  }

  // 3. CLEAN FILE HARVESTING LOOP
  const mediaUrls = [];
  if (finalMediaContainer) {
    const targetImages = finalMediaContainer.querySelectorAll('img');
    targetImages.forEach(img => {
      const src = img.src;
      if (src && !src.includes('profile') && !src.includes('avatar') && !mediaUrls.includes(src)) {
        if (img.closest('div')?.querySelector('video')) return; // Filter out video thumbnails
        mediaUrls.push(src);
      }
    });

    const targetVideos = finalMediaContainer.querySelectorAll('video');
    targetVideos.forEach(video => {
      const src = video.src || video.querySelector('source')?.src;
      if (src && !mediaUrls.includes(src)) {
        mediaUrls.push(src);
      }
    });
  }

  // Stop pipeline silently if no primary media exists (e.g., text-only posts quoting someone else)
  if (mediaUrls.length === 0) return;

  // 4. ANCHOR POST CONTAINER CARD BOX CELLS (BODY BOX + 2 LEVELS)
  let lowestPostBox = lowestBodyBox;
  for (let i = 0; i < 2; i++) {
    if (lowestPostBox && lowestPostBox.parentElement) {
      lowestPostBox = lowestPostBox.parentElement;
    }
  }

  let username = "unknown_user";
  let postId = "unknown_id";
  let dateStr = "unknown_date";

  if (lowestPostBox) {
    // Target the primary row header containing the authentic timeline tracking parameters
    const headerTimeEl = lowestPostBox.querySelector('time');
    if (headerTimeEl) {
      const timeLinkEl = headerTimeEl.closest('a');
      if (timeLinkEl) {
        const hrefValue = timeLinkEl.getAttribute('href') || "";
        const pathParts = hrefValue.split('/');
        const postIndex = pathParts.indexOf("post");
        if (postIndex !== -1 && pathParts[postIndex + 1]) {
          username = pathParts[postIndex - 1].replace('@', '').replace(/[\\/:*?"<>|]/g, "");
          postId = pathParts[postIndex + 1].split('?')[0]; // Extract clean string
        }
      }
      const datetimeAttr = headerTimeEl.getAttribute('datetime');
      const dateObj = datetimeAttr ? new Date(datetimeAttr) : new Date(headerTimeEl.innerText);
      dateStr = formatYYMMDD(dateObj);
    }
  }

  chrome.runtime.sendMessage({
    action: "download_media",
    data: { username, date: dateStr, postId, mediaUrls }
  });
}

function injectButtons() {
  const shareSVGs = document.querySelectorAll('svg[aria-label="Share"]');

  shareSVGs.forEach(svg => {
    const shareButtonWrapper = svg.closest('div[role="button"]') || svg.closest('button');
    if (!shareButtonWrapper) return;

    const actionRow = shareButtonWrapper.parentElement;
    if (!actionRow || actionRow.querySelector('.threads-downloader-btn')) return;

    const computedIconColor = window.getComputedStyle(svg).color || 'currentColor';
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || 
                       window.getComputedStyle(document.body).backgroundColor !== 'rgb(255, 255, 255)';

    const hoverBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';

    const btn = document.createElement('button');
    btn.className = 'threads-downloader-btn';
    btn.title = 'Download Media'; 
    btn.style.cssText = `
      background: none !important; border: none !important; cursor: pointer !important; 
      margin-left: 4px !important; padding: 0 !important; display: inline-flex !important; 
      align-items: center !important; justify-content: center !important; user-select: none !important; 
      width: 36px !important; height: 36px !important; border-radius: 50% !important; color: ${computedIconColor} !important;
    `;
    
    btn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    `;

    btn.addEventListener('mouseenter', () => btn.style.backgroundColor = hoverBgColor);
    btn.addEventListener('mouseleave', () => btn.style.backgroundColor = 'transparent');
    btn.addEventListener('mousedown', () => btn.style.transform = 'scale(0.92)');
    btn.addEventListener('mouseup', () => btn.style.transform = 'scale(1)');
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      downloadPostMedia(btn); 
    }); 

    shareButtonWrapper.after(btn);
  });
}

const observer = new MutationObserver(() => injectButtons());
observer.observe(document.body, { childList: true, subtree: true });
injectButtons();
