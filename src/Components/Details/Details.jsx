import { useEffect, useState } from "react";
import { useChatStore } from "../../lib/chatStore";
import supabase from "../../lib/supabase";
import { useUserStore } from "../../lib/userStore";

const Details = () => {
  const [showDiv, setShowDiv] = useState(false);
  const [sharedImages, setSharedImages] = useState([]);
  const [modalImage, setModalImage] = useState(""); // For storing the image to display in a modal
  const [showModal, setShowModal] = useState(false);

  const {
    user,
    chatId,
    isCurrentUserBlocked,
    isReceiverBlocked,
    changeBlock,
    resetChat,
  } = useChatStore();
  const { currentUser } = useUserStore();
  const handleImageClick = (imgUrl) => {
    setModalImage(imgUrl);
    setShowModal(true);
  };
  useEffect(() => {
    const fetchSharedImages = async () => {
      console.log("Fetching shared images for chatId:", chatId);

      const { data, error } = await supabase
        .from("userchats")
        .select("chats")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        console.error("Error fetching shared images:", error);
        return;
      }

      console.log("Fetched userchats data:", data);

      // Find the chat object corresponding to chatId
      const currentChat = data.chats.find((c) => c.chatId === chatId);

      if (!currentChat) {
        console.warn("No chat found for chatId:", chatId);
        setSharedImages([]); // Default to no shared images
        return;
      }

      // Extract shared images from messages
      const images = currentChat.messages.filter((message) => message.img);

      console.log("Shared images:", images);
      setSharedImages(images);
    };

    fetchSharedImages();

    // Real-time subscription to userchats updates
    const subscription = supabase
      .channel("public:userchats")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "userchats",
          filter: `id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log("Real-time update received:", payload);
          fetchSharedImages(); // Re-fetch shared images on update
        },
      )
      .subscribe();

    return () => {
      console.log("Unsubscribing from real-time updates.");
      supabase.removeChannel(subscription);
    };
  }, [currentUser.id, chatId]);

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
            <div
              className="h-5 w-5 rounded-full bg-[rgb(17,25,40)]/50"
              onClick={() => setShowDiv((prev) => !prev)}
            >
              <img
                src="./arrowDown.png"
                alt=""
                className="h-full w-full bg-transparent p-[6px]"
              />
            </div>
          </div>
          {showDiv && (
            <div className="mt-3 max-h-[200px] gap-2 overflow-y-auto px-3 transition-all duration-300">
              <div className="mt-3 grid grid-cols-2 gap-2">
                {sharedImages.map((image, index) => (
                  <img
                    key={index}
                    src={image.img}
                    alt="Shared"
                    className="h-12 w-12 cursor-pointer rounded-md object-cover"
                    onClick={() => handleImageClick(image.img)} // Optional: enlarge or open in modal
                  />
                ))}
              </div>
            </div>
          )}
          {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <img
                src={modalImage}
                alt="Full View"
                className="max-h-full max-w-full rounded-md"
              />
              <button
                className="absolute right-4 top-4 text-2xl text-white"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
          )}
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
