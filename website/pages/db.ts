const DB_NAME = "blackjackDB";
const STORE = "users";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "username" });
      }
    };

    req.onsuccess = () => resolve(req.result);
  });
}

export async function createUser(username: string, password: string) {
  const db = await openDB();

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    const req = store.get(username);

    req.onsuccess = () => {
      if (req.result) return resolve(null);

      const user = { username, password, balance: 1000 };
      store.add(user);
      resolve(user);
    };
  });
}

export async function loginUser(username: string, password: string) {
  const db = await openDB();

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);

    const req = store.get(username);

    req.onsuccess = () => {
      const user = req.result;

      if (user && user.password === password) resolve(user);
      else resolve(null);
    };
  });
}

export async function saveUser(user: any) {
  const db = await openDB();

  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(user);
}

export async function getLeaderboard() {
  const db = await openDB();

  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);

    const req = store.getAll();

    req.onsuccess = () => {
      resolve(
        req.result.sort((a: any, b: any) => b.balance - a.balance)
      );
    };
  });
}