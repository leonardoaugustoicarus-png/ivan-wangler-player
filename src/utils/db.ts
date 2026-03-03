/**
 * Simple IndexedDB wrapper for Aura Hi-Res Player
 * Stores File/Blob objects and metadata for audio tracks.
 */

const DB_NAME = 'IvanWanglerPlayerDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

export interface PersistedTrack {
    id: number;
    title: string;
    artist: string;
    format?: string;
    folder?: string;
    file: File | Blob;
    coverUrl?: string; // Still used for temporary blob URLs or AI URLs
    coverBlob?: Blob | null; // Permanent storage for extracted covers
    lyrics?: string;
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveTrack = async (track: PersistedTrack): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(track);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const getAllTracks = async (): Promise<PersistedTrack[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
};

export const deleteTrack = async (id: number): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const clearAllTracks = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

// ─── Export/Import Logic ──────────────────────────────────────────────────

/**
 * Converts a Blob to a Base64 string.
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/**
 * Converts a Base64 string back to a Blob.
 */
const base64ToBlob = (base64: string): Blob => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
};

export const exportLibraryData = async (): Promise<string> => {
    const tracks = await getAllTracks();
    const exportableTracks = await Promise.all(tracks.map(async (track) => {
        const serialized: any = { ...track };

        // Convert audio file to Base64
        serialized.file = await blobToBase64(track.file);

        // Convert coverBlob to Base64 if it exists
        if (track.coverBlob) {
            serialized.coverBlob = await blobToBase64(track.coverBlob);
        }

        // Remove temporary blob URL before export
        delete serialized.coverUrl;

        return serialized;
    }));

    return JSON.stringify({
        version: 1,
        timestamp: Date.now(),
        tracks: exportableTracks
    });
};

export const importLibraryData = async (jsonData: string): Promise<void> => {
    const data = JSON.parse(jsonData);
    if (!data.tracks || !Array.isArray(data.tracks)) {
        throw new Error('Formato de backup inválido.');
    }

    // Optional: Clear existing tracks (or we could merge, but clear is safer for a "restore")
    await clearAllTracks();

    for (const trackData of data.tracks) {
        const track: PersistedTrack = {
            ...trackData,
            file: base64ToBlob(trackData.file),
            coverBlob: trackData.coverBlob ? base64ToBlob(trackData.coverBlob) : null
        };
        await saveTrack(track);
    }
};
