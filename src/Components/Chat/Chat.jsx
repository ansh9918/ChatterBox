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
  const [emoji, setEmoji] = useState(false);
  const [imageView, setImageView] = useState(false);
  const [chat, setChat] = useState({ messages: [] }); // Current chat object
  const [text, setText] = useState(""); // Current input text
  const [img, setImg] = useState({
    file: null,
    url: "",
  });
  const { currentUser } = useUserStore();
  const switchComponent = useUserStore((state) => state.switchComponent);
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore(); // Get chat ID and user details

  const endRef = useRef(null); // For scrolling to the latest message

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("userchats")
        .select("chats")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      const currentChat = data.chats.find((c) => c.chatId === chatId);
      if (currentChat) {
        setChat(currentChat);
      }
    };

    // Real-time subscription for updates
    const subscription = supabase
      .channel("public:userchats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "userchats" },
        (payload) => {
          const updatedChat = payload.new.chats.find(
            (c) => c.chatId === chatId,
          );

          if (updatedChat) {
            setChat((prevChat) => ({
              ...prevChat,
              messages: [
                ...(prevChat.messages || []),
                ...updatedChat.messages.slice(prevChat.messages.length),
              ],
            }));
          }
        },
      )
      .subscribe();

    // Initial fetch
    fetchMessages();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [currentUser.id, chatId]);

  useEffect(() => {
    if (chat?.messages?.length) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chat?.messages]);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    // Append emoji to text input
    setEmoji(false); // Close emoji picker
  };

  // Handle image selection
  const handleImg = async (e) => {
    try {
      setImageView(true);
      // Original file
      const file = e.target.files[0];

      // Compression options
      const options = {
        maxSizeMB: 1, // Maximum file size in MB
        maxWidthOrHeight: 350, // Max width or height in pixels
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

      e.target.value = null;
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
        text: text.trim(),
        createdAt: new Date().toISOString(),
        ...(imgUrl && { img: imgUrl }),
      };

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
      setImageView(false);
      console.log(imageView);
      setImg({ file: null, url: "" });
      setText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex h-[100%] flex-2 flex-col border-r border-r-[#dddddd35]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-b-[#dddddd35] p-3 px-4 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            className="text-xl font-semibold md:hidden"
            onClick={() => switchComponent("chatList")}
          >
            ←
          </button>
          <img
            src={user?.avatar || "/assets/avatar.png"}
            alt="User Avatar"
            className="h-10 w-10 rounded-full object-cover sm:h-12 sm:w-12"
          />
          <div className="flex flex-col gap-1 sm:gap-[6px]">
            <h3 className="sm:text-md text-md font-medium tracking-wide text-white">
              {user?.username || "Unknown User"}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <img
            src="/assets/phone.png"
            alt="Call"
            className="h-4 w-4 cursor-pointer"
          />
          <img
            src="/assets/video.png"
            alt="Video Call"
            className="h-4 w-4 cursor-pointer"
          />
          <img
            src="/assets/info.png"
            alt="Info"
            className="h-4 w-4 cursor-pointer"
            onClick={() => switchComponent("Details")}
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {chat?.messages?.map((message, index) => {
          const isCurrentUser = message.senderId === currentUser?.id;

          return (
            <div
              key={index}
              className={`flex gap-2 sm:gap-3 ${
                isCurrentUser ? "justify-end" : "justify-start"
              }`}
            >
              {/* Sender's Avatar */}
              {!isCurrentUser && (
                <img
                  src={user?.avatar || "/assets/avatar.png"}
                  alt="Sender Avatar"
                  className="h-4 w-4 rounded-full object-cover sm:h-5 sm:w-5"
                />
              )}
              {/* Message Bubble */}
              <div
                className={`flex max-w-[80%] flex-col sm:max-w-[70%] ${
                  isCurrentUser ? "items-end" : "items-start"
                }`}
              >
                {/* Message Image */}
                {message.img && (
                  <img
                    src={message.img}
                    alt="Message Attachment"
                    className="max-w-[150px] rounded-lg sm:max-w-[200px]"
                  />
                )}
                {/* Message Text */}
                <p
                  className={`rounded-lg p-2 text-xs sm:p-3 sm:text-sm ${
                    isCurrentUser
                      ? "bg-blue-500 text-white"
                      : "bg-gray-500/50 text-white"
                  } ${message.text ? "block" : "hidden"}`}
                >
                  {message.text}
                </p>

                {/* Message Timestamp */}
                <span className="text-[10px] text-gray-500 sm:text-[11px]">
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
      <div className="bottom mt-auto flex items-center justify-between border-t border-t-[#dddddd35] p-3 sm:gap-5 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="relative">
            <label htmlFor="file">
              <img
                src="/assets/img.png"
                alt="Attach Image"
                className="h-4 w-4 cursor-pointer"
              />
            </label>
            <input
              type="file"
              id="file"
              accept="image/*"
              className="hidden"
              onChange={handleImg}
            />
            {imageView ? (
              <div className="absolute bottom-7 h-52 w-60 rounded-lg border-2 border-gray-500 bg-[rgb(17,25,40)] p-3">
                <img
                  src={img.url}
                  alt="Preview"
                  className="h-full rounded-lg"
                />
              </div>
            ) : null}
          </div>
        </div>
        <input
          type="text"
          placeholder={
            isCurrentUserBlocked || isReceiverBlocked
              ? "You cannot send a message"
              : "Type a message..."
          }
          className="rounded-md border-none bg-[rgb(17,25,40)]/50 p-2 px-3 text-xs text-white outline-none sm:px-4 sm:text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isCurrentUserBlocked || isReceiverBlocked}
        />
        <div className="relative">
          <img
            src="/assets/emoji.png"
            alt="Emoji Picker"
            className="h-4 w-4 cursor-pointer"
            onClick={() => setEmoji((emoji) => !emoji)}
          />
          {emoji && (
            <div className="absolute -right-5 bottom-7 z-10 mx-auto">
              <EmojiPicker
                onEmojiClick={handleEmoji}
                height={350}
                width={250}
              />
            </div>
          )}
        </div>
        <button
          className="rounded-md bg-[#5183fe] p-1 px-3 text-xs sm:text-sm"
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
