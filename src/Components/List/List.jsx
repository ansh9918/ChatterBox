import Chatlist from "./Chatlist";
import UserInfo from "./UserInfo";
import Chat from "../Chat/Chat";
import { useUserStore } from "../../lib/userStore";
import Details from "../Details/Details";
import { useEffect } from "react";

const List = () => {
  const currentComponent = useUserStore((state) => state.currentComponent);
  const updateSwitchingAllowance = useUserStore(
    (state) => state.updateSwitchingAllowance,
  );

  useEffect(() => {
    const handleResize = () => {
      updateSwitchingAllowance();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateSwitchingAllowance]);
  return (
    <>
      {currentComponent === "Chats" && <Chat />}

      {currentComponent === "Details" && <Details />}
      {currentComponent === "chatList" && (
        <div className="flex flex-1 flex-col border-r-[1px] border-r-[#dddddd35]">
          <UserInfo />
          <Chatlist />
        </div>
      )}
    </>
  );
};

export default List;
