const app = require("./app");
const { config } = require("./lib/config");

const port = config.port;
app.listen(port, () => {
  console.log(`Lawazia Toto API listening on http://localhost:${port}`);
});
