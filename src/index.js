const express = require("express");
const mysql = require("mysql");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
require('dotenv').config();
// const randomstring = require("randomstring");
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  message:
    "Too many requests made from this IP, please try again after 24 hrs",
  standardHeaders: true,
  legacyHeaders: false,
});   

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "form_data",
});

//connection to MySql
con.connect(function (error) {
  if (error) console.log(error + " Not connected....");
  console.log("MySql is connected...");
});

//get data from MySql
con.query("select * from registration", function (error, result) {
  if (error) throw console.log(error);
  console.log(result);
});

app.get("/register", function (req, res) {
  res.sendFile(__dirname + "/register.html");
});

app.get("/login", function (req, res) {
  res.sendFile(__dirname + "/login.html");
});
app.get("/dashboard", function (req, res) {
  res.sendFile(__dirname + "/dashboard.html");
});
app.get("/success", function (req, res) {
  res.sendFile(__dirname + "/success.html");
});
app.get("/invalidcredentials",function(req,res) {
  res.sendFile(__dirname + "/invalidcredentials.html");
})

const isLoggedIn = function(req, res, next){
  if (req.cookies.userSave) {
    try {
          // 1. Verify the token
          const decoded = jwt.verify(req.cookies.userSave,
              process.env.JWT_SECRET);
          console.log(decoded);

          // 2. Check if the user still exist
          var sql = "select * from registration where id = ?"
         con.query(sql, [decoded.id], function(err, results){
              console.log(results);
              if (results) {
                  return next();
              }else {
                console.log(err)
              }
          });
        } catch(error){
          console.log(error);
        }
      } else {
      next();
  }
}


app.get("/forgetpassword", isLoggedIn ,function (req, res) {
  res.sendFile(__dirname + "/forgetpassword.html");
});

app.get("/resetpassword", isLoggedIn  ,function (req, res) {
  res.sendFile(__dirname + "/resetpassword.html");
});

const sendresetPasswordMail = async(Email ,id) => {
  try {
     const transporter =   nodemailer.createTransport({
           host : "smtp.gmail.com",
           port : 587,
           secure : false,
           requireTLS : true,
           auth : {
               user : "babudan517@gmail.com",
               pass : "cnzupbqeyhqgmlde"
           }
       });

       const mailOptions = {
           from : "babudan517@gmail.com",
           to : Email,
           subject : 'For reset password',
           text : 'hi ,please copy the link "http://127.0.0.1:7000/resetpassword?id='+id+'" reset your password'
       }
       transporter.sendMail(mailOptions ,function(error ,info){
                  if(error){
                     console.log(error);
                  } else {
                   console.log("Mail has been sent :-", info.response);
                  }
       });

  }catch(err){
   return res.status(400).send({status:false ,message : err.message});
}
}



app.post("/register", function (req, res) {
  const First_Name = req.body.First_Name;
  const Last_Name = req.body.Last_Name;
  const Email = req.body.Email;
  const Password = req.body.Password;

  var sql =
    "INSERT INTO registration(First_Name, Last_Name,Email,Password) VALUES('" +
    First_Name + "','" + Last_Name + "','" + Email + "','" + Password + "')";

  con.query(sql, function (error, result) {
    if (error) {
      throw console.log(error);
    }else {
      console.log(result[0].id)
      res.redirect("/success");
    }
  });
}); 

app.post("/forgetpassword"  ,function(req,res) {
  let email = req.body.Email;
    var sql = "select * from registration where Email = ?"
      con.query( sql, [email], function (error, results) {
      if(error){
         throw error;
      }else {
      if (results.length > 0 && results[0].Email == email) {
        let id = results[0].id
        console.log(id)
        sendresetPasswordMail(email ,id);
        res.send("plss check your email")
      } else {
           res.send("Invalid email or email is not registeresd")
      }
    }
    }
  );
})

app.post("/resetpassword" ,function(req,res) {
     let password = req.body.Password;
   

      var sql = "UPDATE registration set password=? where id=?";
      var id = req.query.id;

      con.query(sql ,[password ,id] ,function(error,result){
        if(error) console.log(error);
        res.redirect("/resetpassword")
      })
    })

app.post("/login", limiter, function (req, res) {
  let email = req.body.Email;
  let password = req.body.Password;

  con.query(
    "select * from registration where Email = ? and Password = ?",
    [email, password],
    function (error, results, fields) {
      if (results.length > 0 && results[0].Email == email && results[0].Password == password) {
        const id = results[0].id;
  
                const token = jwt.sign({ id }, process.env.JWT_SECRET, {
                    expiresIn: process.env.JWT_EXPIRES_IN
                });

                console.log("the token is " + token);
              
                const cookieOptions = {
                    expires: new Date(
                        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                    ),
                    httpOnly: true
                }
                res.cookie('userSave', token, cookieOptions);
        res.status(200).redirect("/dashboard");
      } else {
       res.redirect("/invalidcredentials")
      }
    }
  );
});

app.listen(7000);
  




