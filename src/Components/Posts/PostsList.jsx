import { useContext } from "react"
import Data from "../../Context/Data"
import PostInList from "./PostInList";

export default function PostsList() {

  const { posts } = useContext(Data);

  if (null === posts) {
    return (
      <div className="bin bin-70">
        <h1>Siunčiami Postai...</h1>
      </div>
    )
  }

  return (
    <div className="bin bin-70">
      <h1>Sock-net</h1>
      <ul className="posts-list">
        {
          posts.map(p => <PostInList key={p.id} post={p} />)
        }
      </ul>
    </div>
  );
}