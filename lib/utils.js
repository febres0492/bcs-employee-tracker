const colors = require('colors')
let U = { // U for utility
    c: function(str='null', color = 'g'){ 
        const opt = { r: 'red', g: 'green', y: 'yellow', b: 'blue'}
        return colors[opt[color]](str) 
    },
    processQuery: function(pool, query) {
        return new Promise(async (resolve, reject) => {
            const client = await pool.connect()
            try {
                if (Array.isArray(query)) {
                    const results = []
                    for (const q of query) {
                        const res = await client.query(q)
                        results.push(res)
                    }
                    resolve(results)
                } else {
                    const res = await client.query(query)
                    resolve(res)
                }    
            } 
            catch (err) { reject(err) } 
            finally { client.release() }
        })
    }
}
U = {...U,
    validateDB: async function(pool, dbName) {
        try {
            const res = await U.processQuery(pool, 'SELECT datname FROM pg_database;')
            const dbExists = res.rows.some(db => db.datname === dbName)
    
            if (!dbExists) {
                await U.processQuery(pool, `CREATE DATABASE ${dbName};`)
                console.log(U.c(`Database ${U.c(dbName, 'y')} created`))
            } else {
                console.log(U.c(`Database ${U.c(dbName, 'y')} already exists`))
            }
            return true
        } catch (err) {
            console.error('Error in validateDB:', err)
        }
    },
    createTable: async function(pool, tables) {
        // defining tables
        tables = tables || {
            department: {
                query: `CREATE TABLE IF NOT EXISTS department ( 
                    id SERIAL PRIMARY KEY, 
                    name VARCHAR(30) UNIQUE NOT NULL
                );`
            },
            role: {
                query: `CREATE TABLE IF NOT EXISTS role (
                    id SERIAL PRIMARY KEY, 
                    title VARCHAR(30) UNIQUE NOT NULL, 
                    salary DECIMAL NOT NULL, 
                    department_id INTEGER NOT NULL 
                );`
            },
            employee: {
                query: `CREATE TABLE IF NOT EXISTS employee (
                    id SERIAL PRIMARY KEY, 
                    first_name VARCHAR(30) NOT NULL, 
                    last_name VARCHAR(30) NOT NULL, 
                    role_id INTEGER NOT NULL,
                    manager_id INTEGER
                );`
            },
        }

        // creating tables
        for (let table in tables) {
            await U.processQuery(pool, tables[table].query)
            .then(res => console.log(U.c(`Table ${U.c(table, 'y')} created`)))
        }
    },
    replacingPlaceHolders: function(obj, values) {
        let objStr = typeof obj != 'string' ? JSON.stringify(obj, null, 2) : obj
        const regex = /\[([^\[\]]+)\]/g
    
        // replacing placeholders with value
        objStr = objStr.replace(regex, (match, key) => {
            if(key in values) {
                let newVal = (values[key]+'').replace(regex, (m, k)=> values[k])
                newVal = newVal == 'undefined' ? values[key] : newVal
                return newVal
            }
        })
        return objStr
    },
    listDatabases: async function(pool) {
        const client = await pool.connect();
        try {
            const query = 'SELECT datname FROM pg_database;';
            const res = await client.query(query);
            console.log('Databases:', res.rows);
        } catch (err) {
            console.error(err.stack);
        } finally {
            client.release();
        }
    },
    viewDepartments: function (pool){
        const sql = `SELECT * FROM department`;
        return 'viewDepartments'
    },
    viewRoles: function (){
        return 'viewRoles'
    },
    viewEmployees: function (){
        return 'viewEmployees'
    },
    addDepartment: function (pool){
        const sql = `INSERT INTO movies (movie_name) VALUES ($1)`;
        const params = [body.movie_name];

        pool.query(sql, params, (err, result) => {
            if (err) {
            res.status(400).json({ error: err.message });
            return;
            }
            res.json({
            message: 'success',
            data: body
            });
        });
        return 'addDepartment'
    },
    addRole: function (){
        return 'addRole'
    },
    addEmployee: function (){
        return 'addEmployee'
    },
    updateEmployeeRole: function (){
        return 'updateEmployeeRole'
    },
}
module.exports = U