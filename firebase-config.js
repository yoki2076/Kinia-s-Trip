// firebase-config.js — 共用 Firebase 初始化 + 工具函式

import { initializeApp }            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject }
                                    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth, signInAnonymously, onAuthStateChanged,
         GoogleAuthProvider, signInWithPopup, signOut }
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

// ── 匿名登入（離線備用）──
export async function signInAsGuest() {
  const result = await signInAnonymously(auth);
  return result.user;
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

// ── Storage: 上傳 File 物件，回傳下載 URL ──
export async function uploadImage(file, storagePath) {
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
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
