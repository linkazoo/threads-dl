# threads-dl — a Threads media downloader (Chrome extension)

threads-dl is a simple Threads media downloader Chrome extension written in JavaScript that allows you to download all media files of a single Threads post with just one click.

It adds a __Download Media__ button next to the __Share__ button below every Threads post. After clicking the __Download Media__ button, it will download all media files to your default downloads folder. The filenames are formatted as `username_YYMMDD_PostID-N.mp4/jpg` (where N is the file sequence number).

## Installation

1. Open `chrome://extensions/` in your browser.
2. Turn on __Developer mode__ (top right corner).
3. Click on __Load unpacked__ (top left corner).
4. Select the folder where you saved [manifest.json](./manifest.json), [background.js](./background.js), and [content.js](./content.js) to upload the extension.
5. Hard reload your Chrome browser:
   * **Windows & Linux**: Press `Ctrl` + `Shift` + `R` or `Ctrl` + `F5`
   * **Mac**: Press `Cmd` + `Shift` + `R` (or hold `Shift` and click the Reload button in the toolbar)
6. The __Download Media__ button will appear under every Threads post next to the __Share__ button.

Note: This extension works for both the main feed (timeline) and standalone post views, but cannot directly extract media from inside a quoted post. In that case, simply click to open the original post individually or view it on the main feed to download its contents.


# threads-dl — Threads 媒體下載器（Chrome 擴充功能）

threads-dl 是一款用 JavaScript 編寫的輕量化 Threads 媒體下載 Chrome 擴充功能，讓您只需點擊一下，即可下載單篇 Threads 貼文中的所有媒體檔案。

它會在每篇 Threads 貼文下方的 __Share__ (分享) 按鈕旁邊，新增一個 __Download Media（下載媒體）__ 按鈕。點擊該按鈕後，系統會將所有媒體檔案下載至您的預設下載資料夾。下載的檔案名稱格式為：`username_YYMMDD_PostID-N.mp4/jpg`（其中 N 為檔案的順序編號）。

## 安裝說明

1. 在瀏覽器中打開 `chrome://extensions/`。
2. 開啟右上角的 __開發者模式__。
3. 點擊左上角的 __載入未打包擴充功能__。
4. 選擇您儲存 [manifest.json](./manifest.json)、[background.js](./background.js) 和 [content.js](./content.js) 的資料夾，即可完成擴充功能的上傳。
5. 強制重新整理（Hard Reload）您的 Chrome 瀏覽器：
   * **Windows 和 Linux**：按下 `Ctrl` + `Shift` + `R` 或 `Ctrl` + `F5`
   * **Mac**：按下 `Cmd` + `Shift` + `R`（或按住 `Shift` 鍵並點擊工具列中的重新整理按鈕）
6. 貼文下方的「分享」按鈕旁就會出現 __Download Media__ 按鈕。

請注意，此擴充功能同時支援「河道/動態消息（Feed）檢視」與「單篇貼文檢視」，但無法直接下載內嵌在引用貼文（Quoted Post）中的媒體。若要下載該類媒體，您需要先點入該篇原始貼文，將其切換至河道動態或單篇貼文檢視中。
