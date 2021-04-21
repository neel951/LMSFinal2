//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const util = require("util");
const app = express();
const mysql = require("mysql2");
// const database = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "lms"
// });
// database.connect((err) => {
//   if (err) throw err;
//   console.log("Connected!");
//   database.query("USE lms");
// });

const database = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "lms",
});

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

var loggedIn = false;
var current_user = {
  name: " ",
  id: 0,
  email: " ",
  address: " ",
  type: 0,
  withdrawals: 0,
  fines: 0
};
var books = [];
var ratings = [];
var foundBooks = [];
var tagsArray;

app.get("/", function(req, res) {
  res.render("home", {
    check: loggedIn,
    booksArray: foundBooks,
    MyProfile: current_user.name,
    tagsArray: tagsArray,
    ratings: ratings
  });
})

app.post("/", function(req, res) {
  var input = req.body.searchBooks;

  async function makequery() {
    var sql = `SELECT * FROM books_details WHERE book_title = "${input}" OR ISBN = "${input}" OR book_author = "${input}";`;
    const promisePool = database.promise();
    const [result] = await promisePool.query(sql);
    foundbooks = [];
    ratings = [];
    tagsArray = new Array(result.length);
    for (var i = 0; i < result.length; i++) {
      tagsArray[i] = [];
      var sql3 = `select avg(rating) as r from ratings where ISBN = "${result[i].ISBN}";`;
      const [result3] = await promisePool.query(sql3);
      ratings.push(result3[0].r);
    }
    for (var i = 0; i < result.length; i++) {
      foundBooks.push(result[i]);
      var sql2 = `select tag_detail from tags where tag_id in(select tag_id from has_tags where ISBN = "${result[i].ISBN}");`;
      const [result2] = await promisePool.query(sql2);
      for (var j = 0; j < result2.length; j++) {
        tagsArray[i].push(result2[j].tag_detail);
      }
    }
    console.log(tagsArray);
    res.redirect("/");
  }
  makequery();
})

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
  const username = req.body.FirstName + " " + req.body.LastName;
  const userPhone = req.body.PhoneNum;
  const userEmail = req.body.Email;
  const userPass = req.body.Password;
  const userAddr = req.body.Address;
  const userStatus = req.body.Radio;
  var sql = `INSERT INTO users(user_name, user_pwd, user_email, user_address, user_phonenumber, user_type) VALUES ("${username}", "${userPass}", "${userEmail}", "${userAddr}", ${userPhone}, ${userStatus})`;
  database.query(sql, function(err, result) {
    if (err) throw err;
    console.log("One record Inserted");
  });
  res.redirect("/");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  var query1 = `SELECT * FROM users WHERE user_email="${username}" AND user_pwd="${password}"`;
  database.query(query1, function(err, result) {
    if (err) throw err;
    if (result.length == 0) {
      loggedIn = false;
    } else {
      loggedIn = true;
      current_user.name = result[0].user_name;
      current_user.id = result[0].user_id;
      current_user.email = result[0].user_email;
      current_user.address = result[0].user_address;
      current_user.type = result[0].user_type;
      current_user.withdrawals = result[0].current_withdrawals;
      current_user.fines = result[0].unpaid_fines;
    }
    res.redirect("/");
  });
});


