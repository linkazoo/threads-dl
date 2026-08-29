# threads-dl — a Threads media downloader (Chrome extension)

threads-dl is a simple Threads media downloader Chrome extension written in JavaScript that allows you to download any media file or all media files of a single Threads post with just one click.

It adds a __Download this media__ button to the top-right corner of each media item and a __Download all media__ button next to __Share__ in the post's response row. The buttons download either the selected item or all media from that post to your default Downloads folder. Filenames use the format `username_YYMMDD_PostID_N.ext`, where N is the media sequence number and `ext` is typically `jpg`, `webp`, or `mp4`.

## Installation

1. Open `chrome://extensions/` in your browser.
2. Turn on __Developer mode__ (top right corner).
3. Click on __Load unpacked__ (top left corner).
4. Select the folder where you saved [manifest.json](./manifest.json), [background.js](./background.js), and [content.js](./content.js) to load the extension.
5. Hard reload your Chrome browser:
   * **Windows & Linux**: Press `Ctrl` + `Shift` + `R` or `Ctrl` + `F5`
   * **Mac**: Press `Cmd` + `Shift` + `R` (or hold `Shift` and click the Reload button in the toolbar)


# threads-dl — Threads 媒體下載器（Chrome 擴充功能）

threads-dl 是一款用 JavaScript 編寫的輕量化 Threads 媒體下載 Chrome 擴充功能，只需點擊一下，即可下載單篇 Threads 貼文中的任何一個媒體檔案或是所有媒體檔案。

它會在每篇貼文裡的每一個媒體項目的右上角加上一個 __Download this media（下載這個媒體）__ 按鈕，還有在貼文下方的 __Share__ (分享) 按鈕旁邊，新增一個 __Download all media（下載所有媒體）__ 按鈕。點擊任意這些按鈕，系統會下載選擇的項目或是所有媒體檔到預設的下載資料夾。下載的檔案名稱格式為：`username_YYMMDD_PostID_N.ext`，其中 N 為檔案的順序編號，且 ext 通常是 `jpg`, `webp`, 或 `mp4`。

## 安裝說明

1. 在瀏覽器中打開 `chrome://extensions/`。
2. 開啟右上角的 __開發者模式__。
3. 點擊左上角的 __載入未打包擴充功能__。
4. 選擇您儲存 [manifest.json](./manifest.json)、[background.js](./background.js) 和 [content.js](./content.js) 的資料夾，即可完成擴充功能的上傳。
5. 強制重新整理（Hard Reload）您的 Chrome 瀏覽器：
   * **Windows 和 Linux**：按下 `Ctrl` + `Shift` + `R` 或 `Ctrl` + `F5`
   * **Mac**：按下 `Cmd` + `Shift` + `R`（或按住 `Shift` 鍵並點擊工具列中的重新整理按鈕）

![](./download_this_media.png)
![](./download_all_media.png)
