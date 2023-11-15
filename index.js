// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************
const express = require('express'); // To build an application server or API
const app = express();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcrypt'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part B.
// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************
// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};
const db = pgp(dbConfig);
// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });
// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************
app.set('view engine', 'ejs'); // set the view engine to EJS
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.
// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************
// TODO - Include your API routes here
app.get("/", (req, res) => {
  res.redirect("/login");
});
app.get('/login', (req, res) => {
  res.render('pages/login');
});
app.get('/register', (req, res) => {
  res.render('pages/register');
});
app.get('/mytrips', (req, res) => {
  res.render('pages/mytrips');
});
app.get('/discover', (req, res) => {
  var test = null;
  res.render('pages/discover', {test,});
});
app.get('/discoverData', async (req,res) => {
  const latitude = parseFloat(req.query.latitude);
  const longitude = parseFloat(req.query.longitude);

  if (isNaN(latitude) || isNaN(longitude)) {
    res.json({ status: "success", message: "Invalid input" });
    return res.render("pages/discover", {
        message: "Please enter latitude and longitude as decimals",
    });
  }

  res.json({ status: "success", message: "Success" });
  axios({
    url: `https://api.content.tripadvisor.com/api/v1/location/nearby_search?language=en`,
    method: 'GET',
    dataType: 'json',
    headers: {
      'Accept-Encoding': 'application/json',
    },
    params: {
      key: process.env.ADVISOR_KEY,
      latLong: `${req.query.latitude},${req.query.longitude}`, 
      radius: '10',
      radiusUnit: 'mi'
    },
  })
    .then(results => {
      console.log(req.query.latitude); // the results will be displayed on the terminal if the docker containers are running // Send some parameters
      console.log(req.query.longitude);
      var test = results.data;
      return res.render("pages/discover", {test,});
    })
    .catch(error => {
      // Handle errors
      console.log(error);
    });
});

app.post("/login", async (req, res) => {
    try {
        const username = req.body.username;

        if (/^\d+$/.test(username)) {
            res.json({ status: "success", message: "Invalid input" });
            return res.render("pages/login", {
                message: "Invalid input",
            });
        }

        const userData = await db.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (userData.length === 0) {
            // If the user is not found, redirect to GET /register route
            return res.redirect("/register");
        }

        const user = userData[0];

        if (req.body.password != user.password) {
            res.json({ status: "success", message: "Invalid input" });
            // If the password is incorrect, throw an error
            return res.render("pages/login", {
                message: "Invalid input",
            });
        }

        // Set the session for the logged-in user
        req.session.user = user;
        req.session.save();
        res.json({ status: "success", message: "Success" });
        // Redirect to /discover route after setting the session
        res.redirect("/discover");
    } catch (error) {
        // If the database request fails, send an appropriate message to the user and render the login.ejs page
        res.json({ status: "success", message: "Success" });
        res.render("pages/login", {
            message: "Invalid Input",
        });
    }
});

app.get("/welcome", (req, res) => {
    res.json({ status: "success", message: "Welcome!" });
});

// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};
// Authentication Required
app.use(auth);
// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
//app.listen(3000);
module.exports = app.listen(3000);
console.log('Server is listening on port 3000');