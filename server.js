const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const path = require("path");
const jwt =require("jsonwebtoken")


const databasePath = path.join(__dirname, "ebooksdb.sqlite3");


const app = express();

app.use(express.json());

let database = null;

//InitalizeDbAndServer
const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3003, () =>
      console.log("Server Running at http://localhost:3003/")
    );
  } catch (error) {
    console.log("DB Error: ${error.message}");
    process.exit(1);
  }
};

initializeDbAndServer();


//middleware-1
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid User!!");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//middleware-2
const checkValidUser = async (request, response, next) => {
  const selectUserQuery = `SELECT * FROM users WHERE username = '${request.body.name}';`;
  const validUser = await database.get(selectUserQuery);
  console.log(validUser);
  if (validUser !== undefined) {
    next();
  } else {
    response.send("User is not registered!!!");
  }
}


//login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);
  
  if (databaseUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(
      password,
      databaseUser.password
    );
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.status(200);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

//register API
app.post("/register/", async (request, response) => {
  const { username, name, password} = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
  const databaseUser = await database.get(selectUserQuery);

  if (databaseUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      users (username, name, password)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}' 
      );`;
    await database.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});


//All books API
app.get("/books/", authenticateToken, async (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.send("Invalid Access Token");
      } else {
        const getBooksQuery = `
            SELECT
              *
            FROM
             books;`;
        const booksArray = await database.all(getBooksQuery);
        response.send(booksArray);
      }
    });
  }
});

//filter by author
app.get("/authors/", authenticateToken, async (req, res) => {
  const { author } =req.query;
  const getBookByAuthor = `SELECT * FROM books WHERE author = '${author}';`;
  const authorBookData = await database.get(getBookByAuthor);
  console.log(authorBookData);
  res.send(authorBookData);
});

//filter by title
app.get("/titles/", authenticateToken, async (req, res) => {
  const { title } =req.query;
  const getBookByTitle=`SELECT * FROM books WHERE title = '${title}';`;
  const titleBookData=await database.get(getBookByTitle);
res.send(titleBookData);
});

//filter by rating
app.get("/ratings/", authenticateToken, async (req, res) => {
  const { rating } = req.query;
  const getBookByRating=`SELECT * FROM books WHERE rating = '${rating}';`;
  const ratingBookData=await database.all(getBookByRating);
  console.log(ratingBookData);
  res.send(ratingBookData);
});


//filter by price
app.get("/prices/", authenticateToken, async (req, res) => {
  const { price } = req.query;
  const getBookByPrice=`SELECT * FROM books WHERE price = '${price}';`;
  const priceBookData=await database.all(getBookByPrice);
  console.log(priceBookData);
  res.send(priceBookData);
});

//buying books
app.post("/transaction/", checkValidUser, async (request, response) => {
  const {name, address, bookName} = request.body;
  const randomTransactionId = Math.floor((Math.random() * 1000000000000) + 1);
  const getPriceQuery = `SELECT price FROM books WHERE title = '${request.body.bookName}';`;
  const price = await database.get(getPriceQuery);
  const bookPrice = price.price;
  const dateTime = new Date()
  const date = dateTime.toDateString();
  const time = dateTime.toLocaleTimeString();
  const dateString = `${date} ${time}`

  const postTransactionsQuery = `
    INSERT INTO Transactions (transactionid, name, price, address, datetime, book)
    VALUES (${randomTransactionId}, '${name}', ${bookPrice}, '${address}', '${dateString}', '${bookName}');`;
  await database.run(postTransactionsQuery);
  response.send("Transaction SuccessFull!!");
});

// 
app.post("/prices/", authenticateToken, async (req, res) => {
  const getPriceQuery = `SELECT price,author,rating FROM books WHERE title = '${req.body.title}';`;
  const price = await database.get(getPriceQuery);
  res.send(price);
})



module.exports = app;   
