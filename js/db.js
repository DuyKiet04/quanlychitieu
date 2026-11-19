      /* ==========================================================================
       1. DATABASE LAYER: INDEXEDDB (FinMasterDB - Version 4)
       ========================================================================== */
      const DB_NAME = "FinMasterDB";
      const DB_VERSION = 4;

      let dbInstance = null;

      const DB = {
        open() {
          return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
              const db = event.target.result;

              if (!db.objectStoreNames.contains("transactions")) {
                const txStore = db.createObjectStore("transactions", {
                  keyPath: "id",
                });
                txStore.createIndex("date", "date", { unique: false });
                txStore.createIndex("type", "type", { unique: false });
                txStore.createIndex("categoryId", "categoryId", {
                  unique: false,
                });
                txStore.createIndex("isWork", "isWork", { unique: false });
                txStore.createIndex("walletId", "walletId", { unique: false });
              }

              if (!db.objectStoreNames.contains("categories")) {
                db.createObjectStore("categories", { keyPath: "id" });
              }

              if (!db.objectStoreNames.contains("settings")) {
                db.createObjectStore("settings", { keyPath: "key" });
              }

              if (!db.objectStoreNames.contains("wallets")) {
                db.createObjectStore("wallets", { keyPath: "id" });
              }

              if (!db.objectStoreNames.contains("category_budgets")) {
                db.createObjectStore("category_budgets", {
                  keyPath: "categoryId",
                });
              }

              if (!db.objectStoreNames.contains("recurring")) {
                db.createObjectStore("recurring", { keyPath: "id" });
              }

              if (!db.objectStoreNames.contains("journals")) {
                db.createObjectStore("journals", { keyPath: "id" });
              }

              if (!db.objectStoreNames.contains("savings_goals")) {
                db.createObjectStore("savings_goals", { keyPath: "id" });
              }
            };

            request.onsuccess = (event) => {
              dbInstance = event.target.result;
              resolve(dbInstance);
            };

            request.onerror = (event) => {
              console.error("IndexedDB Error:", event.target.error);
              reject(event.target.error);
            };
          });
        },

        async getAll(storeName) {
          const db = await this.open();
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
          });
        },

        async get(storeName, key) {
          const db = await this.open();
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
        },

        async put(storeName, item) {
          const db = await this.open();
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const req = store.put(item);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
        },

        async delete(storeName, key) {
          const db = await this.open();
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const req = store.delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
          });
        },

        async clear(storeName) {
          const db = await this.open();
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const req = store.clear();
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
          });
        },
      };
