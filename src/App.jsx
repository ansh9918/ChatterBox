import { useEffect } from "react";
import { useUserStore } from "./lib/userStore";
import supabase from "./lib/supabase";
import Chat from "./Components/Chat/Chat";
import List from "./Components/List/List";
import Details from "./Components/Details/Details";
import Login from "./Components/Login/Login";
import Notification from "./Components/Notification/Notification";

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

  if (isLoading) return <div className="loading">Loading...</div>;

  return (
    <div className="bg-photu flex h-screen items-center justify-center border-2 border-white/15 text-white">
      <div className="m-auto flex h-[90vh] w-[80vw] overflow-hidden rounded-[12px] bg-[rgb(17,25,40)]/75 saturate-[1.8] backdrop-blur-lg">
        {currentUser ? (
          <>
            <List />
            <Chat />
            <Details />
          </>
        ) : (
          <Login />
        )}
      </div>
      <Notification />
    </div>
  );
}

export default App;
