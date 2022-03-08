import express, { Request, Response } from "express";
import * as core from "express-serve-static-core";
import { Db, ObjectId } from "mongodb";
import nunjucks from "nunjucks";
import fetch from "node-fetch";

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

  //we do use this function on all route for charge select genres
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
  app.get("/games", async (request: Request, response: Response) => {
    const gamesAll = await db.collection("games").find().toArray();

    response.render("games", {
      filteredArray: await chargeNavBarGenres(),
      gamesAll,
    });
    //to complete
  });

  //create root for games slug
  app.get("/game/:idGame", async (request: Request, response: Response) => {
    const idGameSelected = new ObjectId(request.params.idGame);
    const game = await db.collection("games").findOne({ _id: idGameSelected });
    response.render("gameDetails", {
      filteredArray: await chargeNavBarGenres(),
      game,
    });
  });

  //create root for listGamePerGenres
  app.get(
    "/listGamePerGenres",
    async (request: Request, response: Response) => {
      const param = request.query.genre;

      const gamePerGenre = await db
        .collection("games")
        .find({ genres: param })
        .toArray();

      response.render("listGamePerGenres", {
        filteredArray: await chargeNavBarGenres(),
        arrayOfGamesPerGenre: gamePerGenre,
      });
    }
  );

  app.get("/login", async (request, response) => {
    const url = `${process.env.AUTH0_DOMAIN}/authorize?response_type=token&client_id=${process.env.AUTH0_CLIENT_ID}&redirect_uri=${process.env.AUTH0_REDIRECTURI}`;
    // console.log(
    //   `${process.env.AUTH0_DOMAIN}/oauth/tokenContent-Type: application/x-www-form-urlencodedgrant_type=authorization_code&client_id=${process.env.AUTH0_CLIENT_ID}&client_secret=${process.env.AUTH0_CLIENT_SECRET}&code=AUTHORIZATION_CODE&redirect_uri=${process.env.AUTH0_REDIRECTURI}`
    // );
    response.redirect(url);
  });

  app.get("/logout", async (request, response) => {
    const url = `${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=http://localhost:3000`;
    response.redirect(url);
  });

  return app;
}
