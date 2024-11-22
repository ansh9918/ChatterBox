import { useState } from "react";
import { useUserStore } from "../../lib/userStore";
import supabase from "../../lib/supabase";

const AddUser = () => {
  const [user, setUser] = useState([]);
  const { currentUser } = useUserStore();

  // Handles user search by username
  const handleSearch = async (e) => {
    e.preventDefault(); // Prevents page reload on form submission
    //console.log("Search form submitted"); // Debugging log to verify function call

    const formData = new FormData(e.target);
    const username = formData.get("username");

    //console.log("Username from form:", username); // Debugging log for username

    if (!username) {
      //console.log("No username entered.");
      return;
    }

    try {
      // Fetch user data from Supabase based on the username
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error) {
        //console.error("Error finding user:", error);
        setUser(null);
      } else if (data) {
        setUser(data); // Set found user data
        //console.log("User found:", data); // Debugging log for found user
      } else {
        // console.log("User not found");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  // Handles the creation of a new chat between the current user and the found user
  const handleAdd = async () => {
    try {
      //console.log("Creating a new chat...");

      // Generate a unique chat ID
      const chatId = `chat_${Date.now()}`;

      /** Step 1: Update Current User's Chats */
      // Fetch the current user's chats
      const { data: userChatData, error: fetchError } = await supabase
        .from("userchats")
        .select("chats")
        .eq("id", currentUser.id)
        .single();

      if (fetchError) {
        // console.error(
        //   "Error fetching current user's chats:",
        //   fetchError.message,
        // );
        return;
      }

      let updatedChats;

      if (Array.isArray(userChatData?.chats)) {
        // Check if the chat already exists
        const existingChatIndex = userChatData.chats.findIndex(
          (chat) => chat.receiverId === user.id,
        );

        if (existingChatIndex >= 0) {
          // Update the existing chat
          updatedChats = [...userChatData.chats];
          updatedChats[existingChatIndex] = {
            ...updatedChats[existingChatIndex],
            updatedAt: new Date().toISOString(),
          };
        } else {
          // Append a new chat
          updatedChats = [
            ...userChatData.chats,
            {
              chatId,
              receiverId: user.id,
              lastMessage: "",
              messages: [],
              updatedAt: new Date().toISOString(),
            },
          ];
        }
      } else {
        // Initialize chats if empty or null
        updatedChats = [
          {
            chatId,
            receiverId: user.id,
            lastMessage: "",
            messages: [],
            updatedAt: new Date().toISOString(),
          },
        ];
      }

      // Update the current user's chats
      const { error: updateError } = await supabase
        .from("userchats")
        .update({ chats: updatedChats })
        .eq("id", currentUser.id);

      if (updateError) {
        // console.error(
        //   "Error updating current user's chats:",
        //   updateError.message,
        // );
        return;
      }

      //console.log("Current user's chats updated successfully!");

      /** Step 2: Update Receiver's Chats */
      // Fetch the receiver's chats
      const { data: receiverChatData, error: receiverFetchError } =
        await supabase
          .from("userchats")
          .select("chats")
          .eq("id", user.id)
          .single();

      if (receiverFetchError) {
        // console.error(
        //   "Error fetching receiver's chats:",
        //   receiverFetchError.message,
        // );
        return;
      }

      let updatedChatsReceiver;

      if (Array.isArray(receiverChatData?.chats)) {
        // Check if the chat already exists
        const existingReceiverChatIndex = receiverChatData.chats.findIndex(
          (chat) => chat.receiverId === currentUser.id,
        );

        if (existingReceiverChatIndex >= 0) {
          // Update the existing chat
          updatedChatsReceiver = [...receiverChatData.chats];
          updatedChatsReceiver[existingReceiverChatIndex] = {
            ...updatedChatsReceiver[existingReceiverChatIndex],
            updatedAt: new Date().toISOString(),
          };
        } else {
          // Append a new chat
          updatedChatsReceiver = [
            ...receiverChatData.chats,
            {
              chatId,
              receiverId: currentUser.id,
              lastMessage: "",
              messages: [],
              updatedAt: new Date().toISOString(),
            },
          ];
        }
      } else {
        // Initialize chats if empty or null
        updatedChatsReceiver = [
          {
            chatId,
            receiverId: currentUser.id,
            lastMessage: "",
            messages: [],
            updatedAt: new Date().toISOString(),
          },
        ];
      }

      // Update the receiver's chats
      const { error: receiverUpdateError } = await supabase
        .from("userchats")
        .update({ chats: updatedChatsReceiver })
        .eq("id", user.id);

      if (receiverUpdateError) {
        // console.error(
        //   "Error updating receiver's chats:",
        //   receiverUpdateError.message,
        // );
        return;
      }

      // console.log("Receiver's chats updated successfully!");
      // console.log(
      //   "Chat added successfully between:",
      //   currentUser.id,
      //   "and",
      //   user.id,
      // );
    } catch (err) {
      console.error("Unexpected error adding chat:", err);
    }

    // Reset the user state after handling the chat creation
    setUser(null);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 top-0 m-auto h-max w-max">
      <div className="flex flex-col items-center gap-10 rounded-lg bg-[rgb(17,25,40)]/85 p-5 backdrop-blur-md">
        <h1 className="text-2xl font-semibold tracking-wide">Find friend</h1>
        <form className="flex gap-10" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Username"
            name="username"
            className="rounded-lg border-none p-2 text-black outline-none"
          />
          <button type="submit" className="rounded-lg bg-blue-500 p-2 px-3">
            Search
          </button>
        </form>
        {user && (
          <div className="flex w-full items-center justify-between gap-20">
            <div className="flex items-center gap-3">
              <img
                src={user.avatar || "assets/avatar.png"}
                alt={`${user.username}'s avatar`}
                onError={(e) => (e.target.src = "assets/avatar.png")}
                className="h-14 w-14 rounded-full"
              />
              <h3 className="text-md font-medium tracking-wide text-white">
                {user.username}
              </h3>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-500 p-2 px-3"
              onClick={handleAdd}
            >
              Add User
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUser;
