import { useEffect, useReducer, useState } from "react";
import * as C from '../Constants/main';
import * as A from '../Constants/actions';
import axios from 'axios';
import commentsReducer from "../Reducers/commentsReducer";

export default function useComments() {

  const [comments, dispatchComments] = useReducer(commentsReducer, []); // cia yra aprasytas steitas

  const [com, setCom] = useState(null);

  const revertSmiles = content => {
    C.smiles.forEach(s => {
      content = content.replace(s[1], s[0]);
    });
    return content;
  };

  const createSmiles = content => {
    C.smiles.forEach(s => {
      content = content.replace(s[0], s[1]);
    });
    return content;
  };

  useEffect(_ => {
    if (null === com) {
      return;
    }
    axios.post(C.SERVER_URL + 'comments/create/' + com.postID, { content: revertSmiles(com.content) }, { withCredentials: true })
      .then(res => {
        console.log(res.data);
      })
      .catch(error => {
        console.log(error);
      })
  }, [com]);

  const getPostCommentsFromServer = postID => {
    axios.get(C.SERVER_URL + 'comments/for-post/' + postID, { withCredentials: true })
      .then(res => {
        console.log(res.data);

        dispatchComments({
          type: A.LOAD_POST_COMMENTS,
          payload: {
            postID,
            comments: res.data.c.map(s => ({ ...s, content: createSmiles(s.content) }))
          }
        });
      })
      .catch(error => {
        console.log(error);
      });
  };

  const deletePostCommentsFromServer = (commentID, admin = false) => {

    const url = admin ? 'admin/comments/delete/' : 'comments/delete/'
    
    axios.post(C.SERVER_URL + url + commentID, {}, { withCredentials: true })
    .then(res => {
      console.log(res.data);
    })
    .catch(error => {
      console.log(error);
    });
  }

  return { comments, dispatchComments, getPostCommentsFromServer, setCom, deletePostCommentsFromServer };
}