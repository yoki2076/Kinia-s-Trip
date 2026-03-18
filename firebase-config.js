// firebase-config.js — 共用 Firebase 初始化 + 工具函式

import { initializeApp }            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ── 你的 Firebase 設定 ──────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBtyJygjNYtDVV5wybC14subUh0teleH7k",
  authDomain:        "kinia-s-trip.firebaseapp.com",
  projectId:         "kinia-s-trip",
  storageBucket:     "kinia-s-trip.firebasestorage.app",
  messagingSenderId: "881218070648",
  appId:             "1:881218070648:web:3520bbd30df7557ccb658d"
};
// ────────────────────────────────────────────────────────

const app      = initializeApp(firebaseConfig);
const db       = getFirestore(app);
const storage  = getStorage(app);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

// ── Google 登入 ──
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

// ── 登出 ──
export async function logOut() {
  await signOut(auth);
}

// ── 等待登入狀態，回傳 user（null = 未登入）──
export const getCurrentUser = () => new Promise(resolve => {
  const unsubscribe = onAuthStateChanged(auth, user => {
    unsubscribe();
    resolve(user);
  });
});

// ── 監聽登入狀態變化 ──
export const onAuthChange = (cb) => onAuthStateChanged(auth, cb);

// ── Firestore helpers ──
export const fsSet  = (path, data) => setDoc(doc(db, ...path.split('/')), data);
export const fsGet  = (path)       => getDoc(doc(db, ...path.split('/')));
export const fsLive = (path, cb)   => onSnapshot(doc(db, ...path.split('/')), cb);

// ── 圖片壓縮：上傳前先縮小 + 壓縮，控制在 300KB 以內 ──
async function compressImage(file, {
  maxWidth  = 1280,   // 最長邊不超過 1280px
  maxSizeKB = 300,    // 目標壓縮後 ≤ 300 KB
  minQuality = 0.45,  // 最低品質（避免過度壓縮）
} = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;

      // 縮放長邊
      if (w > maxWidth || h > maxWidth) {
        if (w >= h) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        else        { w = Math.round(w * maxWidth / h); h = maxWidth; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      // 二分搜尋最佳 quality
      let lo = minQuality, hi = 0.92, best = null;
      const tryQ = (q) => canvas.toDataURL('image/jpeg', q);

      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2;
        const dataUrl = tryQ(mid);
        const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
        if (kb <= maxSizeKB) { best = { dataUrl, q: mid }; lo = mid; }
        else                 { hi = mid; }
      }

      // 若最低品質還超標，直接用最低品質
      if (!best) {
        const dataUrl = tryQ(minQuality);
        best = { dataUrl, q: minQuality };
      }

      const kb = Math.round((best.dataUrl.length * 3) / 4 / 1024);
      console.log(`[compress] ${file.name}: ${Math.round(file.size/1024)}KB → ${kb}KB (q=${best.q.toFixed(2)}, ${w}×${h})`);

      // 轉回 Blob
      canvas.toBlob(
        blob => resolve(blob),
        'image/jpeg',
        best.q
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片載入失敗')); };
    img.src = url;
  });
}

// ── Storage: 壓縮後上傳，回傳下載 URL ──
export async function uploadImage(file, storagePath) {
  // 只壓縮圖片（跳過 GIF/SVG 等）
  let uploadFile = file;
  if (file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml') {
    try {
      const compressed = await compressImage(file);
      // 將壓縮後的 blob 包成 File，保留副檔名改為 .jpg
      const baseName = storagePath.split('/').pop().replace(/\.[^.]+$/, '');
      uploadFile = new File([compressed], baseName + '.jpg', { type: 'image/jpeg' });
      // 更新 storagePath 副檔名
      storagePath = storagePath.replace(/\.[^.]+$/, '.jpg');
    } catch (e) {
      console.warn('[compress] 壓縮失敗，使用原檔:', e.message);
    }
  }

  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, uploadFile);
  return await getDownloadURL(storageRef);
}

// ── Storage: 刪除圖片 ──
export async function deleteImage(urlOrPath) {
  try {
    const storageRef = urlOrPath.startsWith('http')
      ? ref(storage, decodeURIComponent(urlOrPath.split('/o/')[1].split('?')[0]))
      : ref(storage, urlOrPath);
    await deleteObject(storageRef);
  } catch(e) {}
}

// ── base64 → File（舊資料相容）──
export function dataURLtoFile(dataUrl, filename) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export { db, storage, auth };
