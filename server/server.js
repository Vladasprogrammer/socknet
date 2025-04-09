import express from 'express';
import mysql from 'mysql';
import cors from 'cors';
import md5 from 'md5';
import cookieParser from 'cookie-parser';
import { v4 } from 'uuid';
import fs from 'node:fs';

const app = express();
const PORT = 3333;
const FRONTEND_URL = 'http://localhost:5173';
const POSTS_PER_PAGE = 8;
const serverURL = `http://localhost:${PORT}`; // As taip isivaizduoju kad mano hostas keisis kazkaip kazkaada, bet kolkas no idea why I see this.

app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

// Database Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sock_net'
});

db.connect(err => {
  if (err) console.log('Klaida prisijungiant prie DB', err);
  else console.log('Prisijungimas prie DB buvo sėkmingas');
});

const error500 = (res, err) => res.status(500).json(err);
const error400 = (res, customCode = 0) => res.status(400).json({
  msg: { type: 'error', text: 'Invalid request. Code:' + customCode }
})
const error401 = (res, message) => res.status(401).json({
  msg: { type: 'error', text: message }
})

// Identifikacija - pagal numatyta ID identifikuojam vartotoja, pvz. Ragana-su-sluota
// Autorizacija - pagal vartotojo identifikuota ID, vartotojui suteikiamos teises, pvz. gali balsuoti, pirkti cigaretes
// Autentifikacija - pagal numatyta ID autentifikuojam vartotoja, pvz. Vladislav Voronin  a/k 8888888888


