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

  async function chargeNavBarPlatform() {
    //charge a list of genres into navbar
    //charge all game in allGames const
    const allGames = await db.collection("games").find().toArray();

    //recup all of genres
    const genresArrayNoSort = await Promise.all(
      allGames.map((game) => {
        return game.platform.name;
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
    response.render("home", {
      filteredArray: await chargeNavBarGenres(),
      listPlatforms: await chargeNavBarPlatform(),
    });
  });

  //create root for platforms
  app.get("/platforms", async (request: Request, response: Response) => {
    const listPlatforms = await chargeNavBarPlatform();

    response.render("platforms", {
      listPlatforms,
      filteredArray: await chargeNavBarGenres(),
    });
  });

  //create root for platforms slug
  type Game = {
    platform: {
      name: string;
    };
  };
  app.get(
    "/listGamePerPlatforms",
    async (request: Request, response: Response) => {
      //to complete
      // const param = request.query.platform;
      // const gamesAll = await db
      //   .collection("games")
      //   .find()
      //   .toArray()
      //   .then(<Game>(game: any) => {
      //     console.log(game.platform);
      //   });
      // console.log(gamesAll);
    }
  );

  //create root for games
  app.get("/games", async (request: Request, response: Response) => {
    const gamesAll = await db.collection("games").find().toArray();

    response.render("games", {
      filteredArray: await chargeNavBarGenres(),
      gamesAll,
      listPlatforms: await chargeNavBarPlatform(),
    });
    //to complete
  });

  //create root for games slug
  app.get("/games/:slug", (request: Request, response: Response) => {
    //to complete
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
        listPlatforms: await chargeNavBarPlatform(),
      });
      //to complete
    }
  );

  app.get("/login", (request, response) => {
    response.send(request.oidc.isAuthenticated() ? "Logged in" : "Logged out");
  });

  return app;
}
