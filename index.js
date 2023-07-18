var express = require('express');
var cookieParser = require('cookie-parser');
var session = require('express-session');
const https = require("https");
const http = require('http');
const fs = require('fs');

var app = express();

// ssl certificate
// var key = fs.readFileSync(__dirname + '/.key');
// var cert = fs.readFileSync(__dirname + '/.crt');
// var options = {
//   key: key,
//   cert: cert
// };

const cors = require("cors");
var corsOptions = {
   origin: "https://webapp.elflearning.eu",
   origin: "http://webapp.elflearning.eu",
   origin: "*"
};

app.use(cors(corsOptions));
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer({ dest: './src/img/user' });
const fileUpload = require('express-fileupload');

app.use(fileUpload());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(upload.array());
app.use(cookieParser());
// app.use(session({ secret: "Shh, its a secret!" }));

var Users = [];

const mysql = require('mysql');
// const connection = mysql.createConnection({
//    host: "192.185.190.91",
//    user: "elflearn_localhost",
//    password: "HAty8sraZGEQ",
//    database: "elflearn_clone"
// });

// connection.connect((err) => {
//    if (err) throw err;
//    console.log('Connected to the MySQL server!');
// });

const connection = mysql.createPool({
   connectionLimit: 255,
   host: "192.185.190.91",
   user: "elflearn_localhost",
   password: "HAty8sraZGEQ",
   database: "elflearn_clone"
});

// const connection = mysql.createPool({
//    connectionLimit: 100,
//    host: "localhost",
//    user: "root",
//    password: "",
//    database: "elflearn_clone"
// });

// Attempt to catch disconnects 
connection.on('connection', function (connection) {
   console.log('MySQL Connection established');
 
   connection.on('error', function (err) {
     console.error(new Date(), 'MySQL error', err.code);
   });
   connection.on('close', function (err) {
     console.error(new Date(), 'MySQL close', err);
   });
 
});

function generatePassword(length) {
   var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]\:;?><,./-=";
   var password = "";
   for (var i = 0; i < length; i++) {
      var randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
   }
   return password;
}

// parse requests of content-type - application/json
app.use(express.json()); /* bodyParser.json() is deprecated */

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true })); /* bodyParser.urlencoded() is deprecated */

app.get('/', function (req, res) {
   res.cookie('name', 'express').send('cookie set');
});

