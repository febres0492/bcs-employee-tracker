const colors = require('colors')
let utils = {
    c: function(str='null', color = 'g'){ 
        const opt = { r: 'red', g: 'green', y: 'yellow', b: 'blue'}
        return colors[opt[color]](str) 
    },
}
utils = {...utils,
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
    createDB: function (pool, dbName){
        const sql = `DROP DATABASE IF EXISTS ${dbName}; CREATE DATABASE ${dbName};`;
        pool.query(sql, (err, res) => {
            if (err) { console.error(err); return }
            console.log(utils.c(`Database ${dbName} created successfully.`))
            pool.end()
        })
    },
    readDB: function (pool, dbName){
        pool.connect((err, client, done) => {
            if (err) { console.error('Error connecting to the database', err.stack) } 
            else {
                const sql = `SELECT * FROM ${dbName}`;
                client.query(sql, (err, res) => {
                    if (err) { console.error(err); return }
                    console.log(utils.c(`Database ${dbName} created successfully.`))
                    pool.end()
                })
                done()
            }
        })
    },
    listDatabases: async function(pool) {
        const client = await pool.connect();
        try {
            const query = 'SELECT datname FROM pg_database';
            const res = await client.query(query);
            console.log('Databases:', res.rows);
        } catch (err) {
            console.error(err.stack);
        } finally {
            client.release();
        }
    },
    viewDepartments: function (){
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
module.exports = utils