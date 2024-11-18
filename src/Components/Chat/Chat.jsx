import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "../../lib/userStore";
import supabase from "../../lib/supabase";
import { useChatStore } from "../../lib/chatStore";
import { format, parseISO } from "date-fns"; // Corrected import
import upload from "../../lib/upload";
import imageCompression from "browser-image-compression";

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
      //console.log("Fetching chat messages for chatId:", chatId);

      const { data, error } = await supabase
        .from("userchats")
        .select("chats")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        //console.error("Error fetching chat messages:", error);
        return;
      }

      //console.log("Fetched userchats data:", data);

      // Find the chat object corresponding to chatId
      const currentChat = data.chats.find((c) => c.chatId === chatId);

      if (!currentChat) {
        //console.warn("No chat found for chatId:", chatId);
        setChat({ messages: [] }); // Default to empty messages
        return;
      }

      //console.log("Fetched chat object:", currentChat);
      setChat(currentChat);
    };

    fetchMessages();

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
          fetchMessages(); // Re-fetch chat on update
        },
      )
      .subscribe();

    return () => {
      //console.log("Unsubscribing from real-time updates.");
      supabase.removeChannel(subscription);
    };
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
      //console.log("originalFile instanceof Blob", file instanceof Blob); // true
      //console.log(`originalFile size ${file.size / 1024 / 1024} MB`);

      // Compression options
      const options = {
        maxSizeMB: 1, // Maximum file size in MB
        maxWidthOrHeight: 350, // Max width or height in pixels
        useWebWorker: true, // Use multi-threading (faster)
      };

      // Compress the file
      const compressedFile = await imageCompression(file, options);
      // console.log(
      //   "compressedFile instanceof Blob",
      //   compressedFile instanceof Blob,
      // ); // true
      // console.log(
      //   `compressedFile size ${compressedFile.size / 1024 / 1024} MB`,
      // );

      //console.log("Compressed file:", compressedFile);

      // Create a preview URL for the compressed image
      const compressedFileURL = URL.createObjectURL(compressedFile);

      setImg({
        file: compressedFile,
        url: compressedFileURL,
      });

      //console.log("Image compression successful!");
    } catch (error) {
      console.error("Error compressing the image:", error);
    }
  };

  // Handle sending a message
  const handleSend = async () => {
    if (!text.trim() && !img.file) return;

    let imgUrl = null;

    try {
      //console.log("Sending message...");

      // Handle image upload if an image is provided
      if (img.file) {
        imgUrl = await upload(img.file, currentUser.id);
        //console.log("Image URL:", imgUrl);
      }
      const newMessage = {
        senderId: currentUser.id, // ID of the sender
        text,
        createdAt: new Date().toISOString(),
        ...(imgUrl ? { img: imgUrl } : {}),
      };

      // Fetch chats for the current user
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

      //console.log("Message added to current user's chats.");

      // Fetch chats for the receiver
      const { data: receiverChats, error: receiverError } = await supabase
        .from("userchats")
        .select("chats")
        .eq("id", user.id)
        .single();

      if (receiverError) {
        //console.error("Error fetching receiver's chats:", receiverError);
        return;
      }

      // Update the chat messages for the receiver
      const updatedChatsForReceiver = receiverChats.chats.map((chat) => {
        if (chat.chatId === chatId) {
          return {
            ...chat,
            lastMessage: text,
            updatedAt: new Date().toISOString(),
            isSeen: false, // Mark as unseen for the receiver
            messages: [...(chat.messages || []), newMessage],
          };
        }
        return chat;
      });

      await supabase
        .from("userchats")
        .update({ chats: updatedChatsForReceiver })
        .eq("id", user.id);

      //console.log("Message added to receiver's chats.");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setImg({
        file: null,
        url: "",
      });
      setText("");
      // console.log("Message send process completed.");
    }
  };

  return (
    <div className="flex h-[100%] flex-2 flex-col border-r border-r-[#dddddd35]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-b-[#dddddd35] p-3 px-5">
        <div className="flex items-center gap-5">
          <img
            src={user?.avatar || "./avatar.png"}
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
            src="./phone.png"
            alt="Call"
            className="h-4 w-4 cursor-pointer"
          />
          <img
            src="./video.png"
            alt="Video Call"
            className="h-4 w-4 cursor-pointer"
          />
          <img src="./info.png" alt="Info" className="h-4 w-4 cursor-pointer" />
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
              }`}
            >
              {/* Sender's Avatar */}
              {!isCurrentUser && (
                <img
                  src={user?.avatar || "./avatar.png"}
                  alt="Sender Avatar"
                  className="h-5 w-5 rounded-full object-cover"
                />
              )}
              {/* Message Bubble */}
              <div
                className={`flex flex-col ${
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
                      ? "bg-purple-500 text-white"
                      : "bg-[rgb(17,25,40)]/30 text-white"
                  } ${message.text ? "block" : "hidden"}`}
                >
                  {message.text}
                </p>

                {/* Message Timestamp */}
                <span className="text-[11px] text-gray-500">
                  {message.createdAt
                    ? format(
                        parseISO(message.createdAt), // Parse the ISO string to a valid date
                        "PPpp",
                      )
                    : "Invalid date"}
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
              src="./img.png"
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
            src="./camera.png"
            alt="Camera"
            className="h-4 w-4 cursor-pointer"
          />
          <img
            src="./mic.png"
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
            src="./emoji.png"
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
