import { useEffect } from "react";
import { useUserStore } from "./lib/userStore";
import supabase from "./lib/supabase";
import List from "./Components/List/List";
import Login from "./Components/Login/Login";
import Notification from "./Components/Notification/Notification";
import Chat from "./Components/Chat/Chat";
import Detail from "./Components/Details/Details";
function App() {
  const { currentUser, isLoading, fetchUserInfo } = useUserStore();

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        fetchUserInfo(session.user.id);
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          fetchUserInfo(session.user.id);
        } else {
          fetchUserInfo(null);
        }
      },
    );

    return () => {
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [fetchUserInfo]);

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center bg-[rgb(14,21,33)]">
        <svg
          className="h-7 w-7 animate-spin text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );

  return (
    <div className="bg-photu relative flex h-screen items-center justify-center border-2 border-white/15 text-white">
      <div className="m-auto flex h-[90vh] w-[80vw] overflow-hidden rounded-[12px] bg-[rgb(17,25,40)]/75 saturate-[1.8] backdrop-blur-lg">
        {currentUser ? (
          <div className="h-full w-full">
            {/* Large Devices: Show List, Chat, and Detail */}
            <div className="hidden h-full w-full lg:flex">
              <List />
              <Chat />
              <Detail />
            </div>

            {/* Small Devices: Show Only List */}
            <div className="block h-full w-full lg:hidden">
              <List />
            </div>
          </div>
        ) : (
          <Login />
        )}
      </div>
      <Notification />
    </div>
  );
}

export default App;
