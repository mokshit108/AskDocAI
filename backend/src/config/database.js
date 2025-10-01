const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize(
      process.env.PGDATABASE || process.env.DB_NAME,
      process.env.PGUSER || process.env.DB_USER,
      process.env.PGPASSWORD || process.env.DB_PASS,
      {
        host: process.env.PGHOST || process.env.DB_HOST,
        port: process.env.PGPORT || process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      }
    );

module.exports = sequelize;