const saveImageAsFile = imageBase64String => {
  if (!imageBase64String) {
    return null;
  }

  let type, image;

  if (imageBase64String.indexOf('data:image/png;base64,') === 0) {
    type = 'png';
    image = Buffer.from(imageBase64String.replace(/^data:image\/png;base64,/, ''), 'base64');
  } else if (imageBase64String.indexOf('data:image/jpeg;base64,') === 0) {
    type = 'jpg';
    image = Buffer.from(imageBase64String.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
  } else if (imageBase64String.indexOf('data:image/webp;base64,') === 0) {
    type = 'webp';
    image = Buffer.from(imageBase64String.replace(/^data:image\/webp;base64,/, ''), 'base64');
  }
  else {
    error400('Bad image format 1255');
    return;
  }

  const fileName = md5(v4()) + '.' + type;

  fs.writeFileSync('public/upload/' + fileName, image);

  return fileName;

}


// Auth middleware
app.use((req, res, next) => {
  const token = req.cookies['sock-net-token'] || 'no-token';
  const sql = `
    SELECT u.id, u.role, u.name, u.avatar
    FROM sessions AS s
    INNER JOIN users AS u
    ON s.user_id = u.id
    WHERE token = ?
  `;
  db.query(sql, [token], (err, result) => {
    if (err) return error500(res, err);

    if (result.length === 0) {
      req.user = {
        role: 'guest',
        name: 'Guest',
        id: 0,
        avatar: null
      }
    } else {
      req.user = {
        role: result[0].role,
        name: result[0].name,
        id: result[0].id,
        avatar: result[0].avatar
      }
    }

    const regex = /^\/admin\//;
    const find = req.path.search(regex);

    if (-1 !== find) {
      if ('admin' !== result[0].role) {
        error401(res, 'Please login as Admin.');
        return;
      }
    }

    next();
  });
});

// User Authentication
app.post('/login', (req, res) => {
  const { name, password } = req.body;
  const sql = 'SELECT * FROM users WHERE name = ? AND password = ?';
  db.query(sql, [name, md5(password)], (err, result) => {
    if (err) return error500(res, err);
    if (result.length === 0) {
      return error401(res, 'Invalid user name or password');
    }
    const token = md5(v4());
    const userId = result[0].id;

    let time = new Date();
    time = time.setMinutes(time.getMinutes() + (60 * 24));
    time = new Date(time);
    console.log('User login attempt:', name);

    const insertSql = `
      INSERT INTO sessions
      (user_id, token, valid_until)
      VALUES (?, ?, ?)
    `;

    db.query(insertSql, [userId, token, time], (err) => {
      if (err) return error500(res, err);
      res.cookie('sock-net-token', token, { httpOnly: true, SameSite: 'none', secure: true });
      res.status(200).json({
        msg: { type: 'success', text: `Hello, ${result[0].name}! Welcome aboard.` },
        user: {
          role: result[0].role,
          name: result[0].name,
          id: result[0].id,
          avatar: result[0].avatar
        }
      });
    });
  });
});

// TODO Paimti is middleware 
app.get('/auth-user', (req, res) => {
  setTimeout(_ => {
    res.json(req.user);
  }, 1000);
});

// Logout
app.post('/logout', (req, res) => {
  setTimeout(_ => {
    const token = req.cookies['sock-net-token'] || 'no-token';

    const sql = `
      DELETE FROM sessions
      WHERE token = ?
    `;
    db.query(sql, [token], (err) => {
      if (err) return error500(res, err);
      res.clearCookie('sock-net-token');
      res.status(200).json({
        msg: { type: 'success', text: `Bye bye!` },
        user: {
          role: 'guest',
          name: 'Guest',
          id: 0,
          avatar: null
        }
      });
    });
  }, 2000);
});

// Get Active Users
app.get('/users/active-list', (req, res) => {

  setTimeout(_ => {
    const sql = `
      SELECT id, name, avatar, role AS userRole, online
      FROM users
      -- WHERE role <> 'bot'
      ORDER BY online DESC, (CASE WHEN role = 'bot' THEN 1 ELSE 0 END), name
    `;

    db.query(sql, (err, result) => {
      if (err) return error500(res, err)
      res.json({ success: true, db: result });
    });
  }, 2000);
});

// Load Posts
app.get('/posts/load-posts/:page', (req, res) => {
  const page = parseInt(req.params.page);
  setTimeout(_ => {
    const sql = `
      SELECT p.id, p.content, p.created_at AS postDate, p.votes, u.name, u.avatar, i.url AS mainImage
      FROM posts AS p
      INNER JOIN users AS u
      ON u.id = p.user_id
      INNER JOIN images AS i
      ON p.id = i.post_id AND i.main = 1
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;

    db.query(sql, [POSTS_PER_PAGE, (page - 1) * POSTS_PER_PAGE], (err, result) => {
      if (err) return error500(res, err)
      result = result.map(r => (
        {
          ...r,
          votes: JSON.parse(r.votes),
          mainImage: r.mainImage.indexOf('http') === 0 ? r.mainImage : FRONTEND_URL + '/upload/' + r.mainImage
        }
      ));

      // neveikia post mygtukas, reikia pataisyti,
      // dar plius zlugsta serveris nuo to mainImage, reikia pataisyti ji...


      res.json({
        success: true,
        db: result
      });
    });
  }, 1500);
});

app.post('/posts/new', (req, res) => {
  setTimeout(_ => {

    const content = req.body.text;
    const created_at = new Date();
    const updated_at = new Date();
    const votes = JSON.stringify({ l: [], d: [] });
    const user_id = req.user.id;
    const uuid = req.body.uuid;

    const sql1 = `
      INSERT INTO posts
      (content, created_at, updated_at, votes, user_id)
      VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql1, [content, created_at, updated_at, votes, user_id], (err, result) => {
      if (err) return error500(res, err);
      const postID = result.insertId;

      const dbImages = [];

      req.body.images.forEach(img => {
        const fileName = saveImageAsFile(img.src);
        const dbImage = {
          url: fileName,
          post_id: postID,
          main: img.main ? 1 : 0
        }
        dbImages.push(dbImage);
      });

      const sql2 = `
      INSERT INTO images
      (url, post_id, main)
      VALUES ?
    `;

      db.query(sql2, [dbImages.map(i => [i.url, i.post_id, i.main])], (err, result) => {
        if (err) return error500(res, err)

        res.json({
          id: postID,
          uuid,
          success: true,
          msg: {
            type: 'success',
            text: 'You are nice'
          }
        });
      });
    });
  }, 3000)
});

