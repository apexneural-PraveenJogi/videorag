import { create } from 'zustand'

// Chat history is keyed per video so navigating between videos keeps threads separate.
// Each message: { id, role: 'user'|'assistant', text, references?, model?, latencyMs?, streaming?, error? }
export const useChatStore = create((set, get) => ({
  byVideo: {}, // { [videoId]: Message[] }
  model: '', // selected vision model id ('' => backend default)

  setModel: (model) => set({ model }),

  messages: (videoId) => get().byVideo[videoId] || [],

  addMessage: (videoId, message) =>
    set((state) => ({
      byVideo: {
        ...state.byVideo,
        [videoId]: [...(state.byVideo[videoId] || []), message],
      },
    })),

  updateMessage: (videoId, id, patch) =>
    set((state) => ({
      byVideo: {
        ...state.byVideo,
        [videoId]: (state.byVideo[videoId] || []).map((m) =>
          m.id === id ? { ...m, ...patch } : m,
        ),
      },
    })),

  clear: (videoId) =>
    set((state) => ({ byVideo: { ...state.byVideo, [videoId]: [] } })),
}))
