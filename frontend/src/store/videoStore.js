import { create } from 'zustand'

export const useVideoStore = create((set) => ({
  videoId: null,
  filename: '',
  status: null, // full VideoStatus object
  frames: [],
  setVideo: (videoId, filename) => set({ videoId, filename }),
  setStatus: (status) => set({ status }),
  setFrames: (frames) => set({ frames }),
  reset: () => set({ videoId: null, filename: '', status: null, frames: [] }),
}))