// Get all countries from countries table when user sign up.
app.get("/countries", function (req, res) {   
   connection.query('SELECT * FROM countries ORDER BY id ASC', (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

app.post("/checkSignIn", function (req, res) {   
   const email = req.body.email;
   console.log(Users);
   if (Users.includes(email)) {
      connection.query("SELECT id, username, email, role, image_url, country FROM user WHERE email='" + email + "'", (err, results) => {
         if (err) throw err;
         if (results.length > 0) {
            res.header('Access-Control-Allow-Origin', '*');
            res.send({ loginstatus: true, user: results[0] });
         }
      })
   } else {
      var err = new Error("Not logged in!");
      console.log(err);
      res.header('Access-Control-Allow-Origin', '*');
      res.send({ loginstatus: false })
   }
});

// User signup
app.post("/signup", function (req, res) {   
   var exist = 0;
   var user = req.body;
   const name = user.name;
   const email = user.email;
   const team_category = user.team_category;
   const lat = user.lat;
   const lot = user.lot;
   const password = user.password;
   const is_teacher = user.is_teacher;
   const role = user.role;
   const country = user.country;
   const gemsCollected = user.gemsCollected;
   const points = user.points;
   var currentDate = new Date();
   // Get the individual components of the date
   const year = currentDate.getFullYear();
   const month = String(currentDate.getMonth() + 1).padStart(2, '0');
   const day = String(currentDate.getDate()).padStart(2, '0');

   // Concatenate the components into the desired format
   const formattedDate = `${year}-${month}-${day}`;
   const loc_str = "ST_GeomFromText('POINT(" + lat.toString() + " " + lot.toString() + ")')";
   connection.query("SELECT email from user WHERE email='" + email + "'", (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
         exist = 1;
         res.header('Access-Control-Allow-Origin', '*');
         res.send({ exist: exist });
      } else {
         const sql = "INSERT INTO user (username, email, team_category, password, is_teacher, role, country, gemsCollected, points, currentLocation, createdAt) VALUES ('"
            + name + "', '" + email + "', '" + team_category + "', '" + password + "', " + is_teacher + ", '" + role + "', '"
            + country + "', '" + gemsCollected + "', '" + points + "', " + loc_str + ", '" + formattedDate + "')";
         connection.query(sql, (err, results) => {
            if (err) throw err;
            res.header('Access-Control-Allow-Origin', '*');
            res.send({ exist: exist });
         });
      }
   });

});

// User login
app.post("/login", function (req, res) {   
   const user = req.body;
   const email = user.email;
   const password = user.password;
   connection.query("SELECT * FROM user WHERE email='" + email + "' AND password='" + password + "'", (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
         // req.session.user = email;
         if (!Users.includes(email))
            Users.push(email);
         // res.setHeader('Set-Cookie', 'email=' + email + "; Path=/;");
         res.header('Access-Control-Allow-Origin', '*');
         // res.cookie('email', email, {maxAge: 180000});
         res.send({ success: true, user: results[0] });
      } else {
         res.header('Access-Control-Allow-Origin', '*');
         res.send({ success: false });
      }
   });
});

// User logout
app.post('/logout', function (req, res) {
   const email = req.body.email;
   Users = Users.filter(item => item !== email);
   res.header('Access-Control-Allow-Origin', '*');
   res.send({ success: true });
});

// get Teachers count
app.get("/getTeachers", function (req, res) {   
   connection.query("SELECT COUNT(email) FROM user WHERE role='teacher'", (err, results) => {
      if (err) throw err;
      console.log(results[0]['COUNT(email)']);
      res.header('Access-Control-Allow-Origin', '*');
      res.send({ count: results[0]['COUNT(email)'] });
   });
});

// get routes count
app.post("/getRoutes", function (req, res) {   
   const user_id = req.body.user_id;
   const role = req.body.role;
   var sql = "SELECT COUNT(title) FROM games";
   if (role == "admin") {

   } else if (role == "teacher") {
      sql = sql + " WHERE teacher_id=" + user_id;
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send({ count: results[0]['COUNT(title)'] });
      }
   });
});

// get quizzes count
app.post("/getQuizzes", function (req, res) {   
   const user_id = req.body.user_id;
   const role = req.body.role;
   var sql = "SELECT COUNT(title) FROM quiz";
   if (role == "admin") {

   } else if (role == "teacher") {
      sql = sql + " WHERE teacher_id=" + user_id;
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send({ count: results[0]['COUNT(title)'] });
      }
   });
});

// get students count
app.post("/getStudents", function (req, res) {   
   const user_id = req.body.user_id;
   const role = req.body.role;
   var sql = "SELECT DISTINCT student_id FROM assignedstudents";
   if (role == "admin") {

   } else if (role == "teacher") {
      sql = sql + " WHERE teacher_id=" + user_id;
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send({ count: results.length });
      }
   });
});

// update profile from profile.js
app.post("/updateProfile", function (req, res) {   
   let uploadPath = null;
   let uploadFile = null;
   const user_id = req.body.user_id;
   const username = req.body.username;
   const email = req.body.email;
   const role = req.body.role;
   const country = req.body.country;
   console.log(req.body, req.files);
   if (req.files) {
      uploadFile = req.files.image;
   }
   console.log(user_id, username, email);
   if (uploadFile) {
      uploadPath = './src/img/avatar/avatar' + Date.now() + uploadFile.name;
      uploadFile.mv(uploadPath, function (err) {
         if (err)
            return res.status(500).send(err);
      });
   }
   var sql = "";
   const where = " WHERE id=" + user_id;
   if (uploadFile) {
      sql = "UPDATE user SET username='" + username + "', email='" + email + "', image_url='"
         + uploadPath + "', country=" + country;
   } else {
      sql = "UPDATE user SET username='" + username + "', email='" + email + "', country=" + country;
   }
   if (role) {
      sql += ", role='" + role + "'";
   }
   sql += where;
   console.log(sql);
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send({ image_url: uploadPath });
      }
   })
});

