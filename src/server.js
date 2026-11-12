import "./config/env.js";

import app from "./app.js";
import pool from "./config/db.js";

const PORT = process.env.PORT || 5000;

let server;
let isShuttingDown = false;

const shutdown = (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${signal} received, shutting down...`);

  // Safety net: force exit if connections never drain
  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  if (!server) {
    pool.end().finally(() => process.exit(exitCode));
    return;
  }

  server.close(async (err) => {
    if (err) console.error("Error closing server:", err);
    try {
      await pool.end();
    } catch (e) {
      console.error("Error closing pool:", e);
    }
    process.exit(err ? 1 : exitCode);
  });

  // Drop idle keep-alive connections so close() can finish (Node 18.2+)
  server.closeIdleConnections();
};

const startServer = async () => {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Connected to PostgreSQL at:", res.rows[0].now);

    server = app.listen(PORT, () => {
      console.log(`Server started at port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown("uncaughtException", 1);
});

startServer();

// import "./config/env.js";

// import app from "./app.js";
// import pool from "./config/db.js";

// const PORT = process.env.PORT || 5000;

// let server;

// const startServer = async () => {
//   try {
//     const res = await pool.query("SELECT NOW()");
//     console.log("Connected to PostgreSQL at:", res.rows[0].now);

//     server = app.listen(PORT, () => {
//       console.log(`server started at port ${PORT}`);
//     });
//     server.on("error", (error) => {
//       console.error("Server error:", error);
//       process.exit(1);
//     });
//   } catch (error) {
//     console.error("Database connection failed...", error);
//     process.exit(1);
//   }
// };

// startServer();

// const shutdown = async () => {
//   console.log("Shutting down server...");
//   if (server) {
//     server.close(async () => {
//       await pool.end();
//       process.exit(0);
//     });
//   } else {
//     process.exit(0);
//   }
// };

// process.on("SIGINT", shutdown);
// process.on("SIGTERM", shutdown);
