# 🚀 部署到 GitHub Pages 完整指南

## 📁 最終目錄結構

```
trip-app/
├── index.html          ← 主 App（所有頁面整合於此）
├── manifest.json       ← PWA 設定（讓手機可「加入主畫面」）
├── sw.js               ← Service Worker（離線快取）
├── icons/
│   ├── icon-192.png    ← App 圖示（小）
│   └── icon-512.png    ← App 圖示（大）
└── DEPLOY.md           ← 本說明文件
```

---

## 步驟一：建立 GitHub Repository

1. 前往 [github.com](https://github.com) → **New repository**
2. Repository name：例如 `trip-app`（建議英文）
3. 設定為 **Public**（GitHub Pages 免費版需要）
4. 不要勾選 Initialize README（我們自己上傳）
5. 按 **Create repository**

---

## 步驟二：上傳檔案

### 方法 A：直接網頁上傳（最簡單）

1. 進入你的 repository 頁面
2. 點 **Add file → Upload files**
3. 把整個 `trip-app/` 資料夾的內容**全部拖進去**
   - `index.html`
   - `manifest.json`
   - `sw.js`
   - `icons/` 資料夾（連同裡面的 PNG）
4. 填寫 Commit message，例如：`Initial commit`
5. 按 **Commit changes**

### 方法 B：Git 指令（進階）

```bash
cd trip-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的帳號/trip-app.git
git push -u origin main
```

---

## 步驟三：開啟 GitHub Pages

1. 進入 repository → **Settings** → 左側選單 **Pages**
2. Source 選 **Deploy from a branch**
3. Branch 選 **main**，資料夾選 **/ (root)**
4. 按 **Save**
5. 等 1～3 分鐘後，頁面上方會出現：

```
Your site is published at https://你的帳號.github.io/trip-app/
```

---

## 步驟四：手機加入主畫面

### iOS（Safari）
1. 用 Safari 打開你的網址
2. 點底部 **分享** 按鈕（方形加箭頭）
3. 選 **加入主畫面**
4. 命名後按 **加入** → App 出現在桌面！

### Android（Chrome）
1. 用 Chrome 打開網址
2. 點右上角 **⋮** → **加入主畫面** 或 **安裝應用程式**
3. 確認安裝

---

## 步驟五：之後更新檔案

每次更新 `index.html` 後：

```bash
git add index.html
git commit -m "更新行程頁面"
git push
```

GitHub Pages 約 1 分鐘後自動更新。

---

## ☁️ Firebase 設定（資料雲端同步）

### 1. 建立 Firebase 專案

1. 前往 [console.firebase.google.com](https://console.firebase.google.com)
2. **新增專案** → 輸入名稱（例如 `my-trip-app`）
3. 不需要 Google Analytics，直接建立

### 2. 開啟所需服務

- **Firestore Database**：儲存行程/記帳/清單資料
  - 建立資料庫 → 選 **測試模式**（之後再改規則）
- **Storage**：儲存景點圖片
  - 建立 Storage → 選 **測試模式**
- **Authentication**：匿名登入（不需要帳密）
  - 啟用 → **匿名** 登入方式 → 啟用

### 3. 取得設定碼

1. 專案設定 → **一般** → 往下滑到「您的應用程式」
2. 點 **網頁** 圖示（`</>`）
3. 複製 `firebaseConfig` 物件

### 4. 填入 index.html

打開 `index.html`，找到以下區塊（約在 `</body>` 前面），**取消註解**並填入你的設定：

```javascript
// 找到這段，把 /* ... */ 的注解符號移除
const firebaseConfig = {
  apiKey: "貼上你的 apiKey",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "你的 ID",
  appId: "你的 appId"
};
```

### 5. 各頁面接上 Firebase 的方式

```javascript
// 儲存行程狀態到 Firestore
await setDoc(doc(db, 'trips', 'myTrip'), window.S);

// 讀取行程
const snap = await getDoc(doc(db, 'trips', 'myTrip'));
if (snap.exists()) Object.assign(window.S, snap.data());

// 上傳圖片到 Storage，取回 URL
const imgRef = ref(storage, `spots/${Date.now()}.jpg`);
await uploadBytes(imgRef, file);
const url = await getDownloadURL(imgRef);
```

---

## ⚠️ 注意事項

| 項目 | 說明 |
|------|------|
| **localStorage** | 目前資料存在瀏覽器 localStorage，清除快取會消失 |
| **Firebase 前** | 接上 Firebase 前，每個頁面資料各自獨立 |
| **圖片** | 目前圖片用 base64 存在記憶體，加 Firebase Storage 後才能持久 |
| **多裝置同步** | 需要 Firebase + Authentication（至少匿名登入）才能跨裝置 |
| **HTTPS** | GitHub Pages 自動提供 HTTPS，SW 和 PWA 功能才能正常運作 |

---

## 常見問題

**Q：打開後畫面空白？**
> 確認 `index.html` 在 repository 根目錄，不是在子資料夾內。

**Q：Service Worker 不生效？**
> 必須在 HTTPS 下才能運作（`localhost` 或 `github.io` 都可以）。

**Q：手機沒有「加入主畫面」選項？**
> iOS 要用 Safari（不能用 Chrome）；Android 用 Chrome 或 Edge。

**Q：想換 App 名稱？**
> 修改 `manifest.json` 的 `name` 和 `short_name`，重新 push。
