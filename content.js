const POST_PERMALINK_SELECTOR = 'a[href*="/post/"]';
const DOWNLOAD_BUTTON_CLASS = 'threads-downloader-btn';
const ITEM_DOWNLOAD_BUTTON_CLASS = 'threads-downloader-item-btn';
const MEDIA_MINIMUM_SIZE = 80;
const PENDING_LAZY_VIDEO_KEY = 'threads-downloader-pending-lazy-video';
let extensionContextInvalid = false;

function hasExtensionContext() {
  if (extensionContextInvalid) return false;
  try {
    if (!chrome.runtime?.id) {
      extensionContextInvalid = true;
      return false;
    }
    return true;
  } catch {
    extensionContextInvalid = true;
    return false;
  }
}

function sendRuntimeMessage(message) {
  if (!hasExtensionContext()) return false;
  try {
    chrome.runtime.sendMessage(message);
    return true;
  } catch {
    // An unpacked extension was reloaded while this old content script was
    // still attached to the page. The refreshed script will take over.
    extensionContextInvalid = true;
    return false;
  }
}

function silenceInvalidatedContext(event) {
  const message = event?.error?.message || event?.reason?.message || event?.message || '';
  if (!/Extension context invalidated/i.test(message)) return;
  extensionContextInvalid = true;
  event.preventDefault?.();
}

window.addEventListener('error', silenceInvalidatedContext, true);
window.addEventListener('unhandledrejection', silenceInvalidatedContext);

