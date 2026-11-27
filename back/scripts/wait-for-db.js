const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function waitForDatabase() {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      const connection = await mysql.createConnection(config);
      await connection.query('SELECT 1 FROM user LIMIT 1');
      await connection.end();
      console.log('Base de datos lista.');
      return;
    } catch (error) {
      console.log(`Esperando base de datos (${attempt}/60)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.error('La base de datos no respondio a tiempo.');
  process.exit(1);
}

waitForDatabase();
