const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (e) {
    console.log(`DB Error : ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//API 1 Create User

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const hashedPassword = await bcrypt.hash(password, 10);
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const addUserQuery = `INSERT INTO user (name,username,password,gender) VALUES ('${name}','${username}','${hashedPassword}','${gender}');`;
      await db.run(addUserQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API 2 Login User

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser !== undefined) {
    isPasswordCorrect = await bcrypt.compare(password, dbUser.password);
    if (isPasswordCorrect) {
      const payload = { userId: dbUser.user_id };
      let jwtToken = jwt.sign(payload, "qwertyuiop");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});

const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "qwertyuiop", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.userId = payload.userId;
        next();
      }
    });
  }
};

//API 3
app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const { userId } = request;
  const selectUserQuery = `SELECT T.username,tweet.tweet, tweet.date_time as dateTime FROM (follower INNER JOIN user ON user.user_id=follower.following_user_id) AS T INNER JOIN tweet ON T.user_id = tweet.user_id WHERE T.follower_user_id = ${userId} ORDER BY dateTime DESC LIMIT 4;`;
  const userTweets = await db.all(selectUserQuery);
  response.send(userTweets);
});

//API 4
app.get("/user/following/", authenticateToken, async (request, response) => {
  const { userId } = request;
  const selectUserQuery = `SELECT user.name FROM follower INNER JOIN user ON user.user_id=follower.following_user_id WHERE follower.follower_user_id = ${userId};`;
  const userFollowing = await db.all(selectUserQuery);
  response.send(userFollowing);
});

//API 5
app.get("/user/followers/", authenticateToken, async (request, response) => {
  const { userId } = request;
  const selectUserQuery = `SELECT user.name FROM follower INNER JOIN user ON user.user_id=follower.follower_user_id WHERE follower.following_user_id = ${userId};`;
  const userFollowing = await db.all(selectUserQuery);
  response.send(userFollowing);
});

//API 6
app.get("/tweets/:tweetId/", authenticateToken, async (request, response) => {
  const { tweetId } = request.params;
  const { userId } = request;
  const selectUserQuery = `SELECT tweet.tweet_id FROM follower INNER JOIN tweet ON tweet.user_id=follower.following_user_id WHERE follower.follower_user_id = ${userId} AND tweet.tweet_id=${tweetId};`;
  const userFollowing = await db.all(selectUserQuery);
  if (userFollowing.length > 0) {
    const resultQuery = `SELECT tweet.tweet,COUNT(like.tweet_id) AS likes,(SELECT COUNT() FROM reply WHERE tweet_id=${tweetId}) AS replies,tweet.date_time AS dateTime
    FROM tweet INNER JOIN like ON tweet.tweet_id=like.tweet_id WHERE tweet.tweet_id=${tweetId};`;
    const resultArray = await db.all(resultQuery);
    response.send(resultArray[0]);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

function foo(obj) {
  return obj.username;
}
//API 7
app.get(
  "/tweets/:tweetId/likes/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const { userId } = request;
    const selectUserQuery = `SELECT tweet.tweet_id FROM follower INNER JOIN tweet ON tweet.user_id=follower.following_user_id WHERE follower.follower_user_id = ${userId} AND tweet.tweet_id=${tweetId};`;
    const userFollowing = await db.all(selectUserQuery);
    if (userFollowing.length > 0) {
      const resultQuery = `SELECT user.username FROM like NATURAL JOIN user WHERE tweet_id=${tweetId};`;
      const resultArray = await db.all(resultQuery);
      let likes = resultArray.map(foo);
      let objectResponse = { likes: likes };
      response.send(objectResponse);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//API 8
app.get(
  "/tweets/:tweetId/replies/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const { userId } = request;
    const selectUserQuery = `SELECT tweet.tweet_id FROM follower INNER JOIN tweet ON tweet.user_id=follower.following_user_id WHERE follower.follower_user_id = ${userId} AND tweet.tweet_id=${tweetId};`;
    const userFollowing = await db.all(selectUserQuery);
    if (userFollowing.length > 0) {
      const resultQuery = `SELECT user.name,reply.reply FROM reply NATURAL JOIN user WHERE tweet_id=${tweetId};`;
      const resultArray = await db.all(resultQuery);
      let replies = { replies: resultArray };
      response.send(replies);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

//API 9
app.get("/user/tweets/", authenticateToken, async (request, response) => {
  const { userId } = request;
  const tweetsQuery = `SELECT tweet.tweet,COUNT(like.tweet_id) AS likes,(SELECT count() FROM tweet INNER JOIN reply ON tweet.tweet_id=reply.tweet_id WHERE tweet.user_id=${userId} GROUP BY tweet.tweet_id) AS replies,tweet.date_time AS dateTime
  FROM tweet INNER JOIN like ON tweet.tweet_id=like.tweet_id WHERE tweet.user_id=${userId} GROUP BY tweet.tweet_id;`;
  const tweetsDetails = await db.all(tweetsQuery);
  response.send(tweetsDetails);
});

//API 10
app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { userId } = request;
  const { tweet } = request.body;
  let dateTime = new Date();
  const createTweetQuery = `INSERT INTO tweet (tweet,user_id,date_time) VALUES ('${tweet}',${userId},'${dateTime}');`;
  await db.run(createTweetQuery);
  response.send("Created a Tweet");
});

//API 11
app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const { userId } = request;
    const selectUserQuery = `SELECT * FROM user INNER JOIN tweet ON user.user_id=tweet.user_id WHERE user.user_id = ${userId} AND tweet.tweet_id=${tweetId};`;
    const userTweets = await db.all(selectUserQuery);

    if (userTweets.length > 0) {
      const resultQuery = `DELETE FROM tweet WHERE tweet_id=${tweetId};`;
      await db.run(resultQuery);
      response.send("Tweet Removed");
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
