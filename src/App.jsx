import Chat from "./Components/Chat/Chat";
import List from "./Components/List/List";
import Details from "./Components/Details/Details";
import Login from "./Components/Login/Login";
import Notification from "./Components/Notification/Notification";
import { useUserStore } from "./lib/userStore";
function App() {
  const user = false;
  const isComponentVisible = useUserStore((state) => state.isComponentVisible);

  return (
    <>
      <div className="bg-photu flex h-screen items-center justify-center border-2 border-white/15 text-white">
        <div className="m-auto flex h-[90vh] w-[80vw] overflow-hidden rounded-[12px] bg-[rgb(17,25,40)]/75 saturate-[1.8] backdrop-blur-lg">
          {user ? (
            <>
              <List />
              <Chat />
              {isComponentVisible && <Details />}
            </>
          ) : (
            <Login />
          )}
          <Notification />
        </div>
      </div>
    </>
  );
}

export default App;