app.post('/posts/update/:id', (req, res) => {
  const postID = parseInt(req.params.id); // postID
  if (isNaN(postID)) {
    error400(res, '5788 Invalid Post ID');
    return;
  }

  const { type, payload } = req.body;

  const sql1 = 'SELECT * FROM posts WHERE id = ?'
  db.query(sql1, [postID], (err, result1) => {
    if (err) return error500(res, err);

    if (!result1.length) return error400(res, 554); // 554 Took it out of my butt

    if ('up_vote' === type || 'down_vote' === type) {

      const votes = JSON.parse(result1[0].votes);
      const up = new Set(votes.l);
      const down = new Set(votes.d);
      const userID = req.user.id; //userID

      if ('up_vote' === type) {
        if (up.has(userID)) {
          up.delete(userID);
        } else if (down.has(userID)) {
          down.delete(userID);
          up.add(userID);
        } else {
          up.add(userID);
        }
      }

      if ('down_vote' === type) {
        if (down.has(userID)) {
          down.delete(userID);
        } else if (up.has(userID)) {
          up.delete(userID);
          down.add(userID);
        } else {
          down.add(userID);
        }
      }

      let newVotes = { l: [...up], d: [...down] };
      newVotes = JSON.stringify(newVotes);

      const sql2 = `
        UPDATE posts
        SET votes = ?
        WHERE id = ?
      `;

      db.query(sql2, [newVotes, postID], (err) => {
        if (err) return error500(res, err);
        res.status(200).json({
          msg: { type: 'success', text: `Thank you for your vote. You are the best!` },
        });
        return;
      });
    }
  });
});

// Comments
app.get('/comments/for-post/:id', (req, res) => {

  const postID = req.params.id;

  const sql = `
    SELECT c.id, c.created_at, c.content, u.name, u.id AS userID
    FROM comments AS c
    INNER JOIN users AS u
    ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.id DESC
  `;

  db.query(sql, [postID], (err, result) => {
    if (err) return error500(res, err);

    res.json({
      success: true,
      c: result
    });
  });
});


app.post('/comments/create/:id', (req, res) => {

  if (!req.user.id) {
    error401(res, 'Please login first.');
    return;
  }

  const postID = req.params.id;
  const userID = req.user.id;
  const content = req.body.content;

  const sql = `
    INSERT INTO comments
    (post_id, user_id, content)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [postID, userID, content], (err, result) => {
    if (err) return error500(res, err);

    res.json({
      success: true,
      id: result.insertId
    });
  });
});

// Delete 
app.post('/comments/delete/:id', (req, res) => {

  if (!req.user.id) {
    error401(res, 'Please login first.');
    return;
  }

  const commentID = req.params.id;
  const userID = req.user.id;

  const sql = `
    DELETE FROM comments 
    WHERE id = ? AND user_id = ?
  `;

  db.query(sql, [commentID, userID], (err, result) => {
    if (err) return error500(res, err);


    res.json({
      success: !!result.affectedRows
    });

  });
});


// DELETE Back Office
app.post('/admin/comments/delete/:id', (req, res) => {

  const commentID = req.params.id;

  const sql = `
    DELETE FROM comments 
    WHERE id = ?
  `;

  db.query(sql, [commentID], (err, result) => {
    if (err) return error500(res, err);

    res.json({
      success: !!result.affectedRows
    });

  });
});


// CHAT list

app.get('/chat/list', (req, res) => {

  const userID = req.user.id;

  const sql1 = `
    SELECT DISTINCT from_user_id AS id
    FROM messages
    WHERE to_user_id = ?
  `;
  
  db.query(sql1, [userID], (err, result1) => {
    if (err) return error500(res, err);

    const sql2 = `
      SELECT id, name, avatar, role AS userRole, online
      FROM users
      WHERE id IN (?)
    `;

    db.query(sql2, [result1.map(r => r.id)], (err, result2) => {
      if (err) return error500(res, err);

      res.json({
        status: 'success',
        users: result2
      });
    });

  });
});

app.get('/chat/chat-with/:id', (req, res) => {

  const from_user_id = req.params.id;

  const to_user_id = req.user.id;

  const sql = `
    SELECT from_user_id AS fromID, to_user_id AS toID, content AS message, created_at AS time, seen, id
    FROM messages
    WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
    ORDER BY id DESC
  `
  db.query(sql, [from_user_id, to_user_id, to_user_id, from_user_id], (err, result) => {
    if (err) return error500(res, err);

    res.json({
      status: 'success',
      messages: result
    });
  });
  
});



// Start server
app.listen(PORT, () => {
  console.log(`Serveris pasiruošęs ir laukia ant ${PORT} porto!`);
});