// update password from profile.js
app.post("/updatePassword", function (req, res) {   
   const cur_pass = req.body.cur_pass;
   const new_pass = req.body.new_pass;
   const user_id = req.body.user_id;
   console.log(user_id, cur_pass, new_pass);
   const cur_sql = "SELECT password FROM user WHERE id=" + user_id;
   connection.query(cur_sql, (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
         const old_password = results[0].password;
         if (old_password === cur_pass) {
            const new_sql = "UPDATE user SET password='" + new_pass + "' WHERE id=" + user_id;
            connection.query(new_sql, (err, results) => {
               if (err) throw err;
               res.header('Access-Control-Allow-Origin', '*');
               res.send({ success: true, msg: "Password changed" });
            })
         } else {
            res.header('Access-Control-Allow-Origin', '*');
            res.send({ success: false, msg: "Current password does not match." });
         }
      } else {
         res.header('Access-Control-Allow-Origin', '*');
         res.send({ success: false, msg: "Password change failed!" });
      }
   });

});

// save route from routes.js
app.post("/saveGame", function (req, res) {
   console.log(req.body);
   const user_id = req.body.user_id;
   const lat = req.body.lat;
   const lot = req.body.lot;
   const game_id = req.body.game_id;
   const meter = req.body.meter;
   const mapcode = req.body.mapcode;
   const title = req.body.name;
   let uploadPath = null;
   let uploadFile = null;
   console.log(req.files);
   if (req.files) {
      if (req.files.cover) uploadFile = req.files.cover;
   } else {
      console.log('no files');
   }

   console.log(uploadFile);
   if (uploadFile) {
      uploadPath = './src/img/user/user' + uploadFile.name;
      uploadFile.mv(uploadPath, function (err) {
         if (err)
            return res.status(500).send(err);
         // res.send('File uploaded!');
      });
   }
   const loc_str = "ST_GeomFromText('POINT(" + lat.toString() + " " + lot.toString() + ")')";
   if (game_id == "") {
      const sql = "INSERT INTO games (GeoCoor, mapcode, meters, title, teacher_id, image) VALUES (" +
         loc_str + ", '" + mapcode + "', " + meter + ", '" + title + "', " + user_id + ", '" + uploadPath + "')";
      connection.query(sql, (err, results) => {
         if (err) throw err;
         if (results) {
            console.log(results);
            res.header('Access-Control-Allow-Origin', '*');
            res.send(results);
         }
      });
   } else {
      const sql = "UPDATE games SET mapcode='" + mapcode + "', meters=" + meter + ", title='" + title + "', image='" + uploadPath + "' WHERE id=" + game_id;
      console.log(sql);
      connection.query(sql, (err, results) => {
         if (err) throw err;
         if (results) {
            console.log(results);
            res.header('Access-Control-Allow-Origin', '*');
            res.send({ msg: "succeeded" });
         }
      });
   }
});

// get routes from routes.js
app.post("/getGames", function (req, res) {
   console.log(req.body);
   const user_id = req.body.user_id;
   const role = req.body.role;
   let sql = "";
   if (role == "teacher") {
      sql = "SELECT id, title, meters, image FROM games WHERE teacher_id=" + user_id;
   } else if (role == "admin") {
      sql = "SELECT a.id, a.title, a.meters, a.image FROM games AS a, user AS b WHERE a.teacher_id=b.id AND b.role='teacher'";
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   })
});

// get route from routes.js
app.post("/getGame", function (req, res) {
   const game_id = req.body.game_id;
   const sql = "SELECT a.id, a.title, a.meters, a.mapcode, a.GeoCoor, COUNT(b.POIs) FROM games AS a, pois AS b WHERE a.id=b.game_id AND a.id=" + game_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results[0]);
      }
   });
});

