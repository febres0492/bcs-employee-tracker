const colors = require('colors')
let U = { // U for utility
    c: function(str='null', color = 'g'){ 
        const opt = { r: 'red', g: 'green', y: 'yellow', b: 'blue'}
        return colors[opt[color]](str) 
    },
    processQuery: function(pool, query) {
        return new Promise(async (resolve, reject) => {
            const client = await pool.connect()
            console.log('query', query, typeof query)
            
            try {
                if (Array.isArray(query)) {
                    const results = []
                    for (const str of query) {
                        const res = await client.query(str)
                        console.log('str -------------', str)
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
    },
    queryOptions:(() => {
        
        const queryOptions = {}
        queryOptions['View employee by id'] = `SELECT * FROM employee WHERE id = [employee_id];`
        queryOptions['View all departments'] = `SELECT * FROM department;`
        queryOptions['View all roles'] = `SELECT * FROM role;`
        queryOptions['View all employees'] = `SELECT * FROM employee;`
        queryOptions['View all employees by manager'] = `SELECT * FROM employee WHERE manager_id = [manager_id];`
        queryOptions['View all employees by department'] = `SELECT * FROM employee WHERE department_id = [department_id];`
        queryOptions['View all employees by role'] = `SELECT * FROM employee WHERE role_id = [role_id];`
        queryOptions['View all managers'] = `SELECT * FROM employee WHERE manager_id IS null;`
        queryOptions['View total utilized budget of a department'] = `SELECT department, SUM(salary) FROM role WHERE department = '[department]' GROUP BY department;` 

        queryOptions['Add a department'] = `INSERT INTO department (name) VALUES ('[name]');`
        queryOptions['Add an employee'] = `
            INSERT INTO employee (first_name, last_name, role_id, position, department_id, department, manager_id, manager) 
            VALUES ( 
                '[first_name]', '[last_name]', [role_id], (SELECT title FROM role WHERE id = [role_id]), (SELECT department_id FROM role WHERE id = [role_id]), 
                (SELECT department FROM role WHERE id = [role_id]), [manager_id], (SELECT CONCAT(first_name, ' ', last_name) FROM employee WHERE id = [manager_id])
            );
        `
        queryOptions['Add a role']= `
            INSERT INTO role (title, salary, department_id, department) 
            VALUES ('[title]', [salary], [department_id], (SELECT name FROM department WHERE id = [department_id]));
        `
        queryOptions['Update an employee'] = `UPDATE employee SET [selected_column] = '[new_value]' WHERE id = [employee_id];`
        
        // joining queries, Update an employee and View employee by id
        queryOptions['Update an employee'] = [queryOptions['Update an employee'] , queryOptions['View employee by id']]

        queryOptions['Remove a department'] = `DELETE FROM department WHERE id = [id];`
        queryOptions['Remove a role'] = `DELETE FROM role WHERE title = '[title]';`
        queryOptions['Remove an employee'] = `DELETE FROM employee WHERE id = [employee_id];`

        return queryOptions
    })()
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
    getChoices: async (pool, query, keysArray, otherValsObj = { 'name': 'NULL', 'value': null }, debug) => {
        const res = await U.processQuery(pool,  query)
        const vals = (row, keysStr)=> keysStr.split(',').map( key => row[key.trim()]).join(' ')
        const data = [...res.rows.map( row => { return { 'name': vals(row, keysArray[0]), 'value': vals(row, keysArray[1]) } } ), otherValsObj]
            .filter( row => Object.values(row).length)
        if(debug) console.log('data', data)
        return data
    },
    getInquirerQuestions: (pool, queryOptions, exitText) => {
        let q = queryOptions
        const queryOptions2 = {
            'Update an employee': `SELECT column_name FROM information_schema.columns WHERE table_name = 'employee';`,
        }
        return {
            'initialQuestion': [
                {   name: 'options', type:'list', message: `Options:`, choices: [...Object.keys(q), exitText] }
            ],
            'View employee by id': [
                { name: 'employee_id', type: 'input', message: 'Employee id:' }
            ],
            'View all employees by manager': [
                { name: 'manager_id', type: 'list', message: 'Select a manager:',
                    choices: async  () => await U.getChoices(pool, q['View all managers'], ['first_name, last_name', 'id'] )
                }
            ],
            'View all employees by department': [
                { name: 'department_id', type: 'list', message: 'Select a department:',
                    choices: async  () => await U.getChoices(pool, q['View all departments'], ['name', 'id'] )
                }
            ],
            'View all employees by role': [
                { name: 'role_id', type: 'list', message: 'Select a role:',
                    choices: async  () => await U.getChoices(pool, q['View all roles'], ['title', 'id'] )
                }
            ],
            'View total utilized budget of a department': [
                { name: 'department', type: 'list', message: 'Select a department:',
                    choices: async  () => await U.getChoices(pool, q['View all departments'], ['name', 'name'] )
                }
            ],
            'Add a department': [
                { name: 'name', type: 'input', message: 'Enter department name:', 
                    validate: (val) => val.length ? true : 'Please enter a department name',
                    filter: (val) => U.capFirst(val.trim())
                }
            ],
            'Add an employee': [
                { name: 'first_name', type: 'input', message: `Enter ${U.c('First Name')}:`, 
                    validate: (val) => val.length > 0 ? true : 'Please enter a first name',
                    filter: (val) => U.capFirst(val.trim())
                },
                { name: 'last_name', type: 'input', message: `Enter ${U.c('Last Name')}:`,
                    validate: (val) => val.length > 0 ? true : 'Please enter a last name',
                    filter: (val) => U.capFirst(val.trim())
                },
                { name: 'role_id', type: 'list', message: 'Under What Role:', 
                    choices: async  () => await U.getChoices(pool, q['View all roles'], ['title', 'id'] )
                },
                { name: 'manager_id', type: 'list', message: 'Under what Manager:', 
                    choices: async  () => await U.getChoices(pool, q['View all managers'], ['first_name, last_name', 'id'] )
                },
            ],
            'Add a role': [
                { name: 'title', type: 'input', message: 'Enter role title:',
                    validate: (val) => val.length > 0 ? true : 'Please enter a role title',
                    filter: (val) => U.capFirst(val.trim())
                },
                { name: 'salary', type: 'input', message: 'Enter salary:', 
                    validate: (val) => val.length > 0 ? true : 'Please enter a salary',
                },
                { name: 'department_id', type: 'list', message: 'Under what department do you want to add it:', 
                    choices: async  () => await U.getChoices(pool, q['View all departments'], ['name', 'id'] )
                },
            ],
            'Update an employee': [
                { name: 'employee_id', type: 'input', message: 'Employee id:' },
                { name: 'selected_column', type: 'list', message: 'Select a column to update:', 
                    when: (answers) => answers.employee_id != null,
                    choices: async () => (await U.getChoices(pool, queryOptions2['Update an employee'], ['column_name', 'column_name'] , {}))
                        .filter( col => col.name != 'id' && col.name.indexOf('_id') == -1) 
                },
                { name: 'new_value', type: 'input', message: 'Enter new value:', 
                    when: (answers) => answers.selected_column != 'manager',
                    validate: (val) => (''+val).length > 0 ? true : 'Please enter a value',
                },
                // updating employee's mananger
                { name: 'new_value', type: 'list', message: 'Select a manager:',
                    when: (answers) => answers.selected_column == 'manager',
                    choices: async  () => await U.getChoices(pool, q['View all managers'], ['first_name, last_name', 'id'] ),
                    filter: async  (val) => {
                        let data = await U.getChoices(pool, q['View all managers'], ['first_name, last_name', 'id'] , {})
                        return data.filter( row => (row.value+'') == (val+''))[0]
                    }
                }
            ],
            'Remove a department': [
                { name: 'name', type: 'input', message: 'What department would you like to remove:',
                    choices: async  () => await U.getChoices(pool, q['View all departments'], ['name', 'id'] )
                }
            ],
            'Remove a role': [
                { name: 'title', type: 'list', message: `What role do you want to ${U.c('remove','r')}:`, 
                    choices: async  () => await U.getChoices(pool, q['View all roles'], ['title', 'title'] )
                }
            ],
            'Remove an employee': [
                { name: 'employee_id', type: 'list', message: 'What Employee would you like to remove:',
                    choices: async  () => await U.getChoices(pool, q['View all employees'], ['first_name, last_name', 'id'] )
                },
            ],
        }
    }
}
module.exports = U