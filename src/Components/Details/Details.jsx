import { useChatStore } from "../../lib/chatStore";
import supabase from "../../lib/supabase";
import { useUserStore } from "../../lib/userStore";
import { useState, useEffect } from "react";

const Details = () => {
  const {
    
    user,
    isCurrentUserBlocked,
    isReceiverBlocked,
    changeBlock,
    resetChat,
  } = useChatStore();
  const { currentUser } = useUserStore();

  const handleBlock = async () => {
    if (!user) return;

    try {
      // Fetch the current blocked list of users
      const { data, error: fetchError } = await supabase
        .from("users")
        .select("blocked")
        .eq("id", currentUser.id)
        .single();

      if (fetchError) throw fetchError;

      let updatedBlockedList;

      if (isReceiverBlocked) {
        // Remove the user from the blocked list
        updatedBlockedList = data.blocked.filter((id) => id !== user.id);
      } else {
        // Add the user to the blocked list
        updatedBlockedList = [...data.blocked, user.id];
      }

      // Update the user's blocked list
      const { error: updateError } = await supabase
        .from("users")
        .update({ blocked: updatedBlockedList })
        .eq("id", currentUser.id);

      if (updateError) throw updateError;

      changeBlock();
    } catch (err) {
      console.error("Error updating block list:", err);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      resetChat();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const [sharedImages, setSharedImages] = useState([]);

  useEffect(() => {
    if (!user || !currentUser) return; // Exit if no chat user or current user is selected

    const fetchSharedImages = async () => {
      try {
        const { data, error } = await supabase
          .from("shared_images")
          .select("image_url, sender_id, receiver_id")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUser.id})`,
          )
          .order("timestamp", { ascending: true });

        if (error) throw error;

        setSharedImages(data);
      } catch (err) {
        console.error("Error fetching shared images:", err);
      }
    };

    fetchSharedImages();
  }, [user, currentUser]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="flex w-full flex-col items-center gap-[10px] border-b border-b-[#dddddd35] p-3">
        <img
          src={user?.avatar || "./avatar.png"}
          alt=""
          className="h-20 w-20 rounded-full object-cover"
        />
        <h3 className="text-lg font-bold tracking-wide">{user?.username}</h3>
      </div>
      <div className="flex h-full w-full flex-1 flex-col items-center justify-around gap-3 px-3 py-2">
        <div className="flex w-full items-center justify-between px-3">
          <div>
            <p className="text-sm">Chat Settings</p>
          </div>
          <div className="h-5 w-5 rounded-full bg-[rgb(17,25,40)]/50">
            <img
              src="./arrowUp.png"
              alt=""
              className="h-full w-full bg-transparent p-[6px]"
            />
          </div>
        </div>
        <div className="flex w-full items-center justify-between px-3">
          <div>
            <p className="text-sm">Privacy & help</p>
          </div>
          <div className="h-5 w-5 rounded-full bg-[rgb(17,25,40)]/50">
            <img
              src="./arrowUp.png"
              alt=""
              className="h-full w-full bg-transparent p-[6px]"
            />
          </div>
        </div>
        <div className="flex w-full flex-col">
          <div className="flex items-center justify-between px-3">
            <div>
              <p className="text-sm">Shared photos</p>
            </div>
            <div className="h-5 w-5 rounded-full bg-[rgb(17,25,40)]/50">
              <img
                src="./arrowDown.png"
                alt=""
                className="h-full w-full bg-transparent p-[6px]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-[10px] p-3">
            {sharedImages.map((image, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center justify-center gap-4">
                  <img
                    src={image.image_url}
                    alt="Shared"
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                  <h3 className="text-xs">
                    {image.sender_id === currentUser.id
                      ? "You sent this"
                      : "They sent this"}
                  </h3>
                </div>
                <div className="h-5 w-5 rounded-full bg-[rgb(17,25,40)]/50">
                  <img
                    src="./download.png"
                    alt=""
                    className="h-full w-full bg-transparent p-[6px]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full px-3">
          <button
            className="w-full rounded-md bg-red-400 p-[6px] text-center"
            onClick={handleBlock}
          >
            {isCurrentUserBlocked
              ? "You are Blocked!"
              : isReceiverBlocked
                ? "User blocked"
                : "Block User"}
          </button>
        </div>
      </div>
      <div className="flex w-full px-5 py-3">
        <button
          className="w-full rounded-md bg-blue-400 p-1 text-center"
          onClick={handleLogout}
        >
          logout
        </button>
      </div>
    </div>
  );
};

export default Details;
