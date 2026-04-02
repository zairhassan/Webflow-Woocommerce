require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║   Webflow Commerce Engine v1.0            ║
  ║   Server running on port ${PORT}              ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}            ║
  ╚═══════════════════════════════════════════╝
  `);
});
