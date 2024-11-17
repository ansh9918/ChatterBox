import { create } from "zustand";
import supabase from "./supabase";

export const useUserStore = create((set) => ({
  currentUser: null,
  isLoading: true,

  fetchUserInfo: async (uid) => {
    if (!uid) return set({ currentUser: null, isLoading: false });

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid);

      if (error) throw error;

      if (data.length > 0) {
        set({ currentUser: data[0], isLoading: false });
      } else {
        set({ currentUser: null, isLoading: false });
      }
    } catch (err) {
      console.log(err);
      return set({ currentUser: null, isLoading: false });
    }
  },
}));
