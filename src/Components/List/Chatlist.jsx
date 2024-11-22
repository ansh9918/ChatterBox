import { useEffect, useState } from "react";
import { useUserStore } from "../../lib/userStore";
import { useChatStore } from "../../lib/chatStore";
import AddUser from "./AddUser";
import supabase from "../../lib/supabase";

const Chatlist = () => {
  const [addMode, setAddMode] = useState(false); // Toggles the AddUser component
  const [chats, setChats] = useState([]); // Stores the list of chats
  const [input, setInput] = useState(""); // Search input state

  const { currentUser } = useUserStore();
  const { changeChat } = useChatStore();

  // Fetch chats on mount or when currentUser changes
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const { data, error } = await supabase
          .from("userchats")
          .select("chats")
          .eq("id", currentUser.id)
          .single();

        if (error) {
          //console.error("Error fetching user chats:", error);
          return;
        }

        if (!data || !Array.isArray(data.chats)) {
          //console.warn("No chats found for the current user.");
          setChats([]);
          return;
        }

        const chatData = await Promise.all(
          data.chats.map(async (chatItem) => {
            if (!chatItem.receiverId) {
              console.warn(
                "Skipping chat item with missing receiverId:",
                chatItem,
              );
              return null; // Skip invalid entries
            }

            // Fetch user details
            const { data: user, error: userError } = await supabase
              .from("users")
              .select("*")
              .eq("id", chatItem.receiverId)
              .single();

            if (userError) {
              //console.error("Error fetching user info:", userError);
              return null; // Skip users with fetch errors
            }

            return { ...chatItem, user }; // Merge chat item with user info
          }),
        );

        // Filter out null values (skipped invalid or error entries)
        setChats(
          chatData
            .filter((item) => item !== null)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
        );
      } catch (err) {
        console.error("Unexpected error fetching chats:", err);
      }
    };

    fetchChats();

    // Set up real-time updates using Supabase channel API
    const channel = supabase
      .channel("userchats-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "userchats",
          filter: `id=eq.${currentUser.id}`,
        },
        async (payload) => {
          console.log("Real-time update received:", payload);
          await fetchChats(); // Re-fetch chats on update
        },
      )
      .subscribe();

    // Clean up subscription on component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id]);

  // Handle selecting a chat
  const handleSelect = async (chat) => {
    try {
      // Mark the chat as seen
      console.log(chat);
      const updatedChats = chats.map((item) =>
        item.chatId === chat.chatId ? { ...item, isSeen: true } : item,
      );

      // Update chats in Supabase
      const { error } = await supabase
        .from("userchats")
        .update({ chats: updatedChats })
        .eq("id", currentUser.id);

      if (error) {
        //console.error("Error updating chat as seen:", error);
        return;
      }

      // Trigger chat change in the UI
      console.log(chat.user);
      changeChat(chat.chatId, chat.user);
    } catch (err) {
      console.error("Error selecting chat:", err);
    }
  };

  // Filter chats for search input
  const filteredChats = chats.filter(
    (chat) =>
      chat.user &&
      chat.user.username.toLowerCase().includes(input.toLowerCase()),
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Search and Add Button */}
      <div className="flex w-full items-center gap-5 px-5 py-2">
        <div className="flex items-center gap-5 rounded-md bg-[rgb(17,25,40)]/50 p-1 px-2">
          <img
            src="./search.png"
            alt="Search"
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
            alt="Toggle Add"
            className="h-full w-full p-[6px]"
            onClick={() => setAddMode((prev) => !prev)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="overflow-hidden">
        <div className="mt-4 h-[100%] overflow-y-scroll">
          {filteredChats.map((chat) => (
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
                  chat?.user?.blocked?.includes(currentUser.id)
                    ? "./avatar.png"
                    : chat?.user?.avatar || "./avatar.png"
                }
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover"
              />
              <div className="flex flex-col gap-[6px]">
                <h3 className="text-sm font-medium tracking-wide">
                  {chat?.user?.blocked?.includes(currentUser.id)
                    ? "User"
                    : chat?.user?.username}
                </h3>
                <p className="w-20 overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                  {chat.lastMessage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Component */}
      {addMode && <AddUser />}
    </div>
  );
};

export default Chatlist;