// change poi_orders of a route from routes.js
app.post("/save_order", function (req, res) {
   console.log(req.body);
   const ids = req.body.poi_ids;
   if (ids && ids.length > 2) {
      for (let i = 1; i < ids.length; i++) {
         const sql = "UPDATE pois SET poi_order=" + i + " WHERE id=" + ids[i];
         connection.query(sql, (err, results) => {
            if (err) throw err;
            if (results) {
            }
         });
      }
   }
});

// get summary of a route from routes.js
app.post("/getSummary", function (req, res) {
   const game_id = req.body.game_id;
   var summaryPOI = [];
   var summaryQuiz = [];
   var summaryQues = [];
   const game_sql = "SELECT id, title, meters FROM games WHERE id=" + game_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
         const title = results[0].title;
         const meters = results[0].meters;
         const poi_sql = "SELECT id, location_title, POIs FROM pois WHERE game_id=" + game_id + " ORDER BY poi_order";
         connection.query(poi_sql, (err, results) => {
            if (err) throw err;
            if (results.length > 0) {
               for (let i = 0; i < results.length; i++) {
                  summaryPOI[i] = { location_title: results[i].location_title, POIs: results[i].POIs };
                  summaryQuiz[i] = [];
                  summaryQues[i] = [];
                  const quiz_sql = "SELECT id, title FROM quiz WHERE poi_id=" + results[i].id;
                  connection.query(quiz_sql, (err, results) => {
                     if (err) throw err;
                     if (results.length > 0) {
                        for (let j = 0; j < results.length; j++) {
                           summaryQues[i][j] = [];
                           summaryQuiz[i][j] = {title: results[j].title};
                           const ques_sql = "SELECT id, answers, options, question FROM questions WHERE quiz_id=" + results[j].id;
                           connection.query(ques_sql, (err, results) => {
                              if (err) throw err;
                              if (results.length > 0) {
                                 for (let k = 0; k < results.length; k++) {
                                    summaryQues[i][j][k] = {answers: results[k].answers, options: results[k].options, question: results[k].option};
                                 }                                 
                              }
                           })
                        }
                     }
                  })
               }
            }
         });
         res.header('Access-Control-Allow-Origin', '*');
         res.send({title: title, meters: meters, summaryPOI: summaryPOI, summaryQuiz: summaryQuiz, summaryQues: summaryQues});
      }
   });
});

// get game_info by game_id for summary from routes.js
app.post("/getGameInfo", function (req, res) {
   const game_id = req.body.game_id;
   const sql = "SELECT id, title, meters FROM games WHERE id=" + game_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
})

// get poi_info by game_id for summary from routes.js
app.post("/getPoiInfo", function (req, res) {
   const game_id = req.body.game_id;
   const sql = "SELECT id, location_title, POIs FROM pois WHERE game_id=" + game_id + " ORDER BY poi_order";
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
});

// get quiz_info by poi_id for summary from routes.js
app.post("/getQuizInfo", function (req, res) {
   const poi_id = req.body.poi_id;
   const sql = "SELECT id, title FROM quiz WHERE poi_id=" + poi_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
})

// get ques_info by quiz_id for summary from routes.js
app.post("/getQuesInfo", function (req, res) {
   const quiz_id = req.body.quiz_id;
   const sql = "SELECT id, answers, options, question FROM questions WHERE quiz_id=" + quiz_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
})

// get POIs from pois.js
app.post("/getPOIs", function (req, res) {
   const game_id = req.body.game_id;
   console.log(req.body);
   const sql = "SELECT * FROM pois WHERE game_id=" + game_id + " ORDER BY poi_order";
   console.log(sql);
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   })
});

// get POI from pois.js
app.post("/getPOI", function (req, res) {
   const poi_id = req.body.poi_id;
   const sql = "SELECT * FROM pois WHERE id=" + poi_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   })
})

