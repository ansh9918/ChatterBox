import { useUserStore } from "../../lib/userStore";

const UserInfo = () => {
  const { currentUser } = useUserStore();
  return (
    <div className="flex items-center justify-between p-5">
      {currentUser ? (
        <>
          <div className="flex items-center justify-center gap-3">
            <img
              src={currentUser.avatar || "/assets/avatar.png"}
              alt="Avatar"
              className="h-12 w-12 rounded-full object-cover"
            />
            <h1 className="text-md text-center font-bold">
              {currentUser.username}
            </h1>
          </div>
          <div className="flex items-center justify-center gap-5">
            <img
              src="/assets/more.png"
              alt="More"
              className="h-4 w-4 cursor-pointer"
            />
            <img
              src="/assets/video.png"
              alt="Video"
              className="h-4 w-4 cursor-pointer"
            />
            <img
              src="/assets/edit.png"
              alt="Edit"
              className="h-4 w-4 cursor-pointer"
            />
          </div>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default UserInfo;
