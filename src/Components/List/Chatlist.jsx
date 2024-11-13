import { useEffect, useState } from "react";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";
import AddUser from "./AddUser";
import supabase from "../../lib/supabase";

const Chatlist = () => {
  const [chats, setChats] = useState([]);
  const [addMode, setAddMode] = useState(false);
  const [input, setInput] = useState("");

  const { currentUser } = useUserStore();
  const { changeChat } = useChatStore();

  useEffect(() => {
    if (!currentUser?.id) return; // Ensure currentUser is defined before fetching chats

    const fetchChats = async () => {
      try {
        const { data: userChats, error } = await supabase
          .from("userchats")
          .select("chats")
          .eq("id", currentUser.id)
          .single();

        if (error) {
          console.error("Error fetching user chats:", error);
          return;
        }

        const promises = userChats.chats.map(async (item) => {
          const { data: user, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("id", item.receiverId)
            .single();

          if (userError) {
            console.error("Error fetching user info:", userError);
            return null;
          }

          return { ...item, user };
        });

        const chatData = await Promise.all(promises);
        setChats(
          chatData.filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt),
        );
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchChats();

    const interval = setInterval(fetchChats, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const handleSelect = async (chat) => {
    const updatedChats = chats.map(({ ...rest }) => rest); // Remove `user` here

    const chatIndex = updatedChats.findIndex(
      (item) => item.chatId === chat.chatId,
    );

    if (chatIndex > -1) {
      updatedChats[chatIndex].isSeen = true;
    }

    try {
      const { error } = await supabase
        .from("userchats")
        .update({ chats: updatedChats })
        .eq("id", currentUser.id);

      if (error) {
        throw new Error("Error updating chat as seen:", error);
      }

      changeChat(chat.chatId); // Remove `chat.user` here if not used
    } catch (err) {
      console.error(err);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.user.username.toLowerCase().includes(input.toLowerCase()),
  );

  return (
    <div className="flex h-screen flex-col">
      <div className="flex w-full items-center gap-5 px-5 py-2">
        <div className="flex items-center gap-5 rounded-md bg-[rgb(17,25,40)]/50 p-1 px-2">
          <img
            src="./search.png"
            alt=""
            className="h-4 w-4 bg-transparent text-white"
          />
          <input
            type="text"
            placeholder="Search"
            className="border-none bg-transparent text-white outline-none"
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <div className="h-6 w-6 rounded-md bg-[rgb(17,25,40)]/50">
          <img
            src={addMode ? "./minus.png" : "./plus.png"}
            alt=""
            className="h-full w-full p-[6px]"
            onClick={() => setAddMode((prev) => !prev)}
          />
        </div>
      </div>
      <div className="overflow-hidden">
        <div className="mt-4 h-[73%] overflow-y-scroll">
          {filteredChats.map((chat) => {
            <div
              className="flex items-center justify-start gap-5 border-b-[1px] border-b-[#dddddd35] px-4 py-3"
              key={chat.chatId}
              onClick={() => handleSelect(chat)}
              style={{
                backgroundColor: chat?.isSeen ? "transparent" : "#5183fe",
              }}
            >
              <img
                src={
                  chat.user.blocked.includes(currentUser.id)
                    ? "./avatar.png"
                    : chat.user.avatar || "./avatar.png"
                }
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="flex flex-col gap-[6px]">
                <h3 className="text-sm font-medium tracking-wide">
                  {chat.user.blocked.includes(currentUser.id)
                    ? "User"
                    : chat.user.username}
                </h3>
                <p className="text-xs">{chat.lastMessage}</p>
              </div>
            </div>;
          })}
        </div>
      </div>
      {addMode && <AddUser />}
    </div>
  );
};

export default Chatlist;