// delete route from routes.js
app.post("/delRoute", function (req, res) {
   const game_id = req.body.game_id;
   const sql = "DELETE FROM games WHERE id=" + game_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send({ msg: "Object deleted successfully" });
      }
   })
});
// save POI from routes.js
app.post("/savePOI", function (req, res) {
   const location_title = req.body.location_title;
   const description = req.body.description;
   const lat = req.body.lat;
   const lng = req.body.lng;
   const category = req.body.category;
   const YoutubeURL = req.body.YoutubeURL;
   const show = req.body.show;
   const game_id = req.body.game_id;
   const teacher_id = req.body.teacher_id;
   const location = req.body.location;
   const poi_id = req.body.poi_id;
   const loc_str = "ST_GeomFromText('POINT(" + lat.toString() + " " + lng.toString() + ")')";
   if (poi_id == 0) {
      const order_sql = "SELECT MAX(poi_order) FROM pois WHERE game_id=" + game_id;
      connection.query(order_sql, (err, results) => {
         if (err) throw err;
         var order = results[0]['MAX(poi_order)'];
         if (!order) order = 1;
         else order++;
         const sql = "INSERT INTO pois (location_title, description, POIs, category, YoutubeURL, show_flag, poi_order, game_id, teacher_id, location) VALUES ('" +
            location_title + "', '" + description + "', " + loc_str + ", '" + category + "', '" + YoutubeURL + "', " + show + ", " + order +
            ", " + game_id + ", " + teacher_id + ", '" + location + "')";
         console.log(sql);
         connection.query(sql, (error, insert_results) => {
            if (error) throw error;
            console.log(insert_results);
            res.header('Access-Control-Allow-Origin', '*');
            res.send(insert_results);
         });
      })
   } else {
      const sql = "UPDATE pois SET location_title='" + location_title + "', description='" + description +
         "', POIs=" + loc_str + ", category='" + category + "', YoutubeURL='" + YoutubeURL + "', show_flag=" +
         show + ", location='" + location + "' WHERE id=" + poi_id;
      connection.query(sql, (update_err, update_results) => {
         console.log("save poi");
         if (update_err) throw update_err;
         console.log(update_results);
         res.header('Access-Control-Allow-Origin', '*');
         res.send(update_results);
      });
   }

});

// delete POI from pois.js
app.post("/deletePOI", function (req, res) {
   const poi_id = req.body.poi_id;
   const sql = "DELETE FROM pois WHERE id=" + poi_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   })
})

// save Quiz from pois.js/quizlist.js
app.post("/saveQuiz", function (req, res) {
   console.log(req.body);
   const poi_id = req.body.quiz_poi_id;
   const title = req.body.title;
   const detail = req.body.detail;
   const status = req.body.status;
   const teacher_id = req.body.teacher_id;
   const quiz_id = req.body.quiz_id;
   let uploadPath = null;
   let uploadFile = null;
   console.log(req.files);
   if (req.files) {
      if (req.files.cover) uploadFile = req.files.cover;
   } else {
      console.log('no files');
   }

   console.log(uploadFile);
   if (uploadFile) {
      uploadPath = './src/img/user/user' + uploadFile.name;
      uploadFile.mv(uploadPath, function (err) {
         if (err)
            return res.status(500).send(err);
         // res.send('File uploaded!');
      });
   }
   let sql = "";
   if (quiz_id == 0) {
      sql = "INSERT INTO quiz (details, title, status, teacher_id, image, poi_id) VALUES ('" + detail + "', '" +
         title + "', '" + status + "', '" + teacher_id + "', '" + uploadPath + "', " + poi_id + ")";

   } else {
      sql = "UPDATE quiz SET title='" + title + "', details = '" + detail + "', status='" + status + "', image='"
         + uploadPath + "' WHERE id=" + quiz_id;
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
});

// get Quizzes list from quizlist.js
app.post("/getQuizList", function (req, res) {
   const user_id = req.body.user_id;
   const role = req.body.role;
   var sql = "SELECT a.id, a.title, a.details, b.location_title AS poi_title, c.title AS route_title FROM quiz AS a, pois AS b, games AS c ";
   var where = "WHERE c.id=b.game_id AND b.id=a.poi_id";
   if (role == "admin") {
      sql += where;
   } else if (role == "teacher") {
      where += " AND c.teacher_id=" + user_id;
      sql += where;
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   })
});

