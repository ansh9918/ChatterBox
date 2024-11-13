import EmojiPicker from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "../../lib/userStore";
import supabase from "../../lib/supabase";
import { useChatStore } from "../../lib/chatStore";
import { format } from "prettier";
import uploadWithProgress from "../../lib/upload";

const Chat = () => {
  const [emoji, setEmoji] = useState(false);
  const [chat, setChat] = useState();

  const [text, setText] = useState("");
  const [img, setImg] = useState({
    file: null,
    url: "",
  });

  const { currentUser } = useUserStore();
  const { chatId, user, isCurrentUserBlocked, isReceiverBlocked } =
    useChatStore();
  const toggleComponentVisibility = useUserStore(
    (state) => state.toggleComponentVisibility,
  );

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("id", chatId);

      if (error) console.error("Error fetching chat messages:", error);
      else setChat(data[0]);
    };

    fetchMessages();

    const subscription = supabase
      .channel("public:chats:id=eq." + chatId)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chats" },
        (payload) => {
          setChat(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [chatId]);

  const handleEmoji = (e) => {
    setText((prev) => prev + e.emoji);
    setEmoji(false);
  };

  const handleImg = (e) => {
    if (e.target.files[0]) {
      setImg({
        file: e.target.files[0],
        url: URL.createObjectURL(e.target.files[0]),
      });
    }
  };

  const handleSend = async () => {
    if (text === "") return;

    let imgUrl = null;

    try {
      if (img.file) {
        imgUrl = await uploadWithProgress(img.file);
      }

      // Add message to the chat
      const newMessage = {
        sender_id: currentUser.id,
        text,
        created_at: new Date(),
        ...(imgUrl && { img: imgUrl }),
      };

      const { error } = await supabase
        .from("chats")
        .update({ messages: [...(chat.messages || []), newMessage] })
        .eq("id", chatId);

      if (error) throw error;

      // Update userchats metadata
      const userIDs = [currentUser.id, user.id];
      userIDs.forEach(async (id) => {
        const { data, error } = await supabase
          .from("userchats")
          .select("chats")
          .eq("user_id", id)
          .single();

        if (error) throw error;

        const userChats = data.chats;
        const chatIndex = userChats.findIndex((c) => c.chat_id === chatId);

        if (chatIndex !== -1) {
          userChats[chatIndex] = {
            ...userChats[chatIndex],
            last_message: text,
            is_seen: id === currentUser.id,
            updated_at: new Date(),
          };

          const { error: updateError } = await supabase
            .from("userchats")
            .update({ chats: userChats })
            .eq("user_id", id);

          if (updateError)
            console.error("Error updating user chat:", updateError);
        }
      });
    } catch (err) {
      console.log("Error sending message:", err);
    } finally {
      setImg({
        file: null,
        url: "",
      });
      setText("");
    }
  };

  return (
    <div className="flex h-[100%] flex-2 flex-col border-r border-r-[#dddddd35]">
      <div className="flex items-center justify-between border-b border-b-[#dddddd35] p-3 px-5">
        <div className="flex items-center justify-start gap-5">
          <img
            src={user?.avatar || "./avatar.png"}
            alt=""
            className="h-12 w-12 rounded-full"
          />
          <div className="flex flex-col gap-[6px]">
            <h3 className="text-sm font-medium tracking-wide">
              {user?.username}
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <img src="./phone.png" alt="" className="h-4 w-4 cursor-pointer" />
          <img src="./video.png" alt="" className="h-4 w-4 cursor-pointer" />
          <img
            src="info.png"
            alt=""
            className="h-4 w-4 cursor-pointer"
            onClick={toggleComponentVisibility}
          />
        </div>
      </div>
      <div className="center flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        {chat?.messages?.map((message) => (
          <div
            className={
              message.senderId === currentUser?.id
                ? "message-own max-w-[70%] self-end"
                : "message flex max-w-[70%] gap-3"
            }
            key={message?.createAt}
          >
            <img
              src="./avatar.png"
              alt=""
              className={
                message.senderId === currentUser?.id
                  ? "hidden"
                  : "h-5 w-5 rounded-full"
              }
            />
            <div className="flex flex-col gap-2">
              {message.img && <img src={message.img} alt="" />}
              <p
                className={
                  message.senderId === currentUser?.id
                    ? "rounded-lg bg-purple-500 p-3 text-sm"
                    : "rounded-lg bg-[rgb(17,25,40)]/30 p-3 text-sm"
                }
              >
                {message.text}
              </p>
              <span className="text-[11px]">
                {format(message.createdAt.toDate())}
              </span>
            </div>
          </div>
        ))}

        <div ref={endRef}></div>
      </div>
      <div className="bottom mt-auto flex items-center justify-between gap-5 border-t border-t-[#dddddd35] p-4">
        <div className="flex items-center justify-center gap-5">
          <label htmlFor="">
            <img src="./img.png" alt="" className="h-4 w-4 cursor-pointer" />
          </label>
          <input
            type="file"
            id="file"
            style={{ display: "none" }}
            onChange={handleImg}
          />
          <img src="./camera.png" alt="" className="h-4 w-4 cursor-pointer" />
          <img src="./mic.png" alt="" className="h-4 w-4 cursor-pointer" />
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
            alt=""
            className="h-4 w-4 cursor-pointer"
            onClick={() => setEmoji((emoji) => !emoji)}
          />
          <div className="absolute bottom-10 left-0">
            <EmojiPicker open={emoji} onEmojiClick={handleEmoji} />
          </div>
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
