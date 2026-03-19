// firebase-config.js — 共用 Firebase 初始化 + 工具函式（Compat SDK 版）
// 注意：此檔案需配合各頁面 <head> 內載入的 firebase-*-compat.js 使用

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

// 避免重複初始化（子頁面與 index.html 都會載入此檔）
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const _auth    = firebase.auth();
const _db      = firebase.firestore();
const _storage = firebase.storage();

// ── Google 登入 ──
function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  return _auth.signInWithPopup(provider).then(result => result.user);
}

// ── 登出 ──
function logOut() {
  return _auth.signOut();
}

// ── 等待登入狀態，回傳 user（null = 未登入）──
function getCurrentUser() {
  return new Promise(resolve => {
    const unsubscribe = _auth.onAuthStateChanged(user => {
      unsubscribe();
      resolve(user);
    });
  });
}

// ── 監聽登入狀態變化 ──
function onAuthChange(cb) {
  return _auth.onAuthStateChanged(cb);
}

// ── Firestore path → ref helper ──
function _docRef(path) {
  const parts = path.split('/');
  let ref = _db;
  for (let i = 0; i < parts.length; i++) {
    ref = i % 2 === 0 ? ref.collection(parts[i]) : ref.doc(parts[i]);
  }
  return ref;
}

// ── Firestore helpers ──
function fsSet(path, data)  { return _docRef(path).set(data); }
function fsGet(path)        { return _docRef(path).get(); }
function fsLive(path, cb)   { return _docRef(path).onSnapshot(cb); }

// ── 圖片壓縮 ──
async function compressImage(file, { maxWidth=1280, maxSizeKB=300, minQuality=0.45 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width, h = img.height;
      if (w > maxWidth || h > maxWidth) {
        if (w >= h) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        else        { w = Math.round(w * maxWidth / h); h = maxWidth; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      let lo = minQuality, hi = 0.92, best = null;
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2;
        const dataUrl = canvas.toDataURL('image/jpeg', mid);
        const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
        if (kb <= maxSizeKB) { best = { dataUrl, q: mid }; lo = mid; }
        else                 { hi = mid; }
      }
      if (!best) { const dataUrl = canvas.toDataURL('image/jpeg', minQuality); best = { dataUrl, q: minQuality }; }
      const kb = Math.round((best.dataUrl.length * 3) / 4 / 1024);
      console.log(`[compress] ${file.name}: ${Math.round(file.size/1024)}KB → ${kb}KB (q=${best.q.toFixed(2)}, ${w}×${h})`);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', best.q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('圖片載入失敗')); };
    img.src = url;
  });
}

// ── Storage: 壓縮後上傳，回傳下載 URL ──
async function uploadImage(file, storagePath) {
  let uploadFile = file;
  if (file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml') {
    try {
      const compressed = await compressImage(file);
      const baseName = storagePath.split('/').pop().replace(/\.[^.]+$/, '');
      uploadFile = new File([compressed], baseName + '.jpg', { type: 'image/jpeg' });
      storagePath = storagePath.replace(/\.[^.]+$/, '.jpg');
    } catch (e) { console.warn('[compress] 壓縮失敗，使用原檔:', e.message); }
  }
  const storageRef = _storage.ref(storagePath);
  await storageRef.put(uploadFile);
  return await storageRef.getDownloadURL();
}

// ── Storage: 刪除圖片 ──
async function deleteImage(urlOrPath) {
  try {
    const storageRef = urlOrPath.startsWith('http')
      ? _storage.ref(decodeURIComponent(urlOrPath.split('/o/')[1].split('?')[0]))
      : _storage.ref(urlOrPath);
    await storageRef.delete();
  } catch(e) {}
}

// ── base64 → File（舊資料相容）──
function dataURLtoFile(dataUrl, filename) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

// ── 掛到 window，讓各子頁面直接用 window._fb.xxx() ──
window._fb = { signInWithGoogle, logOut, getCurrentUser, onAuthChange, fsSet, fsGet, fsLive, uploadImage, deleteImage, dataURLtoFile };
