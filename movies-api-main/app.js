const express = require("express");
const app = express();
app.use(express.json());
const path = require("path");
const dbPath = path.join(__dirname, "moviesData.db");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

let changeDBObjectToResponseObject = (dBObject) => {
  return {
    movieId: dBObject.movie_id,
    directorId: dBObject.director_id,
    movieName: dBObject.movie_name,
    leadActor: dBObject.lead_actor,
    directorName: dBObject.director_name,
  };
};

// Get ALL Movies API
app.get("/movies/", async (request, response) => {
  const getMovieQuery = `SELECT movie_name FROM movie ORDER BY movie_id;`;
  const moviesArray = await db.all(getMovieQuery);
  response.send(
    moviesArray.map((each) => changeDBObjectToResponseObject(each))
  );
});

// Add a Movie API

app.post("/movies/", async (request, response) => {
  const movieDetails = request.body;
  const { directorId, movieName, leadActor } = movieDetails;
  const addMovieQuery = `INSERT INTO movie (director_id,movie_name,lead_actor) VALUES (${directorId},'${movieName}','${leadActor}');`;
  await db.run(addMovieQuery);
  response.send("Movie Successfully Added");
});

// Get a Movie API

app.get("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const movieDetailsQuery = `SELECT * FROM movie WHERE movie_id = ${movieId};`;
  const getMovie = await db.get(movieDetailsQuery);
  response.send(changeDBObjectToResponseObject(getMovie));
});

// Update a Movie API

app.put("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const movieDetails = request.body;
  const { directorId, movieName, leadActor } = movieDetails;

  const updateMovieQuery = `UPDATE movie SET director_id = ${directorId}, movie_name= '${movieName}', lead_actor ='${leadActor}' WHERE movie_id = ${movieId} ;`;

  await db.run(updateMovieQuery);
  response.send("Movie Details Updated");
});

//Delete a Movie API
app.delete("/movies/:movieId/", async (request, response) => {
  const { movieId } = request.params;
  const deleteMovieQuery = `DELETE FROM movie WHERE movie_id = ${movieId};`;
  await db.run(deleteMovieQuery);
  response.send("Movie Removed");
});

//Get All Directors API
app.get("/directors/", async (request, response) => {
  const getDirectorsQuery = `SELECT * FROM director ORDER BY director_id;`;
  const directorsArray = await db.all(getDirectorsQuery);
  response.send(
    directorsArray.map((each) => changeDBObjectToResponseObject(each))
  );
});

//GET All Movies by Director

app.get("/directors/:directorId/movies/", async (request, response) => {
  const { directorId } = request.params;
  const getDirectorMoviesQuery = `SELECT movie_name FROM movie WHERE director_id = ${directorId};`;
  const getDirectorMoviesArray = await db.all(getDirectorMoviesQuery);
  response.send(
    getDirectorMoviesArray.map((each) => changeDBObjectToResponseObject(each))
  );
});

module.exports = app;
