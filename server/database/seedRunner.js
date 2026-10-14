import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  console.log('[Seed] Starting database migration & seed process...');
  const schemaPath = path.join(__dirname, 'schema.sql');
  const seedPath = path.join(__dirname, 'seed.sql');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    multipleStatements: true
  };

  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('[Seed] Connected to MySQL successfully.');

    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log('[Seed] Executing schema.sql...');
      await connection.query(schemaSql);
      console.log('[Seed] Tables created successfully.');
    }

    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      console.log('[Seed] Executing seed.sql...');
      await connection.query(seedSql);
      console.log('[Seed] Sample data inserted successfully.');
    }

    await connection.end();
    console.log('[Seed] MySQL Seed complete!');
  } catch (err) {
    console.warn(`[Seed] MySQL Seed warning: ${err.message}.`);
    console.log('[Seed] Note: If MySQL is not running locally, TripPlanner will use persistent store automatically.');
  }
}

runSeed();
