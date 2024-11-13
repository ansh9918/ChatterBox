import { useState } from "react";
import { useUserStore } from "../../lib/userStore";
import supabase from "../../lib/supabase";

const AddUser = () => {
  const [user, setUser] = useState(null);

  const { currentUser } = useUserStore();

  const handleSearch = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get("username");

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (error) {
        console.error("Error finding user:", error);
      } else if (data) {
        setUser(data);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const handleAdd = async () => {
    try {
      // Create a new chat with initial data
      const { data: chat, error: chatError } = await supabase
        .from("chats")
        .insert([{ createdAt: new Date().toISOString(), messages: [] }])
        .select("id")
        .single();

      if (chatError) throw chatError;

      // Add chat reference to the other user
      const { error: addChatToUserError } = await supabase
        .from("userchats")
        .update({
          chats: supabase.rpc("array_append", {
            chats: {
              chatId: chat.id,
              lastMessage: "",
              receiverId: currentUser.id,
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .eq("id", user.id);

      if (addChatToUserError) throw addChatToUserError;

      // Add chat reference to the current user
      const { error: addChatToCurrentUserError } = await supabase
        .from("userchats")
        .update({
          chats: supabase.rpc("array_append", {
            chats: {
              chatId: chat.id,
              lastMessage: "",
              receiverId: user.id,
              updatedAt: new Date().toISOString(),
            },
          }),
        })
        .eq("id", currentUser.id);

      if (addChatToCurrentUserError) throw addChatToCurrentUserError;
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 top-0 m-auto h-max w-max">
      <div className="flex flex-col items-center gap-10 rounded-lg bg-[rgb(17,25,40)]/85 p-5 backdrop-blur-md">
        <h1 className="text-2xl font-semibold tracking-wide">Find friend</h1>
        <form className="flex gap-10">
          <input
            type="text"
            placeholder="Username"
            name="username"
            className="rounded-lg border-none p-2 outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-500 p-2 px-3"
            onClick={handleSearch}
          >
            Search
          </button>
        </form>
        <div className="flex w-full items-center justify-between gap-20">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar || "./avatar.png"}
              alt=""
              className="h-14 w-14 rounded-full"
            />
            <h3 className="text-sm">{user.username}</h3>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-500 p-2 px-3"
            onClick={handleAdd}
          >
            Add User
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddUser;
