const colors = require('colors')
let U = { // U for utility
    c: function(str='null', color = 'g'){ 
        const opt = { r: 'red', g: 'green', y: 'yellow', b: 'blue'}
        return colors[opt[color]](str) 
    },
    processQuery: async function(pool, query, callback){
        const client = await pool.connect();
        try {
            // checking if query is an array
            if(Array.isArray(query)){
                query.forEach(async q => {
                    const res = await client.query(q);
                    callback(res)
                })
                return
            }
            const res = await client.query(query);
            callback(res)
        } catch (err) {
            console.error(err.stack);
        } finally {
            client.release()
        }
    }
}
U = {...U,
    validateDB: function(pool, dbName){
        U.processQuery(pool, 'SELECT datname FROM pg_database;', (res) => {
            let dbExists = res.rows.filter(db => db.datname == dbName)
        
            if(dbExists.length == 0){
                U.processQuery(pool, `CREATE DATABASE ${dbName};`, (res) => {
                    console.log(U.c(`Database ${U.c(dbName,'y')} created`))
                })
            } else {
                console.log(U.c(`Database ${U.c(dbName,'y')} already exists`))
            }
        })
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
module.exports = U