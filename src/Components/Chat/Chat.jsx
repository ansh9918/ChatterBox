import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "../../lib/userStore";
import supabase from "../../lib/supabase";
import { useChatStore } from "../../lib/chatStore";
import upload from "../../lib/upload";
import imageCompression from "browser-image-compression";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);

const Chat = () => {
  const [emoji, setEmoji] = useState(false); // Controls emoji picker visibility
  const [chat, setChat] = useState(null); // Current chat object
  const [text, setText] = useState(""); // Current input text
  const [img, setImg] = useState({
    file: null,
    url: "",
  });

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore(); // Get chat ID and user details

  const endRef = useRef(null); // For scrolling to the latest message

  // Auto-scroll to the last message when chat messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.messages]);

  // Fetch chat details and set up real-time updates
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("userchats")
        .select("chats")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        return;
      }

      // Find the chat object corresponding to chatId
      const currentChat = data.chats.find((c) => c.chatId === chatId);

      if (!currentChat) {
        setChat({ messages: [] }); // Default to empty messages
        return;
      }

      setChat(currentChat);
    };
    fetchMessages();
    const subscribeToMessages = () => {
      const subscription = supabase
        .channel("public:userchats")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "userchats" },
          (payload) => {
            console.log("Real-time message received:", payload);
            fetchMessages(); // Re-fetch messages to update the UI
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    };

    subscribeToMessages();
  }, [currentUser.id, chatId]);

  // Handle emoji selection
  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    // Append emoji to text input
    setEmoji(false); // Close emoji picker
  };

  // Handle image selection
  const handleImg = async (e) => {
    try {
      // Original file
      const file = e.target.files[0];

      // Compression options
      const options = {
        maxSizeMB: 1, // Maximum file size in MB
        maxWidthOrHeight: 200, // Max width or height in pixels
        useWebWorker: true, // Use multi-threading (faster)
      };

      // Compress the file
      const compressedFile = await imageCompression(file, options);

      // Create a preview URL for the compressed image
      const compressedFileURL = URL.createObjectURL(compressedFile);

      setImg({
        file: compressedFile,
        url: compressedFileURL,
      });
    } catch (error) {
      console.error("Error compressing the image:", error);
    }
  };

  const handleSend = async () => {
    if (text.trim() === "" && !img.file) return;

    let imgUrl = null;

    try {
      if (img.file) {
        imgUrl = await upload(img.file, currentUser.id);
      }

      const newMessage = {
        senderId: currentUser.id,
        text: text.trim() || "Image",
        createdAt: new Date().toISOString(),
        ...(imgUrl && { img: imgUrl }),
      };

      // Optimistically update UI
      // setChat((prevChat) => ({
      //   ...prevChat,
      //   messages: [...prevChat.messages, newMessage],
      // }));

      // Fetch current user's chats
      const { data: currentUserChats, error: currentUserError } = await supabase
        .from("userchats")
        .select("chats")
        .eq("id", currentUser.id)
        .single();

      if (currentUserError) {
        //console.error("Error fetching current user's chats:", currentUserError);
        return;
      }

      // Update the chat messages for the current user
      const updatedChatsForCurrentUser = currentUserChats.chats.map((chat) => {
        if (chat.chatId === chatId) {
          return {
            ...chat,
            lastMessage: text,
            updatedAt: new Date().toISOString(),
            messages: [...(chat.messages || []), newMessage],
          };
        }
        return chat;
      });

      await supabase
        .from("userchats")
        .update({ chats: updatedChatsForCurrentUser })
        .eq("id", currentUser.id);

      console.log("Successfully updated current user's chats.");

      // Fetch receiver's chats
      const { data: recieverChats, error: receiverError } = await supabase
        .from("userchats")
        .select("chats")
        .eq("id", user.id)
        .single();

      if (receiverError) {
        console.error("Error fetching receiver's chats:", receiverError);
        return;
      }

      const updatedChatsForReciever = recieverChats.chats.map((chat) => {
        if (chat.chatId === chatId) {
          return {
            ...chat,
            lastMessage: text,
            updatedAt: new Date().toISOString(),
            messages: [...(chat.messages || []), newMessage],
          };
        }
        return chat;
      });

      await supabase
        .from("userchats")
        .update({ chats: updatedChatsForReciever })
        .eq("id", user.id);

      console.log("Successfully updated receiver's chats.");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      // Reset input fields
      setImg({ file: null, url: "" });
      setText("");
    }
  };

  return (
    <div className="flex h-[100%] flex-2 flex-col border-r border-r-[#dddddd35]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-b-[#dddddd35] p-3 px-5">
        <div className="flex items-center gap-5">
          <img
            src={user?.avatar || "assets/avatar.png"}
            alt="User Avatar"
            className="h-12 w-12 rounded-full object-cover"
          />
          <div className="flex flex-col gap-[6px]">
            <h3 className="text-sm font-medium tracking-wide">
              {user?.username || "Unknown User"}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <img
            src="assets/phone.png"
            alt="Call"
            className="h-4 w-4 cursor-pointer"
          />
          <img
            src="assets/video.png"
            alt="Video Call"
            className="h-4 w-4 cursor-pointer"
          />

          <img
            src="assets/info.png"
            alt="Info"
            className="h-4 w-4 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {chat?.messages?.map((message, index) => {
          const isCurrentUser = message.senderId === currentUser?.id;

          return (
            <div
              key={index}
              className={`flex gap-3 ${
                isCurrentUser ? "justify-end" : "justify-start"
              } `}
            >
              {/* Sender's Avatar */}
              {!isCurrentUser && (
                <img
                  src={user?.avatar || "assets/avatar.png"}
                  alt="Sender Avatar"
                  className="h-5 w-5 rounded-full object-cover"
                />
              )}
              {/* Message Bubble */}
              <div
                className={`flex max-w-[70%] flex-col ${
                  isCurrentUser ? "items-end" : "items-start"
                }`}
              >
                {/* Message Image */}
                {message.img && (
                  <img
                    src={message.img}
                    alt="Message Attachment"
                    className="max-w-[200px] rounded-lg"
                  />
                )}
                {/* Message Text */}

                <p
                  className={`rounded-lg p-3 text-sm ${
                    isCurrentUser
                      ? "bg-blue-500 text-white"
                      : "bg-gray-500/50 text-white"
                  } ${message.text ? "block" : "hidden"}`}
                >
                  {message.text}
                </p>

                {/* Message Timestamp */}
                <span className="text-[11px] text-gray-500">
                  {dayjs(message.createdAt).fromNow()}
                </span>
              </div>
            </div>
          );
        })}
        {/* Scroll-to-Bottom Ref */}
        <div ref={endRef}></div>
      </div>

      {/* Input Controls */}
      <div className="bottom mt-auto flex items-center justify-between gap-5 border-t border-t-[#dddddd35] p-4">
        <div className="flex items-center gap-5">
          <label htmlFor="file">
            <img
              src="assets/img.png"
              alt="Attach Image"
              className="h-4 w-4 cursor-pointer"
            />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
          />
          <img
            src="assets/camera.png"
            alt="Camera"
            className="h-4 w-4 cursor-pointer"
          />
          <img
            src="assets/mic.png"
            alt="Microphone"
            className="h-4 w-4 cursor-pointer"
          />
        </div>
        <input
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : "Type a message..."
          }
          className="flex-1 rounded-md border-none bg-[rgb(17,25,40)]/50 p-2 px-4 text-white outline-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        />
        <div className="relative">
          <img
            src="assets/emoji.png"
            alt="Emoji Picker"
            className="h-4 w-4 cursor-pointer"
            onClick={() => setEmoji((emoji) => !emoji)}
          />
          {emoji && (
            <div className="absolute bottom-10 left-0">
              <EmojiPicker onEmojiClick={handleEmoji} />
            </div>
          )}
        </div>
        <button
          className="rounded-md bg-[#5183fe] p-1 px-3"
          onClick={handleSend}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
