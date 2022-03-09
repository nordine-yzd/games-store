import express, { Request, Response } from "express";
import * as core from "express-serve-static-core";
import { Db, ObjectId } from "mongodb";
import nunjucks from "nunjucks";
import cookie from "cookie";
import fetch from "node-fetch";

export function makeApp(db: Db): core.Express {
  const app = express();

  nunjucks.configure("views", {
    autoescape: true,
    express: app,
  });
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

  app.get("/AddGamesInToPanier", (request, response) => {
    //
    const param = request.query.gameSelect;

    const favoriteColor = "blue";

    response.setHeader(
      "Set-Cookie",
      cookie.serialize(favoriteColor, "coucou", {
        maxAge: 3600,
      })
    );
  });

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

  app.get("/AddGamesInToPanier", (request, response) => {
    //
    const param = request.query.gameSelect;
    response.setHeader(
      "Set-Cookie",
      cookie.serialize(`gameSelected${param}`, `${param}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        maxAge: 60 * 60,
        sameSite: "strict",
        path: "/",
      })
    );
  });

  //create root for platforms slug
  app.get(
    "/listGamePerPlatforms",
    async (request: Request, response: Response) => {
      const page = request.query.page;
      if (typeof page === "string") {
        const currentpage = parseInt(page);
        if (isNaN(currentpage) || currentpage < 1) {
          const currentpage = 1;
          const param = request.query.platform;
          const gamesAllData = await db.collection("games").find().toArray();
          const gamesAll = await Promise.all(
            gamesAllData.filter((game) => game.platform.name === param)
          );

          const games = gamesAll.slice((currentpage - 1) * 5, currentpage * 5);
          response.render("listGamePerPlatforms", {
            listPlatforms: await chargeNavBarPlatform(),
            filteredArray: await chargeNavBarGenres(),
            games,
            currentpage,
            param,
          });
        } else {
          const param = request.query.platform;
          const gamesAllData = await db.collection("games").find().toArray();
          const gamesAll = await Promise.all(
            gamesAllData.filter((game) => game.platform.name === param)
          );
          const games = gamesAll.slice((currentpage - 1) * 5, currentpage * 5);
          response.render("listGamePerPlatforms", {
            listPlatforms: await chargeNavBarPlatform(),
            filteredArray: await chargeNavBarGenres(),
            games,
            currentpage,
            param,
          });
        }
      } else {
        const currentpage = 1;
        const param = request.query.platform;
        const gamesAllData = await db.collection("games").find().toArray();
        const gamesAll = await Promise.all(
          gamesAllData.filter((game) => game.platform.name === param)
        );

        const games = gamesAll.slice((currentpage - 1) * 5, currentpage * 5);
        response.render("listGamePerPlatforms", {
          listPlatforms: await chargeNavBarPlatform(),
          filteredArray: await chargeNavBarGenres(),
          games,
          currentpage,
          param,
        });
      }
    }
  );

  //create root for games
  app.get("/games", async (request: Request, response: Response) => {
    const page = request.query.page;
    if (typeof page === "string") {
      const currentpage = parseInt(page);
      if (isNaN(currentpage) || currentpage < 1) {
        const currentpage = 1;
        const gamesAll = await db.collection("games").find().toArray();

        const games = gamesAll.slice((currentpage - 1) * 5, currentpage * 5);
        response.render("games", {
          filteredArray: await chargeNavBarGenres(),
          games,
          listPlatforms: await chargeNavBarPlatform(),
          currentpage,
        });
      } else {
        const gamesAll = await db.collection("games").find().toArray();

        const games = gamesAll.slice((currentpage - 1) * 5, currentpage * 5);
        response.render("games", {
          filteredArray: await chargeNavBarGenres(),
          games,
          listPlatforms: await chargeNavBarPlatform(),
          currentpage,
        });
      }
    } else {
      const currentpage = 1;
      const gamesAll = await db.collection("games").find().toArray();
      const games = gamesAll.slice((currentpage - 1) * 5, currentpage * 5);
      response.render("games", {
        filteredArray: await chargeNavBarGenres(),
        games,
        listPlatforms: await chargeNavBarPlatform(),
        currentpage,
      });
    }
  });

  //create root for games slug
  app.get("/game/:idGame", async (request: Request, response: Response) => {
    const idGameSelected = new ObjectId(request.params.idGame);
    const game = await db.collection("games").findOne({ _id: idGameSelected });
    response.render("gameDetails", {
      filteredArray: await chargeNavBarGenres(),
      listPlatforms: await chargeNavBarPlatform(),
      game,
    });
  });

  //create root for listGamePerGenres
  app.get(
    "/listGamePerGenres",
    async (request: Request, response: Response) => {
      const param = request.query.genre;
      const page = request.query.page;
      if (typeof page === "string") {
        const currentpage = parseInt(page);
        if (isNaN(currentpage) || currentpage < 1) {
          const currentpage = 1;
          const gamePerGenre = await db
            .collection("games")
            .find({ genres: param })
            .toArray();

          const game = gamePerGenre.slice(
            (currentpage - 1) * 5,
            currentpage * 5
          );
          response.render("listGamePerGenres", {
            filteredArray: await chargeNavBarGenres(),
            arrayOfGamesPerGenre: game,
            listPlatforms: await chargeNavBarPlatform(),
            currentpage,
            param,
          });
        } else {
          const gamePerGenre = await db
            .collection("games")
            .find({ genres: param })
            .toArray();

          const game = gamePerGenre.slice(
            (currentpage - 1) * 5,
            currentpage * 5
          );
          response.render("listGamePerGenres", {
            filteredArray: await chargeNavBarGenres(),
            arrayOfGamesPerGenre: game,
            listPlatforms: await chargeNavBarPlatform(),
            currentpage,
            param,
          });
        }
      } else {
        const currentpage = 1;
        const gamePerGenre = await db
          .collection("games")
          .find({ genres: param })
          .toArray();

        const game = gamePerGenre.slice((currentpage - 1) * 5, currentpage * 5);

        response.render("listGamePerGenres", {
          filteredArray: await chargeNavBarGenres(),
          arrayOfGamesPerGenre: game,
          listPlatforms: await chargeNavBarPlatform(),
          currentpage,
          param,
        });
      }
    }
  );

  app.get("/login", async (request, response) => {
    const cookies = cookie.parse(request.get("cookie") || "");
    if (cookies.token === undefined) {
      const url = `${process.env.AUTH0_DOMAIN}/authorize?audience=${process.env.AUTH0_AUDIENCE}&response_type=code&client_id=${process.env.AUTH0_CLIENT_ID}&redirect_uri=${process.env.AUTH0_REDIRECTURI}`;
      response.redirect(url);
    } else {
      response.redirect("/home");
    }
  });

  //create cookie
  app.get("/callback", async (request: Request, response: Response) => {
    const param = request.query.code;

    //get the tokken
    const tokkenData = await fetch(
      "https://dev-embtxmk2.us.auth0.com/oauth/token",
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=authorization_code&client_id=bBw98jzJCrWx5qgKFM4TzJdNsUb18zOS&client_secret=uZ5C-KKDA9zS6numYs7VadVpn43NdNhsYkwkQKz8qKpGfpbMEClLAAyhk2RegTq4&code=${param}&redirect_uri=http://localhost:3000/callback`,
      }
    )
      .then((element) => element.json())
      .then((tokken) => tokken);

    response.setHeader(
      "Set-Cookie",
      cookie.serialize("token", tokkenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        maxAge: 60 * 60,
        sameSite: "strict",
        path: "/",
      })
    );
    response.redirect("/home");
  });

  //deconnection & destroye cookie
  app.get("/logout", async (request, response) => {
    const url = `${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=http://localhost:3000`;
    response.setHeader(
      "Set-Cookie",
      cookie.serialize("token", "", {
        maxAge: 0,
      })
    );
    response.redirect(url);
  });

  return app;
}