app.get("/issue/:isbn", function(req, res) {
  var canIssue;
  if (loggedIn === false) {
    canIssue = 0;
    res.render("issue", {
      criteria: canIssue
    });
  } else {
    var temp = `${req.params.isbn}`;
    var isbnis = temp.substr(1);
    if (current_user.withdrawals <= 2 && current_user.fines < 1000) {
      if (current_user.type == 0) {
        var sql = `SELECT * FROM books WHERE ISBN = "${isbnis}";`;
        database.query(sql, function(err, result) {
          if (err) throw err;
          var found = false;
          var copy_number = 0;
          for (var i = 0; i < result.length; i++) {
            if (result[i].current_status === 2) {
              found = true;
              copy_number = result[i].book_copy;
              break;
            }
          }
          if (found == false) {
            canIssue == 12;
            res.render("issue", {
              criteria: canIssue,
              MyProfile: current_user.name
            });
          } else {
            canIssue == 11;
            console.log(copy_number);
            var sql2 = `UPDATE books SET issuer_id = "${current_user.id}", current_status = 1, borrow_date = now() WHERE ISBN = "${isbnis}" AND book_copy = "${copy_number}";`;
            database.query(sql2, function(err2, result2) {
              if (err) throw err2;
              console.log("successfully updated!");
              var sql3 = `UPDATE users SET current_withdrawals = "${current_user.withdrawals + 1}" WHERE user_id = "${current_user.id}";`;
              databse.query(sql3, function(err3, result3) {
                if (err3) throw err3;
                res.render("issue", {
                  criteria: canIssue,
                  MyProfile: current_user.name
                });
              })
            });
          }
        });
      } else {
        var sql = `SELECT * FROM books WHERE ISBN = "${isbnis}";`;
        database.query(sql, function(err, result) {
          if (err) throw err;
          var found = false;
          var copy_number = 0;
          for (var i = 0; i < result.length; i++) {
            if (result[i].current_status === 2) {
              found = true;
              copy_number = result[i].book_copy;
              break;
            }
          }
          if (found == false) {
            canIssue == 12;
            res.render("issue", {
              criteria: canIssue,
              MyProfile: current_user.name
            });
          } else {
            canIssue == 11;
            console.log(copy_number);
            var sql2 = `UPDATE books SET issuer_id = "${current_user.id}", current_status = 1, borrow_date = now() WHERE ISBN = "${isbnis}" AND book_copy = "${copy_number}";`;
            database.query(sql2, function(err2, result2) {
              if (err) throw err2;
              console.log("successfully updated!");
              res.render("issue", {
                criteria: canIssue,
                MyProfile: current_user.name
              });
            })
          }
        })
      }
    } else if (current_user.withdrawals >= 3 && current_user.fines < 1000) {
      canIssue = 2;
      res.render("issue", {
        criteria: canIssue,
        MyProfile: current_user.name
      });
    } else if (current_user.withdrawals <= 2 && current_user.fines >= 1000) {
      canIssue = 3;
      res.render("issue", {
        criteria: canIssue,
        MyProfile: current_user.name
      });
    } else {
      canIssue = 4;
      res.render("issue", {
        criteria: canIssue,
        MyProfile: current_user.name
      });
    }
  }
});

app.get("/addshelf/:isbn", function(req, res) {
  var flag = 0;
  if (loggedIn == false) {
    res.render("addshelf", {
      criteria: flag
    });
  } else {
    flag = 1;
    var temp = `${req.params.isbn}`;
    var isbnis = temp.substr(1);
    var sql = `SELECT * FROM personal_shelf where user_id = "${current_user.id}" and ISBN = "${isbnis}";`;
    database.query(sql, function(err, result) {
      if (err) throw err;
      if (result.length == 0) {
        var sql2 = `insert into personal_shelf values ("${current_user.id}", "${isbnis}");`;
        database.query(sql2, function(err2, result2) {
          if (err2) throw err2;
          console.log("Added to shelf");
        })
      }
      res.render("addshelf", {
        criteria: flag,
        MyProfile: current_user.name
      });
    })
  }
})