function formatYYMMDD(dateObj) {
  if (Number.isNaN(dateObj.getTime())) return 'unknown_date';
  const yy = String(dateObj.getFullYear()).slice(-2);
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function isPostPermalink(link) {
  return /^\/@[^/]+\/post\/[^/?#]+/.test(link?.getAttribute('href') || '');
}

function isPostComposer() {
  if (window.location.pathname.startsWith('/intent/post')) return true;
  // Threads may open its composer at another route (for example from the
  // activity page). A writable editor plus media Remove controls identifies
  // that draft UI without relying on generated class names.
  return Boolean(
    document.querySelector('[contenteditable="true"]') &&
    document.querySelector('[aria-label="Remove"], [title="Remove"]')
  );
}

function getCurrentPostPath() {
  const match = window.location.pathname.match(/^\/@[^/]+\/post\/[^/?#]+/);
  return match?.[0] || '';
}

function getPostPermalinks(element) {
  if (!element) return [];
  const links = element.matches?.(POST_PERMALINK_SELECTOR) ? [element] :
    [...(element.querySelectorAll?.(POST_PERMALINK_SELECTOR) || [])];
  return links.filter(isPostPermalink);
}

function getPostPermalink(element) {
  const links = getPostPermalinks(element);
  const currentPostPath = getCurrentPostPath();
  return links.find(link => new URL(link.href).pathname === currentPostPath) || links[0] || null;
}

function getActionCount(element) {
  return [...element.querySelectorAll('[role="button"], button')]
    .filter(button => ['Like', 'Comment', 'Repost', 'Share'].some(label => button.querySelector(`svg[aria-label="${label}"]`))).length;
}

function getActionLabels(element) {
  return ['Like', 'Comment', 'Repost', 'Share']
    .filter(label => element.querySelector(`svg[aria-label="${label}"]`));
}

function getDirectActionItems(row) {
  return [...row.children].filter(child => getActionLabels(child).length === 1);
}

function getPostPermalinkCount(element) {
  return new Set(getPostPermalinks(element)
    .map(link => link.getAttribute('href'))).size;
}

// Finds the smallest card containing one post permalink and its response controls.
// This intentionally avoids Threads' generated class names and fixed parent depths.
function findPostRoot(element) {
  let node = element;
  let fallback = null;
  let currentPostFallback = null;
  let responseRowFallback = null;
  const currentPostPath = getCurrentPostPath();
  while (node && node !== document.body) {
    const permalinkCount = getPostPermalinkCount(node);
    const containsCurrentPost = currentPostPath && getPostPermalinks(node)
      .some(link => new URL(link.href).pathname === currentPostPath);
    // A standalone post can contain a quoted post, so its smallest usable
    // card has more than one permalink. Prefer the current post's own link
    // over the quote's link when locating that response row.
    if (containsCurrentPost) {
      currentPostFallback ||= node;
      const actionCount = getActionCount(node);
      // Once related posts load below the focused post, Threads can wrap the
      // whole page in a container with many response rows. That is not a post
      // card, even though it includes the current post's permalink.
      if (actionCount >= 2 && actionCount <= 4) return node;
    }
    // Some Instagram-shared posts in standalone view render a plain <time>
    // rather than a linked post timestamp. Their native response row remains
    // stable, so use the nearest such row only when there are no post links.
    if (permalinkCount === 0 && getActionCount(node) >= 2 && node.querySelector('img[src*="cdninstagram"], video')) {
      responseRowFallback ||= node;
    }
    if (permalinkCount === 1) {
      fallback ||= node;
      if (getActionCount(node) >= 2) return node;
    }
    node = node.parentElement;
  }
  // A post card often has no permalink in the same sub-tree as its response
  // row. Prefer that compact card over a page-level container that happens to
  // contain the focused post link and several related posts.
  return responseRowFallback || currentPostFallback || fallback;
}

function getPostMetadata(postRoot) {
  const timeLink = getPostPermalink(postRoot);
  const href = timeLink?.getAttribute('href') || window.location.pathname;
  const match = href.match(/^\/@([^/]+)\/post\/([^/?#]+)/);
  const time = timeLink?.querySelector('time') || postRoot.querySelector('time');
  const date = time?.getAttribute('datetime') ? new Date(time.getAttribute('datetime')) : new Date();
  const instagramIdentity = [...postRoot.querySelectorAll('[role="button"], button')]
    .find(control => control.querySelector('img[alt*="Instagram"], svg[aria-label*="Instagram"]'))
    ?.innerText.trim().split(/\s+/).at(-1);
  return {
    username: (instagramIdentity || match?.[1] || 'unknown_user').replace(/[\\/:*?"<>|]/g, ''),
    postId: match?.[2] || 'unknown_id',
    date: formatYYMMDD(date),
  };
}

function getMediaUrl(media) {
  if (media.tagName === 'VIDEO') return media.currentSrc || media.src || media.querySelector('source')?.src || '';
  const srcsetEntries = (media.getAttribute('srcset') || '')
    .split(',')
    .map(entry => entry.trim().match(/^(\S+)\s+(\d+)w$/))
    .filter(Boolean);
  if (srcsetEntries.length) {
    return srcsetEntries
      .sort((left, right) => Number(right[2]) - Number(left[2]))[0][1];
  }
  return media.currentSrc || media.src || '';
}

function isUsableImage(image) {
  const src = getMediaUrl(image);
  const rect = image.getBoundingClientRect();
  const isProfileImage = /profile(_pic| picture)|avatar/i.test(image.alt || '') || /profile_pic/i.test(src);
  // Text can contain emoji or animated GIFs backed by a relatively large
  // source file. Their rendered box is still tiny and they live inside the
  // post's text span, not an attachment card.
  const isInlineTextAsset = Boolean(image.closest('span[dir="auto"], [aria-hidden="true"]'));
  const isTinyInlineAsset = rect.width < MEDIA_MINIMUM_SIZE || rect.height < MEDIA_MINIMUM_SIZE;
  return Boolean(src) && !isProfileImage && !isInlineTextAsset && !isTinyInlineAsset;
}

function isLazyVideoPoster(image) {
  // Instagram-shared carousel videos sometimes expose only a poster until the
  // card is opened. Unlike normal image cards, this poster has no srcset.
  return image.tagName === 'IMG' && !image.getAttribute('srcset') &&
    /cdninstagram\.com/.test(image.src || '') && image.hasAttribute('height');
}

function isRenderedVideoPoster(image) {
  const imageRect = image.getBoundingClientRect();
  let node = image.parentElement;
  for (let depth = 0; node && depth < 20; depth += 1, node = node.parentElement) {
    const matchingVideo = [...node.querySelectorAll('video')].some(video => {
      const videoRect = video.getBoundingClientRect();
      return Math.abs(videoRect.left - imageRect.left) < 1 &&
        Math.abs(videoRect.top - imageRect.top) < 1 &&
        Math.abs(videoRect.width - imageRect.width) < 1 &&
        Math.abs(videoRect.height - imageRect.height) < 1;
    });
    if (matchingVideo) return true;
  }
  return false;
}

function downloadIcon(size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
}

function getNativeHoverColor() {
  // Threads exposes the exact hover tint as a theme variable, so this stays
  // in sync with its current light or dark appearance.
  return getComputedStyle(document.documentElement).getPropertyValue('--hover-overlay').trim() ||
    'rgba(0, 0, 0, 0.04)';
}

function addNativeHoverSurface(button) {
  const surface = button.firstElementChild;
  if (!surface) return;

  const showHover = () => { surface.style.backgroundColor = getNativeHoverColor(); };
  const hideHover = () => { surface.style.backgroundColor = ''; };
  button.addEventListener('mouseenter', showHover);
  button.addEventListener('mouseleave', hideHover);
  button.addEventListener('focus', showHover);
  button.addEventListener('blur', hideHover);
}

function sendDownloadWithMetadata(metadata, media) {
  const downloadableMedia = media.filter(item => item.type !== 'lazy-video');
  if (!downloadableMedia.length) return;
  sendRuntimeMessage({
    action: 'download_media',
    data: {
      ...metadata,
      mediaFiles: downloadableMedia.map(item => ({ url: item.url, type: item.type, mediaNumber: item.mediaNumber })),
    },
  });
}

function startLazyVideoDownload(metadata, item) {
  sessionStorage.setItem(PENDING_LAZY_VIDEO_KEY, JSON.stringify({
    ...metadata,
    mediaNumber: item.mediaNumber,
  }));
  item.container.click();
}

function finishLazyVideoDownload() {
  const pending = sessionStorage.getItem(PENDING_LAZY_VIDEO_KEY);
  if (!pending || !window.location.pathname.endsWith('/media')) return;
  const video = document.querySelector('video');
  const url = video && getMediaUrl(video);
  if (!url) return;

  const metadata = JSON.parse(pending);
  sendRuntimeMessage({
    action: 'download_media',
    data: { ...metadata, mediaFiles: [{ url, type: 'video', mediaNumber: metadata.mediaNumber }] },
  });
  sessionStorage.removeItem(PENDING_LAZY_VIDEO_KEY);
  window.history.back();
}

function findActionRow(shareControl) {
  let node = shareControl.parentElement;
  while (node && node !== document.body) {
    const directItems = getDirectActionItems(node);
    const directLabels = new Set(directItems.flatMap(item => getActionLabels(item)));
    // Some responsive layouts collapse Like and Comment, leaving only
    // Repost and Share. The smallest direct-child action row is still stable.
    if (directLabels.size >= 2 && directItems.some(item => item.contains(shareControl))) return node;
    node = node.parentElement;
  }
  return null;
}

function getActionRows() {
  const rows = new Map();
  document.querySelectorAll('svg[aria-label="Share"]').forEach(shareIcon => {
    const shareControl = shareIcon.closest('[role="button"], button');
    const actionRow = shareControl && findActionRow(shareControl);
    if (shareControl && actionRow && !rows.has(actionRow)) rows.set(actionRow, shareControl);
  });
  return rows;
}

function getScopeMediaMetadata(item) {
  const postRoot = findPostRoot(item.element);
  const fallback = postRoot ? getPostMetadata(postRoot) : {
    username: 'unknown_user', postId: 'unknown_id', date: formatYYMMDD(new Date()),
  };
  // Media anchors preserve the quoted post's source identity even when its
  // visual card shares a broader parent container with a reply.
  const mediaLink = item.element.closest('a[href*="/post/"]');
  const match = mediaLink?.getAttribute('href')?.match(/^\/@([^/]+)\/post\/([^/?#]+)/);
  return match ? {
    ...fallback,
    username: match[1].replace(/[\\/:*?"<>|]/g, ''),
    postId: match[2],
  } : fallback;
}

function findScopeMediaContainer(media) {
  // Download All discovery must not depend on post-root detection: a quoted
  // card can be a sibling of its response row in Threads' DOM. Prefer an
  // explicit media permalink, then the nearest interactive media card.
  const mediaLink = media.closest('a[href*="/post/"][href*="/media"]');
  if (mediaLink) return mediaLink;

  const attachmentCard = media.closest('[role="button"]');
  if (attachmentCard) return attachmentCard;

  const mediaRect = media.getBoundingClientRect();
  let node = media.parentElement;
  while (node && node !== document.body) {
    const rect = node.getBoundingClientRect();
    const mediaCount = node.querySelectorAll('img, video').length;
    if (mediaCount === 1 && rect.width >= mediaRect.width && rect.height >= mediaRect.height) {
      return node;
    }
    node = node.parentElement;
  }
  return media.parentElement;
}

function findScopeActionRow(container, rows) {
  let node = container;
  while (node && node !== document.body) {
    const nestedRows = rows.filter(scope => node.contains(scope.actionRow));
    if (nestedRows.length) {
      // A quoted post's row appears before its parent's row. The nearest card
      // subtree around parent media contains both, so the parent owns the last
      // row; a quote's smaller subtree contains only its own row.
      return nestedRows[nestedRows.length - 1];
    }
    node = node.parentElement;
  }
  return null;
}

function findDownloadScopes() {
  const actionRows = getActionRows();
  const rows = [...actionRows].map(([actionRow, shareControl]) => ({
    actionRow,
    shareControl,
    rect: actionRow.getBoundingClientRect(),
    media: [],
  })).filter(scope => scope.rect.width > 0 && scope.rect.height > 0)
    .sort((left, right) => left.rect.top - right.rect.top);
  const attachments = new Map();

  document.querySelectorAll('img, video').forEach(element => {
    if (element.tagName === 'IMG' && (!isUsableImage(element) || isRenderedVideoPoster(element))) return;
    const container = findScopeMediaContainer(element);
    const url = getMediaUrl(element);
    if (!container || !url) return;
    const item = {
      element,
      container,
      url,
      type: element.tagName === 'VIDEO' ? 'video' :
        (isLazyVideoPoster(element) ? 'lazy-video' : 'image'),
    };
    const existing = attachments.get(container);
    if (!existing || item.type === 'video') attachments.set(container, item);
  });

  attachments.forEach(item => {
    const scope = findScopeActionRow(item.container, rows);
    if (scope) scope.media.push(item);
  });

  const scopes = rows.filter(scope => scope.media.length);
  scopes.forEach(scope => {
    scope.media.sort((left, right) => {
      const leftRect = left.container.getBoundingClientRect();
      const rightRect = right.container.getBoundingClientRect();
      return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
    });
    scope.media.forEach((item, index) => { item.mediaNumber = index + 1; });
    scope.metadata = getScopeMediaMetadata(scope.media[0]);
  });
  return { actionRows, scopes };
}

function injectPostDownloadButton(scope) {
  const { actionRow, shareControl, media, metadata } = scope;
  const actionItem = [...actionRow.children].find(child => child.contains(shareControl));
  const existingButton = actionRow.querySelector(`.${DOWNLOAD_BUTTON_CLASS}`);
  if (existingButton) {
    existingButton.downloadScope = scope;
    return;
  }

  // Reuse Share's complete native interactive element and wrapper, rather
  // than approximating its layout or hover treatment with custom styles.
  // The nested element is what provides Threads' native 36px hit area and
  // circular hover surface, so retain it and replace only the icon.
  const button = shareControl.cloneNode(true);
  button.classList.add(DOWNLOAD_BUTTON_CLASS);
  button.title = 'Download all media';
  button.setAttribute('aria-label', 'Download all media');
  const shareSvg = button.querySelector('svg');
  if (shareSvg) {
    const iconTemplate = document.createElement('template');
    iconTemplate.innerHTML = downloadIcon(18);
    shareSvg.replaceWith(iconTemplate.content.firstElementChild);
  }
  addNativeHoverSurface(button);
  button.downloadScope = scope;
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const currentScope = button.downloadScope;
    const currentMedia = currentScope.media
      .map(item => ({ ...item, url: getMediaUrl(item.element) }))
      .filter(item => item.url);
    sendDownloadWithMetadata(currentScope.metadata, currentMedia);
    const lazyVideo = currentMedia.find(item => item.type === 'lazy-video');
    if (lazyVideo) startLazyVideoDownload(currentScope.metadata, lazyVideo);
  });
  button.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') button.click();
  });

  if (actionItem) {
    const wrapper = actionItem.cloneNode(false);
    wrapper.append(button);
    actionItem.after(wrapper);
  }
  else actionRow.append(button);
}

function injectMediaDownloadButton(scope, item) {
  const { container } = item;
  if (!container) return;

  const existingButton = container.querySelector(`.${ITEM_DOWNLOAD_BUTTON_CLASS}`);
  if (existingButton) {
    existingButton.downloadScope = scope;
    existingButton.downloadItem = item;
    return;
  }

  const button = document.createElement('button');
  button.className = ITEM_DOWNLOAD_BUTTON_CLASS;
  button.type = 'button';
  button.title = 'Download this media';
  button.setAttribute('aria-label', 'Download this media');
  button.innerHTML = downloadIcon(16);
  button.downloadScope = scope;
  button.downloadItem = item;
  button.style.cssText = 'position:absolute!important;top:8px!important;right:8px!important;z-index:2147483647!important;width:28px!important;height:28px!important;padding:0!important;border:0!important;border-radius:50%!important;background:rgba(0,0,0,.65)!important;color:#fff!important;cursor:pointer!important;pointer-events:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;opacity:1!important;transition:opacity .15s ease!important;';
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.append(button);
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    const currentItem = { ...button.downloadItem, url: getMediaUrl(button.downloadItem.element) };
    if (!currentItem.url) return;
    sendDownloadWithMetadata(button.downloadScope.metadata, [currentItem]);
    if (currentItem.type === 'lazy-video') {
      startLazyVideoDownload(button.downloadScope.metadata, currentItem);
    }
  });
}

function injectButtons() {
  if (!hasExtensionContext()) return;
  if (isPostComposer()) {
    document.querySelectorAll(`.${DOWNLOAD_BUTTON_CLASS}, .${ITEM_DOWNLOAD_BUTTON_CLASS}`)
      .forEach(button => button.remove());
    return;
  }
  finishLazyVideoDownload();
  const { actionRows, scopes } = findDownloadScopes();
  const scopeRows = new Set(scopes.map(scope => scope.actionRow));
  actionRows.forEach((shareControl, actionRow) => {
    if (!scopeRows.has(actionRow)) actionRow.querySelector(`.${DOWNLOAD_BUTTON_CLASS}`)?.remove();
  });
  document.querySelectorAll(`.${DOWNLOAD_BUTTON_CLASS}`).forEach(button => {
    const belongsToKnownRow = [...actionRows.keys()].some(actionRow => actionRow.contains(button));
    if (!belongsToKnownRow) button.remove();
  });
  scopes.forEach(injectPostDownloadButton);
  const mediaContainers = new Set(scopes.flatMap(scope => scope.media.map(item => item.container)));
  document.querySelectorAll(`.${ITEM_DOWNLOAD_BUTTON_CLASS}`).forEach(button => {
    if (!mediaContainers.has(button.parentElement)) button.remove();
  });
  scopes.forEach(scope => scope.media.forEach(item => injectMediaDownloadButton(scope, item)));
}

let injectQueued = false;
const observer = new MutationObserver(() => {
  if (injectQueued) return;
  injectQueued = true;
  requestAnimationFrame(() => {
    injectQueued = false;
    injectButtons();
    // Threads often assigns srcset/poster first and finishes the card layout
    // a moment later. Run once more after that settled layout is available.
    window.setTimeout(injectButtons, 250);
  });
});
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src', 'srcset', 'poster', 'href', 'aria-label'],
});
injectButtons();
