import Chatlist from "./Chatlist";
import UserInfo from "./UserInfo";

const List = () => {
  return (
    <div className="flex-1 flex-col border-r-[1px] border-r-[#dddddd35]">
      <UserInfo />
      <Chatlist />
    </div>
  );
};

export default List;