app.get("/personalshelf", function(req, res) {
  var booksinshelf = [];
  var ratingsShelf = [];
  var tagsShelf = [];

  async function makequery() {
    var sql = `select * from books_details where ISBN IN(select ISBN from personal_shelf where user_id = "${current_user.id}");`;
    const promisePool = database.promise();
    const [result] = await promisePool.query(sql);
    tagsShelf = new Array(result.length);
    for (var i = 0; i < result.length; i++) {
      tagsShelf[i] = [];
      var sql3 = `select avg(rating) as r from ratings where ISBN = "${result[i].ISBN}";`;
      const [result3] = await promisePool.query(sql3);
      ratingsShelf.push(result3[0].r);
    }
    for (var i = 0; i < result.length; i++) {
      booksinshelf.push(result[i]);
      var sql2 = `select tag_detail from tags where tag_id in(select tag_id from has_tags where ISBN = "${result[i].ISBN}");`;
      const [result2] = await promisePool.query(sql2);
      for (var j = 0; j < result2.length; j++) {
        tagsShelf[i].push(result2[j].tag_detail);
      }
    }
    res.render("personalshelf", {
      MyProfile: current_user.name,
      booksinshelf: booksinshelf,
      tagsArray: tagsShelf,
      ratings: ratingsShelf
    });
  }
  makequery();

})

app.get("/friends", function(req, res) {
  var friends = [];
  var sql = `select user_name from users where user_id in (select user_2 from friends where user_1 = "${current_user.id}");`;
  database.query(sql, function(err, result) {
    if (err) throw err;
    console.log(result);
    for (var i = 0; i < result.length; i++) {
      friends.push(result[i].user_name);
    }
    res.render("friends", {
      MyProfile: current_user.name,
      friendsArr: friends
    });
  })
})

var foundnames = [];

app.get("/searchPeople", function(req, res) {
  res.render("searchPeople", {
    MyProfile: current_user.name,
    foundnames: foundnames
  });
})

app.post("/searchPeople", function(req, res) {
  var friendname = req.body.username;
  var sql = `select * from users where user_name = "${friendname}";`;
  database.query(sql, function(err, result) {
    if (err) throw err;
    for (var i = 0; i < result.length; i++) {
      foundnames.push(result[i].user_name);
    }
    res.redirect("/searchPeople");
  })
})

app.get("/addfriend/:friendname", function(req, res) {
  var friendname = `${req.params.friendname}`;
  friendname = friendname.substr(1);
  console.log(friendname);
  var sql = `select user_id from users where user_name = "${friendname}";`;
  database.query(sql, function(err, result) {
    if (err) throw err;
    var sql2 = `insert into friends values ("${current_user.id}", "${result[0].user_id}");`;
    database.query(sql2, function(err2, result2) {
      if (err2) throw err2;
      console.log("friend added");
      res.redirect("/");
    })
  })
})

app.get("/friendBookShelf/:friendname", function(req, res) {
  var frndshelf = [];
  var frndname = `${req.params.friendname}`;
  frndname = frndname.substr(1);
  var sql = `select * from books_details where ISBN in (select ISBN from personal_shelf where user_id in (select user_id from users where user_name = "${frndname}"));`;
  database.query(sql, function(err, result) {
    if (err) throw err;
    //console.log(result);
    for (var i = 0; i < result.length; i++) {
      frndshelf.push(result[i]);
    }
    res.render("friendshelf", {
      MyProfile: current_user.name,
      frndshelf: frndshelf
    });
  })
})


var reviewsArrNames = [];
var reviewsArrReviews = [];
app.get("/reviews/:isbn", function(req, res) {
  var temp = `${req.params.isbn}`;
  var isbnis = temp.substr(1);
  var sql = `select user_name, review from reviews inner join users on users.user_id = reviews.user_id where ISBN = "${isbnis}";`;
  database.query(sql, function(err, result) {
    if(err) throw err;
    for(var i = 0; i < result.length; i++) {
      reviewsArrNames.push(result[i].user_name);
      reviewsArrReviews.push(result[i].review);
    }
    console.log(reviewsArrNames);
    res.render("reviews", {
      check: loggedIn,
      MyProfile: current_user.name,
      reviewsArrNames: reviewsArrNames,
      reviewsArrReviews: reviewsArrReviews
    });
  })
})

