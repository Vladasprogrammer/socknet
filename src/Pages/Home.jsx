import PostsList from '../Components/Posts/PostsList';
import UserList from '../Components/Users/UserList';

export default function Home() {
  
  return (
    <section className='main'>
      <UserList />
      <PostsList />
    </section>
  )
}