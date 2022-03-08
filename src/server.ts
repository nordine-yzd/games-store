import express, { Request, Response } from "express";
import * as core from "express-serve-static-core";
import { Db } from "mongodb";
import nunjucks from "nunjucks";
import { platform } from "os";

import { auth } from "express-openid-connect";

export function makeApp(db: Db): core.Express {
  const app = express();

  nunjucks.configure("views", {
    autoescape: true,
    express: app,
  });

  const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_CLIENT_SECRET,
    baseURL: process.env.AUTH0_REDIRECTURI,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_DOMAIN,
  };
  //app.use(auth(config));

  app.set("view engine", "njk");

  app.get("/", (request: Request, response: Response) => {
    response.render("index");
  });

  async function chargeNavBarGenres() {
    //charge a list of genres into navbar
    //charge all game in allGames const
    const allGames = await db.collection("games").find().toArray();

    //recup all of genres
    const genresArrayNoSort = await Promise.all(
      allGames.map((game) => {
        return game.genres;
      })
    );
    const arrayOfGenreNoSort = genresArrayNoSort.join().split(",");
    const filteredArray = arrayOfGenreNoSort.filter(function (ele, pos) {
      return arrayOfGenreNoSort.indexOf(ele) == pos;
    });
    filteredArray.splice(0, 1);
    return filteredArray;
  }

  app.get("/home", async (request: Request, response: Response) => {
    response.render("home", { filteredArray: await chargeNavBarGenres() });
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

  app.get("/login", (request, response) => {
    response.send(request.oidc.isAuthenticated() ? "Logged in" : "Logged out");
  });

  return app;
}
