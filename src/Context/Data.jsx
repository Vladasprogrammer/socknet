import { createContext } from 'react';
import useUsers from '../Hooks/useUsers';
import usePosts from '../Hooks/usePosts';
import useComments from '../Hooks/useComments';

const Data = createContext();

export const DataProvider = ({ children }) => {

  const { users, dispatchUsers } = useUsers();
  const { posts, dispatchPosts, setPostUpdate, setStorePost } = usePosts();
  const { comments, dispatchComments, getPostCommentsFromServer, setCom, deletePostCommentsFromServer} = useComments();
  
  return (
    <Data.Provider value={{
      users, dispatchUsers,
      posts, dispatchPosts, setPostUpdate, setStorePost,
      comments, dispatchComments, getPostCommentsFromServer, setCom, deletePostCommentsFromServer
    }}>
      {children}
    </Data.Provider>
  )
}

export default Data;


