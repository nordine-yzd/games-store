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
  app.use(express.static("public"));

  app.get("/", (request: Request, response: Response) => {
    response.redirect("/home");
  });

  //function to check the token is valide
  async function valideTokkenId(tokken: string) {
    const tokkenData = await fetch(`${process.env.AUTH0_DOMAIN}/userinfo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokken}`,
      },
    })
      .then((element) => element.json())
      .then(() => true)
      .catch(() => false);
    return tokkenData;
  }

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

  //root for add game at panier
  app.get("/AddGamesInToPanier", async (request, response) => {
    const param = request.query.gameSelect;
    const paramPrice = request.query.price;

    const cookies = cookie.parse(request.get("cookie") || "");
    const accesPanier = await valideTokkenId(cookies.token);
    const gamesAll = await db.collection("games").find().toArray();
    const relatedGames: any[] = [];

    for (let i = 0; i < 4; i++) {
      const random = Math.floor(Math.random() * 100 + 1);
      relatedGames.push(gamesAll[random]);
    }

    response.setHeader(
      "Set-Cookie",
      cookie.serialize(`gameSelected${param}`, `${param}?${paramPrice}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
        maxAge: 60 * 60,
        sameSite: "strict",
        path: "/",
      })
    );
    const idFormat = new ObjectId(`${param}`);
    const game = await db.collection("games").findOne({ _id: idFormat });

    response.render("gameDetails", {
      filteredArray: await chargeNavBarGenres(),
      listPlatforms: await chargeNavBarPlatform(),
      game,
      addPanierValidate: true,
      accesPanier,
      relatedGames,
      paramPrice,
    });
  });

  //root for delete game at panier
  app.get("/deleteGamesInToPanier", async (request, response) => {
    const param = request.query.gameSelect;
    const cookies = cookie.parse(request.get("cookie") || "");
    const arrayOfCookies: string[] = [];
    for (const cookie in cookies) {
      if (cookie !== "token" && cookies[cookie] === param) {
        arrayOfCookies.push(cookie);
      }
    }
    response.setHeader(
      "Set-Cookie",
      cookie.serialize(`${arrayOfCookies[0]}`, "", {
        maxAge: 0,
      })
    );
    response.redirect("/panier");
  });
  app.get("/home", async (request: Request, response: Response) => {
    const cookies = cookie.parse(request.get("cookie") || "");
    const accesPanier = await valideTokkenId(cookies.token);

    response.render("home", {
      filteredArray: await chargeNavBarGenres(),
      listPlatforms: await chargeNavBarPlatform(),
      accesPanier,
    });
  });

  //create root for load platforms into navbar
  app.get("/platforms", async (request: Request, response: Response) => {
    const listPlatforms = await chargeNavBarPlatform();
    const cookies = cookie.parse(request.get("cookie") || "");
    const accesPanier = await valideTokkenId(cookies.token);
    response.render("platforms", {
      listPlatforms,
      filteredArray: await chargeNavBarGenres(),
      accesPanier,
    });
  });

  //root for found game into navbar
  const formParser = express.urlencoded({ extended: true });
  app.post("/foundGame", formParser, async (request, response) => {
    const search = request.body.gameFound;
    const cookies = cookie.parse(request.get("cookie") || "");
    const accesPanier = await valideTokkenId(cookies.token);

    const searchFormat = search
      .replaceAll("!", "")
      .replaceAll(":", "")
      .replaceAll("&", "")
      .replaceAll(".", "")
      .replaceAll("'", "")
      .replaceAll("  ", " ")
      .replaceAll(" ", "-");

    const game = await db
      .collection("games")
      .findOne({ slug: searchFormat.toLowerCase() });

    if (game !== null) {
      response.render("gameDetails", {
        filteredArray: await chargeNavBarGenres(),
        listPlatforms: await chargeNavBarPlatform(),
        game,
        accesPanier,
        price: (Math.random() * (100 - 10 + 1) + 10).toFixed(2),
      });
    } else {
      response.redirect(`${request.headers.referer}`);
    }
  });

  //root for load all cookie games in panier page
  app.get("/panier", async (request: Request, response: Response) => {
    const cookies = cookie.parse(request.get("cookie") || "");
    const accesPanier = await valideTokkenId(cookies.token);

    if (accesPanier === true) {
      const arrayOfCookies: string[] = [];
      for (const cookie in cookies) {
        if (cookie !== "token") {
          arrayOfCookies.push(`${cookies[cookie]}`);
        }
      }

      //call to the db for get games
      const arrayGameSelected = [];
      let totalOfPrice = 0;
      for (let i = 0; i < arrayOfCookies.length; i++) {
        const idFormat = new ObjectId(arrayOfCookies[i].split("?")[0]);
        const game = await db.collection("games").findOne({ _id: idFormat });
        arrayGameSelected.push({
          ...game,
          price: arrayOfCookies[i].split("?")[1],
        });
        totalOfPrice += parseFloat(arrayOfCookies[i].split("?")[1]);
      }
      response.render("panier", {
        filteredArray: await chargeNavBarGenres(),
        listPlatforms: await chargeNavBarPlatform(),
        arrayGameSelected,
        accesPanier,
        totalOfPrice: totalOfPrice.toFixed(2),
      });
    } else {
      response.redirect("/home");
    }
  });

  //create root for platforms slug
  app.get(
    "/listGamePerPlatforms",
    async (request: Request, response: Response) => {
      const page = request.query.page;
      const cookies = cookie.parse(request.get("cookie") || "");
      const accesPanier = await valideTokkenId(cookies.token);

      if (typeof page === "string") {
        const currentpage = parseInt(page);
        if (isNaN(currentpage) || currentpage < 1) {
          const currentpage = 1;
          const param = request.query.platform;
          const gamesAllData = await db.collection("games").find().toArray();
          const gamesAll = await Promise.all(
            gamesAllData.filter((game) => game.platform.name === param)
          );
          const numberpages = Math.round(gamesAll.length / 4);
          const games = gamesAll.slice((currentpage - 1) * 4, currentpage * 4);
          response.render("listGamePerPlatforms", {
            listPlatforms: await chargeNavBarPlatform(),
            filteredArray: await chargeNavBarGenres(),
            games,
            currentpage,
            param,
            accesPanier,
            numberpages,
          });
        } else {
          const param = request.query.platform;
          const gamesAllData = await db.collection("games").find().toArray();
          const gamesAll = await Promise.all(
            gamesAllData.filter((game) => game.platform.name === param)
          );
          const numberpages = Math.round(gamesAll.length / 4);
          const games = gamesAll.slice((currentpage - 1) * 4, currentpage * 4);
          response.render("listGamePerPlatforms", {
            listPlatforms: await chargeNavBarPlatform(),
            filteredArray: await chargeNavBarGenres(),
            games,
            currentpage,
            param,
            accesPanier,
            numberpages,
          });
        }
      } else {
        const currentpage = 1;
        const param = request.query.platform;
        const gamesAllData = await db.collection("games").find().toArray();
        const gamesAll = await Promise.all(
          gamesAllData.filter((game) => game.platform.name === param)
        );
        const numberpages = Math.round(gamesAll.length / 4);
        const games = gamesAll.slice((currentpage - 1) * 4, currentpage * 4);
        response.render("listGamePerPlatforms", {
          listPlatforms: await chargeNavBarPlatform(),
          filteredArray: await chargeNavBarGenres(),
          games,
          currentpage,
          param,
          accesPanier,
          numberpages,
        });
      }
    }
  );

  //create root for games
  app.get("/games", async (request: Request, response: Response) => {
    const page = request.query.page;
    const cookies = cookie.parse(request.get("cookie") || "");
    const accesPanier = await valideTokkenId(cookies.token);

    if (typeof page === "string") {
      const currentpage = parseInt(page);
      if (isNaN(currentpage) || currentpage < 1) {
        const currentpage = 1;
        const gamesAll = await db.collection("games").find().toArray();
        const numberpages = Math.round(gamesAll.length / 4);
        const games = gamesAll.slice((currentpage - 1) * 4, currentpage * 4);
        response.render("games", {
          filteredArray: await chargeNavBarGenres(),
          games,
          listPlatforms: await chargeNavBarPlatform(),
          currentpage,
          accesPanier,
          numberpages,
        });
      } else {
        const gamesAll = await db.collection("games").find().toArray();
        const numberpages = Math.round(gamesAll.length / 4);
        const games = gamesAll.slice((currentpage - 1) * 4, currentpage * 4);
        response.render("games", {
          filteredArray: await chargeNavBarGenres(),
          games,
          listPlatforms: await chargeNavBarPlatform(),
          currentpage,
          accesPanier,
          numberpages,
        });
      }
    } else {
      const currentpage = 1;
      const gamesAll = await db.collection("games").find().toArray();
      const numberpages = Math.round(gamesAll.length / 4);
      const games = gamesAll.slice((currentpage - 1) * 4, currentpage * 4);
      response.render("games", {
        filteredArray: await chargeNavBarGenres(),
        games,
        listPlatforms: await chargeNavBarPlatform(),
        currentpage,
        accesPanier,
        numberpages,
      });
    }
  });

  //create root for games slug
  app.get("/game/:idGame", async (request: Request, response: Response) => {
    const idGameSelected = new ObjectId(request.params.idGame);
    const cookies = cookie.parse(request.get("cookie") || "");
    const accesPanier = await valideTokkenId(cookies.token);
    const gamesAll = await db.collection("games").find().toArray();
    const relatedGames: any[] = [];

    for (let i = 0; i < 4; i++) {
      const random = Math.floor(Math.random() * 100 + 1);
      relatedGames.push(gamesAll[random]);
    }

    const game = await db.collection("games").findOne({ _id: idGameSelected });
    response.render("gameDetails", {
      filteredArray: await chargeNavBarGenres(),
      listPlatforms: await chargeNavBarPlatform(),
      game,
      accesPanier,
      relatedGames,
      price: (Math.random() * (100 - 10 + 1) + 10).toFixed(2),
    });
  });

  //create root for listGamePerGenres
  app.get(
    "/listGamePerGenres",
    async (request: Request, response: Response) => {
      const param = request.query.genre;
      const page = request.query.page;
      const cookies = cookie.parse(request.get("cookie") || "");
      const accesPanier = await valideTokkenId(cookies.token);

      if (typeof page === "string") {
        const currentpage = parseInt(page);
        if (isNaN(currentpage) || currentpage < 1) {
          const currentpage = 1;
          const gamePerGenre = await db
            .collection("games")
            .find({ genres: param })
            .toArray();

          const game = gamePerGenre.slice(
            (currentpage - 1) * 4,
            currentpage * 4
          );
          const numberpages = Math.round(gamePerGenre.length / 4);
          response.render("listGamePerGenres", {
            filteredArray: await chargeNavBarGenres(),
            arrayOfGamesPerGenre: game,
            listPlatforms: await chargeNavBarPlatform(),
            currentpage,
            param,
            accesPanier,
            numberpages,
          });
        } else {
          const gamePerGenre = await db
            .collection("games")
            .find({ genres: param })
            .toArray();
          const numberpages = Math.round(gamePerGenre.length / 4);
          const game = gamePerGenre.slice(
            (currentpage - 1) * 4,
            currentpage * 4
          );
          response.render("listGamePerGenres", {
            filteredArray: await chargeNavBarGenres(),
            arrayOfGamesPerGenre: game,
            listPlatforms: await chargeNavBarPlatform(),
            currentpage,
            param,
            accesPanier,
            numberpages,
          });
        }
      } else {
        const currentpage = 1;
        const gamePerGenre = await db
          .collection("games")
          .find({ genres: param })
          .toArray();

        const game = gamePerGenre.slice((currentpage - 1) * 4, currentpage * 4);
        const numberpages = Math.round(gamePerGenre.length / 4);
        response.render("listGamePerGenres", {
          filteredArray: await chargeNavBarGenres(),
          arrayOfGamesPerGenre: game,
          listPlatforms: await chargeNavBarPlatform(),
          currentpage,
          param,
          accesPanier,
          numberpages,
        });
      }
    }
  );
  //root authentification
  app.get("/login", async (request, response) => {
    const cookies = cookie.parse(request.get("cookie") || "");
    if (cookies.token === undefined) {
      const url = `${process.env.AUTH0_DOMAIN}/authorize?client_id=${process.env.AUTH0_CLIENT_ID}&response_type=code&redirect_uri=${process.env.AUTH0_REDIRECTURI}&audience=${process.env.AUTH0_AUDIENCE}&scope=${process.env.AUTH0_SCOPES}`;
      response.redirect(url);
    } else {
      response.redirect("/home");
    }
  });

  //root for create cookie
  app.get("/callback", async (request: Request, response: Response) => {
    const param = request.query.code;

    //get the tokken
    const tokkenData = await fetch(`${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=authorization_code&client_id=${process.env.AUTH0_CLIENT_ID}&client_secret=${process.env.AUTH0_CLIENT_SECRET}&code=${param}&redirect_uri=${process.env.AUTH0_REDIRECTURI}`,
    })
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
    const url = `${process.env.AUTH0_DOMAIN}/v2/logout?client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${process.env.AUTH0_REDIRECTURILOGOUT}`;
    const cookies = cookie.parse(request.get("cookie") || "");

    for (const cookie in cookies) {
      response.clearCookie(cookie);
    }

    response.redirect(url);
  });

  return app;
}
