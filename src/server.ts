import express, { Request, Response } from "express";
import * as core from "express-serve-static-core";
import { Db } from "mongodb";
import nunjucks from "nunjucks";

export function makeApp(db: Db): core.Express {
  const app = express();
  const formParser = express.urlencoded({ extended: true });

  nunjucks.configure("views", {
    autoescape: true,
    express: app,
  });

  app.set("view engine", "njk");

  app.get("/", (request: Request, response: Response) => {
    response.render("home");
  });

  //create root for login
  app.get("/login", (request: Request, response: Response) => {
    response.render("login");
  });

  //create root for formulaire
  app.post("/loginForm", formParser, async (request, response) => {
    const userNameForm = request.body.username;
    const passwordForm = request.body.password;

    //check to db if username exist and password it's good
    const userLog = await db.collection("users").findOne({
      login: userNameForm,
      password: passwordForm,
    });

    if (userLog === null) {
      const errorMessage = "Not Found";
      response.render("login", { errorMessage });
    } else {
      response.redirect("/");
    }
  });

  //create root for create an account
  app.get("/createAccount", (request: Request, response: Response) => {
    response.render("createAccount");
  });
  app.post("/createAccountForm", formParser, (request, response) => {
    const firstNameForm = request.body.firstName;
    const lastNameForm = request.body.lastName;
    const emailForm = request.body.email;
    const loginForm = request.body.login;
    const passwordForm = request.body.password;

    //add user in DB
    db.collection("users").insertOne({
      firstName: firstNameForm,
      lastName: lastNameForm,
      email: emailForm,
      password: passwordForm,
      login: loginForm,
    });
    response.redirect("/");
  });

  return app;
}
