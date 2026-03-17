// firebase-config.js — 共用 Firebase 初始化 + 工具函式

import { initializeApp }            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth, signInAnonymously, onAuthStateChanged }
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

const app     = initializeApp(firebaseConfig);
const db      = getFirestore(app);
const storage = getStorage(app);
const auth    = getAuth(app);

// ── 等待匿名登入完成後回傳 uid ──
export const waitForAuth = () => new Promise(resolve => {
  onAuthStateChanged(auth, user => {
    if (user) { resolve(user.uid); return; }
    signInAnonymously(auth);
  });
});

// ── Firestore helpers ──
export const fsSet  = (path, data) => setDoc(doc(db, ...path.split('/')), data);
export const fsGet  = (path)       => getDoc(doc(db, ...path.split('/')));
export const fsLive = (path, cb)   => onSnapshot(doc(db, ...path.split('/')), cb);

// ── Storage: 上傳 File 物件，回傳下載 URL ──
export async function uploadImage(file, storagePath) {
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// ── Storage: 刪除圖片（用 URL 或 path）──
export async function deleteImage(urlOrPath) {
  try {
    const storageRef = urlOrPath.startsWith('http')
      ? ref(storage, decodeURIComponent(urlOrPath.split('/o/')[1].split('?')[0]))
      : ref(storage, urlOrPath);
    await deleteObject(storageRef);
  } catch(e) { /* 圖片不存在或已刪，忽略 */ }
}

// ── 把 base64 DataURL 轉成 File 物件（舊資料相容用）──
export function dataURLtoFile(dataUrl, filename) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export { db, storage, auth };
