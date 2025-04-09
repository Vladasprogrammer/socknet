import { useContext } from "react";
import Data from "../../Context/Data";
import UserInList from "./UserInList";

export default function UserList() {

  const { users } = useContext(Data);

  if (null === users) {
    return (
      <div className="bin bin-30">
        <h1>Siunčiami Vartotojaj...</h1>
      </div>
    )
  }

  return (
    <div className="bin bin-30">
      <h1>Sock-net prisijunge nariai</h1>
      <ul className="users-list">
        {
          users.map(u => <UserInList key={u.id} user={u} />)
        }
      </ul>
    </div>
  )
}