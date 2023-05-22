const mysql = require('promise-mysql');

let keys = require('../const/keys.js');

let pool;

module.exports.query = async (sql) => {
  if (!pool) await createPool(keys.host);

  return await pool.query(sql);
};

module.exports.getConnection = async () => {
  if (!pool) await createPool();

  return await pool.getConnection(sql);
};

const createPool = async () => {
  if (!pool) {
    pool = await mysql.createPool({
      host: keys.db.host,
      user: keys.db.user,
      password: keys.db.password,
      database: 'midsea',
      dateStrings: 'date',
      charset: 'utf8mb4',
      supportBigNumbers: true,
      bigNumberStrings: true,
      connectionLimit: 20,
      multipleStatements: true
    });

    pool.on('error', (err) => {
      console.log('Db pool error.');
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('PROTOCOL_CONNECTION_LOST for db @' + keys.db.host + '. Deleting connection.');
        pool = null;
      } else
        throw err;
    });

    console.log('Connected to db @' + keys.db.host);
  }

  return pool;
};
