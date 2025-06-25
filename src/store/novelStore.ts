import { create } from 'zustand';
import { NovelHistory } from '../types'; // Keep type definition

// Simplified store interface without Supabase sync/persistence
interface NovelStore {
  histories: NovelHistory[];
  addHistory: (history: NovelHistory) => void; // Simplified signature
  updateHistory: (id: string, updates: Partial<NovelHistory>) => void; // Simplified signature
  clearHistories: () => void; // Simplified signature
  // Removed: pendingWrites, syncWithSupabase, processPendingWrites, scheduleSyncWithSupabase
}

export const useNovelStore = create<NovelStore>((set) => ({
  histories: [], // Initialize as empty

  addHistory: (history) => {
    // Ensure history has a unique ID if needed locally
    const historyWithId = { ...history, id: history.id || crypto.randomUUID() };
    if (import.meta.env.DEV) {
      console.log(`[${new Date().toISOString()}] addHistory called (session only).`);
    }
    set(state => ({
      // Add to the beginning and keep only the last 10 (or adjust as needed)
      histories: [historyWithId, ...state.histories].slice(0, 10),
    }));
  },

  updateHistory: (id, updates) => {
    const timestamp = Date.now(); // Keep timestamp for potential local use
    if (import.meta.env.DEV) {
      console.log(`[${new Date().toISOString()}] updateHistory called for ID: ${id} (session only).`);
    }
    set(state => ({
      histories: state.histories.map((h) =>
        h.id === id ? { ...h, ...updates, lastUpdated: timestamp } : h
      ),
    }));
  },

  clearHistories: () => {
    if (import.meta.env.DEV) {
      console.log(`[${new Date().toISOString()}] clearHistories called (session only).`);
    }
    set({ histories: [] }); // Simply clear the local array
  },

  // Removed syncWithSupabase and related logic
}));