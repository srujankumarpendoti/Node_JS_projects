const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const format = require("date-fns/format");
var isValid = require("date-fns/isValid");
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
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDBObjectToResponseOB = (objectDB) => {
  return {
    id: objectDB.id,
    todo: objectDB.todo,
    priority: objectDB.priority,
    status: objectDB.status,
    category: objectDB.category,
    dueDate: objectDB.due_date,
  };
};

const checkPriority = (priority) => {
  priorityList = [`HIGH`, `MEDIUM`, `LOW`];
  return priorityList.includes(priority);
};
const checkStatus = (status) => {
  statusList = [`TO DO`, `IN PROGRESS`, `DONE`];
  return statusList.includes(status);
};
const checkCategory = (category) => {
  categoryList = [`WORK`, `HOME`, `LEARNING`];
  return categoryList.includes(category);
};
const checkDueDate = (dueDate) => {
  let dueDateFormat = new Date(dueDate);

  let result = isValid(dueDateFormat);
  return result;
};

// API 1

const hasPriorityStatusCategory = (requestQuery) => {
  return (
    requestQuery.priority !== undefined &&
    requestQuery.status !== undefined &&
    requestQuery.category !== undefined
  );
};
const hasPriorityStatus = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasPriorityCategory = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.category !== undefined
  );
};
const hasStatusCategory = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.category !== undefined
  );
};
const hasPriority = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasCategory = (requestQuery) => {
  return requestQuery.category !== undefined;
};
const hasStatus = (requestQuery) => {
  return requestQuery.status !== undefined;
};

app.get("/todos/", async (request, response) => {
  const { priority, status, category, search_q = "" } = request.query;
  let selectUserQuery = "";

  switch (true) {
    case hasPriorityStatusCategory(request.query):
      selectUserQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority= '${priority}' AND status= '${status}' AND category= '${category}';`;
      break;
    case hasPriorityStatus(request.query):
      selectUserQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority= '${priority}' AND status= '${status}' ;`;
      break;
    case hasPriorityCategory(request.query):
      selectUserQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority= '${priority}'  AND category= '${category}';`;
      break;
    case hasStatusCategory(request.query):
      selectUserQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status= '${status}' AND category= '${category}';`;
      break;
    case hasPriority(request.query):
      selectUserQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority= '${priority}'  ;`;
      errorQuery = "Todo Priority";
      break;
    case hasCategory(request.query):
      selectUserQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category= '${category}';`;
      errorQuery = "Todo Category";
      break;
    case hasStatus(request.query):
      selectUserQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status= '${status}';`;
      errorQuery = "Todo Status";

      break;
    default:
      selectUserQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
      errorQuery = "Search";
      break;
  }

  const todoArray = await db.all(selectUserQuery);
  if (todoArray.length === 0) {
    response.status(400);
    response.send(`Invalid ${errorQuery}`);
  } else {
    response.send(todoArray.map((each) => convertDBObjectToResponseOB(each)));
  }
});

//API 2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const getTodo = await db.get(getTodoQuery);
  response.send(convertDBObjectToResponseOB(getTodo));
});

//API 6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `DELETE FROM todo WHERE id = ${todoId};`;
  await db.run(getTodoQuery);
  response.send("Todo Deleted");
});

//API 3
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (date === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const isDateValid = isValid(new Date(date));
    if (isDateValid) {
      const result = format(new Date(date), "yyyy-MM-dd");
      const getTodoQuery = `SELECT * FROM todo WHERE due_date = '${result}';`;

      const getTodo = await db.all(getTodoQuery);
      response.send(getTodo.map((each) => convertDBObjectToResponseOB(each)));
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

// API 4
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const formatDated = format(new Date(dueDate), "yyyy-MM-dd");

  if (
    checkPriority(priority) &&
    checkStatus(status) &&
    checkCategory(category) &&
    checkDueDate(formatDated)
  ) {
    const updateTodoQuery = `INSERT INTO todo (id,todo,priority,status,category,due_date) VALUES (${id},'${todo}','${priority}','${status}','${category}','${formatDated}');`;
    await db.run(updateTodoQuery);
    response.send("Todo Successfully Added");
  } else {
    if (checkPriority(priority) === false) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else if (checkStatus(status) === false) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else if (checkCategory(category) === false) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

//API 5
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateKey = "";
  let formattedDate;
  const requestBody = request.body;
  switch (true) {
    case requestBody.todo !== undefined:
      updateKey = "Todo";
      break;
    case requestBody.priority !== undefined:
      if (checkPriority(requestBody.priority)) {
        updateKey = "Priority";
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case requestBody.status !== undefined:
      if (checkStatus(requestBody.status)) {
        updateKey = "Status";
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }

      break;
    case requestBody.dueDate !== undefined:
      try {
        formattedDate = format(new Date(requestBody.dueDate), "yyyy-MM-dd");
        if (checkDueDate(formattedDate)) {
          updateKey = "Due Date";
        } else {
          response.status(400);
          response.send("Invalid Due Date");
        }
      } catch (e) {
        response.status(400);
        response.send("Invalid Due Date");
      }

      break;
    case requestBody.category !== undefined:
      if (checkCategory(requestBody.category)) {
        updateKey = "Category";
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
  }

  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const previousTodo = await db.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `UPDATE todo SET todo = '${todo}', priority = '${priority}',status = '${status}',category = '${category}',due_date = '${formattedDate}' WHERE id = ${todoId};`;
  await db.run(updateTodoQuery);
  response.send(`${updateKey} Updated`);
});

module.exports = app;
