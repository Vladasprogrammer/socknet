import { useEffect, useReducer } from 'react';
import * as C from '../Constants/main';
import * as A from '../Constants/actions';
import axios from 'axios';
import usersReducer from '../Reducers/usersReducer';


export default function useUsers() {

  const [users, dispatchUsers] = useReducer(usersReducer, null);


  useEffect(_ => {
    axios.get(C.SERVER_URL + 'users/active-list')
    .then(res => {
      dispatchUsers({
        type: A.LOAD_ACTIVE_USERS_FROM_SERVER,
        payload: res.data.db
      });
    })
    .catch(error => {
      console.log(error);
    });
  }, []);

  return {users, dispatchUsers}
}