// get a quiz from quizlist.js
app.post("/getQuiz", function (req, res) {
   const quiz_id = req.body.quiz_id;
   const sql = "SELECT a.title, a.details, a.status, b.location_title FROM quiz AS a, pois AS b WHERE a.poi_id=b.id AND a.id=" + quiz_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
});

// delete a quiz from quizList.js
app.post("/deleteQuiz", function (req, res) {
   const quiz_id = req.body.quiz_id;
   const sql = "DELETE FROM quiz WHERE id=" + quiz_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
});

// save a question from quizlist.js/question.js
app.post("/saveQuestion", function (req, res) {
   console.log(req.body);
   const quiz_id = req.body.quiz_id;
   const ques_id = req.body.ques_id;
   const question = req.body.question;
   const url = req.body.url;
   const answers = req.body.answers;
   const checks = req.body.checks;
   var answer_str = "";
   var check_str = "";
   let uploadPath = null;
   let uploadFile = null;
   let filename_str = "";
   let isArray;
   if (req.files) {
      isArray = Array.isArray(req.files.image)
      console.log(isArray);
      console.log(req.files.image);
      if (isArray) {
         for (let i = 0; i < req.files.image.length; i++) {
            uploadFile = req.files.image[i];
            if (uploadFile) {
               uploadPath = './src/img/user/' + Date.now() + uploadFile.name;
               uploadFile.mv(uploadPath, function (err) {
                  if (err)
                     return res.status(500).send(err);
                  // res.send('File uploaded!');
               });
               if (i == 0) {
                  filename_str += uploadPath;
               } else {
                  filename_str += "," + uploadPath;
               }
            }
         }
      } else {
         uploadFile = req.files.image;
         if (uploadFile) {
            uploadPath = './src/img/user/' + Date.now() + uploadFile.name;
            uploadFile.mv(uploadPath, function (err) {
               if (err)
                  return res.status(500).send(err);
               // res.send('File uploaded!');
            });
            filename_str = uploadPath;
         }
      }
   }
   console.log(filename_str);
   var check_array = checks.split(",");
   for (let i = 0; i < check_array.length; i++) {
      if (check_array[i]) {
         if (check_str == "") {
            check_str += answers[i];
         } else {
            check_str += "," + answers[i];
         }
      }
      if (answer_str == "") {
         answer_str += answers[i];
      } else {
         answer_str += "," + answers[i];
      }
   }

   let sql = "";
   if (ques_id == 0) {
      sql = "INSERT INTO questions (question, url, answers, all_images, options, quiz_id) VALUES ('" + question + "', '" +
         url + "', '" + answer_str + "', '" + filename_str + "', '" + check_str + "', " + quiz_id + ")";

   } else {
      sql = "UPDATE questions SET question='" + question + "', url = '" + url + "', answers='" + answer_str + "', all_images='"
         + filename_str + "', options='" + check_str + "' WHERE id=" + ques_id;
   }
   console.log(sql);
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
});

// get questions list by quiz id from questions.js
app.post("/getQuestions", function (req, res) {
   const quiz_id = req.body.quiz_id;
   const sql = "SELECT * FROM questions WHERE quiz_id=" + quiz_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
});

// get question by ques_id from questions.js
app.post("/getQuestion", function (req, res) {
   const ques_id = req.body.ques_id;
   const sql = "SELECT b.id, a.question, a.url, a.answers, a.all_images, a.options, b.title FROM questions AS a, quiz AS b WHERE a.quiz_id=b.id AND a.id=" + ques_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
});

