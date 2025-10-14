import express from "express";
import routes from "./routes.js";

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

app.use(express.json());
app.use("/", routes);

app.listen(Number(PORT), HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`✅ API rodando em http://${displayHost}:${PORT}`);
});
