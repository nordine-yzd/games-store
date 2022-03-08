import express, { Request, Response } from "express";
import * as core from "express-serve-static-core";
import { Db } from "mongodb";
import nunjucks from "nunjucks";
import { platform } from "os";

export function makeApp(db: Db): core.Express {
  const app = express();
  const formParser = express.urlencoded({ extended: true });

  nunjucks.configure("views", {
    autoescape: true,
    express: app,
  });

  app.set("view engine", "njk");

  app.get("/", (request: Request, response: Response) => {
    response.render("index");
  });

  app.get("/home", (request: Request, response: Response) => {
    response.render("home");
  });

  //create root for login
  app.get("/login", (request: Request, response: Response) => {
    response.render("login");
  });

  //create root for platforms
  app.get("/platforms", (request: Request, response: Response) => {
    response.render("platforms");
  });

  //create root for platforms slug
  app.get("/platforms/:platformId", (request: Request, response: Response) => {
    //to complete
  });

  //create root for games
  app.get("/games", (request: Request, response: Response) => {
    //to complete
  });

  //create root for games slug
  app.get("/games/:slug", (request: Request, response: Response) => {
    //to complete
  });

  //create root for genres
  app.get("/genres", (request: Request, response: Response) => {
    //to complete
  });

  //create root for genre slug
  app.get("/genres/:slug", (request: Request, response: Response) => {
    //to complete
  });

  //create function userLogControl
  async function userLogControl(login: string, password: string) {
    const foundUser = await db.collection("users").findOne({
      login: login,
      password: password,
    });
    return foundUser;
  }
  //create root for formulaire
  app.post("/loginForm", formParser, (request, response) => {
    const userNameForm = request.body.username;
    const passwordForm = request.body.password;

    //check to db if username exist and password it's good
    if (userLogControl(userNameForm, passwordForm) === null) {
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
  //create root for create an account
  app.get("/createAccount", (request: Request, response: Response) => {
    response.render("createAccount");
  });
  app.post("/createAccountForm", formParser, async (request, response) => {
    const firstNameForm = request.body.firstName;
    const lastNameForm = request.body.lastName;
    const emailForm = request.body.email;
    const loginForm = request.body.login;
    const passwordForm = request.body.password;

    const userFound = await userLogControl(loginForm, passwordForm);
    //check if user exit in the DB
    if (userFound === null) {
      //add user in DB
      db.collection("users").insertOne({
        firstName: firstNameForm,
        lastName: lastNameForm,
        email: emailForm,
        password: passwordForm,
        login: loginForm,
      });
      response.redirect("/");
    } else {
      const errorMessage = "Not Found";
      response.render("createAccount", { errorMessage });
    }
  });

  return app;
}