// delete question by ques_id from questions.js
app.post("/deleteQuestion", function (req, res) {
   const ques_id = req.body.ques_id;
   const sql = "DELETE FROM questions WHERE id=" + ques_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      if (results) {
         res.header('Access-Control-Allow-Origin', '*');
         res.send(results);
      }
   });
});

// add user from admin*.js
app.post("/addUser", function (req, res) {
   const username = req.body.new_username;
   const email = req.body.new_email;
   const country = req.body.new_country;
   const password = req.body.new_password;
   const role = req.body.new_role;
   let uploadPath = null;
   let uploadFile = null;
   if (req.files) {
      uploadFile = req.files.new_avatar;
   }
   var currentDate = new Date();
   // Get the individual components of the date
   const year = currentDate.getFullYear();
   const month = String(currentDate.getMonth() + 1).padStart(2, '0');
   const day = String(currentDate.getDate()).padStart(2, '0');

   // Concatenate the components into the desired format
   const formattedDate = `${year}-${month}-${day}`;
   console.log(req.files);
   console.log(uploadFile);
   var sql = "";
   if (uploadFile) {
      uploadPath = './src/img/avatar/avatar' + Date.now() + uploadFile.name;
      uploadFile.mv(uploadPath, function (err) {
         if (err)
            return res.status(500).send(err);
         // res.send('File uploaded!');         
      });
      sql = "INSERT INTO user (username, email, country, role, password, image_url, createdAt) VALUES ('" + username + "', '" + email +
         "', " + country + ", '" + role + "', '" + password + "', '" + uploadPath + "', '" + formattedDate + "')";
   } else {
      sql = "INSERT INTO user (username, email, country, role, password, createdAt) VALUES ('" + username + "', '" + email +
         "', " + country + ", '" + role + "', '" + password + "', '" + formattedDate + "')";
   }
   console.log(sql);
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });

});

// edit user from admin*.js
app.post("/editUser", function (req, res) {

});

