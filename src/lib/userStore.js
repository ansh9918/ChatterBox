import supabase from "./supabase";
import { create } from "zustand";

export const useUserStore = create((set) => ({
  isComponentVisible: false, // Track if the component is visible
  toggleComponentVisibility: () =>
    set((state) => ({ isComponentVisible: !state.isComponentVisible })),
  currentUser: null,
  isLoading: true,
  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .single(); // Ensure we get only a single record

      if (error) {
        console.error("Error fetching user:", error);
        set({ currentUser: null, isLoading: false });
      } else {
        set({ currentUser: user, isLoading: false });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      set({ currentUser: null, isLoading: false });
    }
  },
}));
