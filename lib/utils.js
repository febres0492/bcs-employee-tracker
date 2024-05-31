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
                    for (const str of query) {
                        const res = await client.query(str)
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
                    department_id INTEGER NOT NULL REFERENCES department(id),
                    department VARCHAR(30) REFERENCES department(name)
                );`
            },
            employee: {
                query: `CREATE TABLE IF NOT EXISTS employee (
                    id SERIAL PRIMARY KEY, 
                    first_name VARCHAR(30) NOT NULL, 
                    last_name VARCHAR(30) NOT NULL, 
                    role_id INTEGER NOT NULL REFERENCES role(id),
                    position VARCHAR(30) REFERENCES role(title),
                    department_id INTEGER REFERENCES department(id),
                    department VARCHAR(30) REFERENCES department(name),
                    salary DECIMAL REFERENCES role(salary),
                    manager_id INTEGER,
                    manager VARCHAR(30)
                );`
            },
        }

        // getting existing tables
        const data = await U.processQuery(pool, 'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\';')

        // creating tables
        for (let table in tables) {
            const existingTables = data.rows.map(row => row.table_name)
            if(existingTables.includes(table)){
                console.log(U.c(`Table ${U.c(table, 'y')} already exists`))
                continue
            }
            await U.processQuery(pool, tables[table].query)
            console.log(U.c(`Table ${U.c(table, 'y')} created`))
        }
        console.log('\n')
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
            return key
        })
        return objStr
    },
    capFirst: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1)
    },
    
}
module.exports = U