// Admin Login
var adminLoggedIn = false;
app.get("/adminlogin", function (req, res) {
  res.render("adminlogin");
});

app.post("/adminlogin", function (req, res) {
  const adminUser = req.body.username;
  const adminPass = req.body.password;
  if (adminUser === "admin123" && adminPass === "admin123") {
    adminLoggedIn = true;
    res.redirect("/admindashboard");
  } else {
    res.redirect("/adminlogin");
  }
});
//Admin Dashboard
app.get("/admindashboard", function (req, res) {
  res.render("admindashboard");
});
// Admin Add Tag

app.get("/adminaddtag", function(req, res) {
  res.render("adminaddtag");
})

app.post("/adminaddtag", function(req, res) {
  var tagdetail = req.body.tag;
  var tagISBN = req.body.ISBN;
  var tagid=0;
  var sql1 = `INSERT INTO tags (tag_detail) VALUES ("${tagdetail}")`;
  var sql2 = `SELECT tag_id FROM tags WHERE tag_detail = ("${tagdetail}")`;
database.query(sql1, function(err, result) {
    if(err) throw err;
    console.log("New tag Inserted");
    database.query(sql2, function(err1, result1) {
      tagid=result1[0].tag_id;
      console.log(tagid);
      if(err1) throw err1;
      var sql3 = `INSERT INTO has_tags (ISBN,tag_id) VALUES ("${tagISBN}","${tagid}")`;
    database.query(sql3, function(err2, result2) {
      if(err2) throw err2;
      console.log("New tag ISBN Inserted");
    })
    })
  })
  res.redirect("/admindashboard");
  
})
// End of Admin Add tag
// Admin Add books

app.get("/adminaddbook", function(req, res) {
  res.render("adminaddbook");
})
app.post("/adminaddbook", function(req, res) {
  var ISBN = req.body.ISBN;
  var book_title = req.body.book_title;
  var book_author = req.body.book_author;
  var book_pub = req.body.book_pub;
  var year_of_publication = req.body.year_of_publication;
  var shelf_id = req.body.shelf_id;
  var book_copy = req.body.book_copy;
  var sql1 = `INSERT INTO books_details (ISBN,book_title,book_author,book_publisher,year_of_publication) VALUES ("${ISBN}","${book_title}","${book_author}","${book_pub}","${year_of_publication}")`;
  var sql2 = `INSERT INTO books (ISBN,book_copy,shelf_id,current_status) VALUES ("${ISBN}","${book_copy}","${shelf_id}","${2}")`;
  database.query(sql1, function(err, result) {
    if(err) throw err;
    console.log("New book Inserted");
    database.query(sql2, function(err1, result1) {
      if(err1) throw err1;
      console.log("New book copy Inserted");
    })
  })
  res.redirect("/admindashboard");
})
// End Admin Add books
//Admin delete a book
app.get("/admindeletebook", function(req, res) {
  res.render("admindeletebook");
})
app.post("/admindeletebook", function(req, res) {
  var ISBN = req.body.ISBN;
  var book_copy = req.body.book_copy;
  var sql1 = `DELETE FROM books WHERE ISBN = "${ISBN}" AND book_copy ="${book_copy}"`;
  database.query(sql1, function(err, result) {
    if(err) throw err;
    console.log("Requested book deleted");
  })
  res.redirect("/admindashboard");
})
//end Admin delete a book
//Admin shift a book
app.get("/adminshelfchange", function(req, res) {
  res.render("adminshelfchange");
})
app.post("/adminshelfchange", function(req, res) {
  var ISBN = req.body.ISBN;
  var shelf_id = req.body.shelf_id;
  var sql1 = `UPDATE books SET shelf_id = "${shelf_id}"  WHERE ISBN = "${ISBN}" `;
  database.query(sql1, function(err, result) {
    if(err) throw err;
    console.log("Requested book has been shifted");
  })
  res.redirect("/admindashboard");
})
//end Admin shift a book

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