// get users by role from admin*.js
app.post("/getUsers", function (req, res) {
   const role = req.body.role;
   const sql = "SELECT a.id, a.username, a.email, a.image_url, a.createdAt, a.points, a.gemsCollected, b.country FROM user AS a, countries AS b WHERE a.country=b.id AND a.role='" + role + "' ORDER BY a.createdAt";
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get user by role from admin*.js
app.post("/getUser", function (req, res) {
   const user_id = req.body.user_id;
   const sql = "SELECT id, username, email, image_url, role, country FROM user WHERE id=" + user_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// show password by user_id from admin*.js
app.post("/getPassword", function (req, res) {
   const user_id = req.body.user_id;
   const sql = "SELECT password FROM user WHERE id=" + user_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// create/update password by user_id from admin*.js
app.post("/createPassword", function (req, res) {
   const user_id = req.body.user_id;
   const new_password = generatePassword(10);
   const sql = "UPDATE user SET password='" + new_password + "' WHERE id=" + user_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send({ password: new_password });
   });
});

// get comments by user_id from comments.js
app.post("/getComments", function (req, res) {
   const user_id = req.body.user_id;
   const role = req.body.role;
   var sql = "";
   if (role == "admin") {
      sql = `SELECT a.username, b.question, c.comment, c.comment_status, c.createdAt, c.id FROM user AS a, questions AS b, comments AS c 
         WHERE a.id=c.user_id AND c.ques_id=b.id`;
   } else if (role == "teacher") {
      sql = `SELECT a.username, b.question, c.comment, c.comment_status, c.createdAt, c.id FROM user AS a, questions AS b, comments AS c, assignedstudents AS d
         WHERE a.id=c.user_id AND c.ques_id=b.id AND c.user_id=d.student_id AND d.teacher_id=` + user_id;
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get comment by comment_id from comments.js
app.post("/getComment", function (req, res) {
   const comment_id = req.body.comment_id;
   const sql = `SELECT a.username, b.question, c.comment, c.comment_status FROM user AS a, questions AS b, comments AS c 
   WHERE a.id=c.user_id AND c.ques_id=b.id AND c.id=` + comment_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
})

// save comment by comment_id from comments.js
app.post("/saveComment", function (req, res) {
   const comment_id = req.body.comment_id;
   const comment = req.body.comment;
   const status = req.body.status;
   const sql = "UPDATE comments SET comment='" + comment + "', comment_status='" + status + "' WHERE id=" + comment_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// delete comment by comment_id from comments.js
app.post("/deleteComment", function (req, res) {
   const comment_id = req.body.comment_id;
   const sql = "DELETE FROM comments WHERE id=" + comment_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get teams list from teams.js
app.get("/getTeamInfo", function (req, res) {
   const sql = "SELECT id, team_title, points, gemsCollected FROM teams_added ORDER BY points DESC";
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get team members list by team_id from teams.js
app.get("/getTeamMembers", function (req, res) {
   // const team_id = req.body.team_id;
   // const sql = `SELECT a.username FROM user AS a, team_members AS b WHERE a.id=b.user_id AND b.team_id=` + team_id;
   const sql = "SELECT a.username, c.id FROM user AS a, team_members AS b, teams_added AS c WHERE a.id=b.user_id AND b.team_id=c.id ORDER BY c.points DESC";
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get points from teams.js
app.get("/getPoints", function (req, res) {
   const sql = "SELECT DISTINCT points FROM teams_added ORDER BY points desc";
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get user's detail from allStudents.js
app.post("/getUsersInfo", function (req, res) {
   const role = req.body.role;
   var sql = "";
   if (role == "student") {
      sql = "SELECT a.*, b.team_title FROM user AS a, teams_added AS b WHERE a.id=b.adminId AND a.role='" + role + "' ORDER BY a.points DESC";
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
})

// get route's detail from routeLeadersBoard.js
app.post("/getGameDetail", function (req, res) {
   const game_id = req.body.game_id;
   const sql = "SELECT a.email, a.points FROM user AS a, saved_routes AS b WHERE a.id=b.student_id AND b.game_id=" + game_id + " ORDER BY a.points DESC";
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get students list from studentReport.js
app.post("/getStudentsList", function (req, res) {
   const user_id = req.body.user_id;
   const role = req.body.role;
   var sql = "";
   if (role == "admin") {
      sql = `SELECT DISTINCT b.student_id, a.* FROM user AS a, assignedstudents AS b WHERE a.id=b.student_id`;
   } else if (role == "teacher") {
      sql = `SELECT DISTINCT b.student_id, a.* FROM user AS a, assignedstudents AS b WHERE a.id=b.student_id AND b.teacher_id=` + user_id;
   }
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get student's info from studentReport.js
app.post("/getStudentInfo", function (req, res) {
   const student_id = req.body.student_id;
   const sql = "SELECT a.title, a.score, b.POIs, b.id FROM quiz AS a, pois AS b WHERE a.poi_id=b.id AND a.user_id=" + student_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get quiz and poi info by quiz_id from studentReport.js
app.post("/getQuizPoi", function (req, res) {
   const quiz_id = req.body.quiz_id;
   const sql = "SELECT a.time_to_solve, b.location, b.poi_order FROM quiz AS a, pois AS b WHERE a.poi_id=b.id AND a.id=" + quiz_id;
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
});

// get team by name from teamReport.js
app.post("/getTeamByName", function (req, res) {
   const team_title = req.body.title;
   const sql = "SELECT a.username, a.image_url, a.points, a.gemsCollected FROM user AS a, teams_added AS b WHERE a.id=b.adminId and b.team_title='" + team_title + "'";
   connection.query(sql, (err, results) => {
      if (err) throw err;
      res.header('Access-Control-Allow-Origin', '*');
      res.send(results);
   });
})

// require("./backend/routes.js")(app);

const PORT = process.env.PORT || 8080;
// app.listen(PORT, () => {
//    console.log(`Server is running on port ${PORT}.`);
// });

http.createServer(app).listen(PORT, () => {
   console.log(`Server is running on port ${PORT}.`);
});