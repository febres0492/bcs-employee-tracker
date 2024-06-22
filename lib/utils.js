const colors = require('colors')

const U = {}
U.c = function(str='null', color = 'g'){ 
    const opt = { r: 'red', g: 'green', y: 'yellow', b: 'blue', gy: 'grey'}
    return colors[opt[color]](str) 
}

U.formatingQuery =  (queries, curQuestion, inquirerQuestions, answers) => {
    queries = Array.isArray(queries) ? queries : [queries]
    queries = queries.map(q => {
        let val
        if (curQuestion === inquirerQuestions['initialQuestion']) {
            val = U.queryOptions[answers.options]
        } else if (q == U.queryOptions['Remove a department'] || q == U.queryOptions['Update employee manager']) {
            val = U.replacingPlaceHolders(q, answers)
        } else {
            val = U.replacingPlaceHolders(q, answers).replace('= null', 'IS null')
            val = val.replace('= NULL', 'IS null')
        }
        return val
    })
    
    return queries
}

U.sendQuery =  async (pool, query, answers) => {
    for (const q of query) {
        const res = await U.processQuery(pool, q)
        
        if (answers.options?.indexOf('View all') !== -1) {
            try {
                const sortedData = res.rows.sort((a, b) => a.id - b.id)
                console.table(sortedData)
            } catch (err) {
                res.command && console.log(res.command)
                res.rows && console.table(res.rows)
            }
        } else {
            res.rows && console.table(res.rows)
        }
    }
}

U.processQuery =  function(pool, query) {
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

U.subQueries = {
    'Update an employee': `SELECT column_name FROM information_schema.columns WHERE table_name = 'employee';`,
    'View all employee ids': 'SELECT id FROM employee;',
    'View role by id': 'SELECT id FROM role;',
}

{ //defining query options
    U.queryOptions = {}
    U.queryOptions['View all departments'] = `SELECT * FROM department;`
    U.queryOptions['View all roles'] = `SELECT * FROM role;`
    U.queryOptions['View all employees'] = `SELECT * FROM employee;`
    U.queryOptions['View all employees by manager'] = `SELECT * FROM employee WHERE manager_id = [manager_id];`
    U.queryOptions['View all employees by department'] = `SELECT * FROM employee WHERE department_id = [department_id];`
    U.queryOptions['View all employees by role'] = `SELECT * FROM employee WHERE role_id = [role_id];`
    U.queryOptions['View all managers'] = `SELECT * FROM employee WHERE manager_id IS null;`
    U.queryOptions['View employee by id'] = `SELECT * FROM employee WHERE id = [employee_id];`
    U.queryOptions['View total utilized budget of a department'] = `SELECT department, SUM(salary) FROM employee WHERE department = '[department]' GROUP BY department;` 
    U.queryOptions['Add a department'] = `INSERT INTO department (name) VALUES ('[name]') RETURNING *;`
    U.queryOptions['Add a role']= ` INSERT INTO role (title, salary, department_id, department) VALUES ('[title]', [salary], [department_id], (SELECT name FROM department WHERE id = [department_id])) RETURNING *; `
    U.queryOptions['Add an employee'] = [`
        INSERT INTO employee (first_name, last_name, role_id, role, department_id, department, salary, manager_id, manager) 
        VALUES ( 
            '[first_name]', 
            '[last_name]', 
            [role_id], 
            (SELECT title FROM role WHERE id = [role_id]), 
            (SELECT department_id FROM role WHERE id = [role_id]), 
            (SELECT department FROM role WHERE id = [role_id]), 
            (SELECT salary FROM role WHERE id = [role_id]), 
            [manager_id], 
            (SELECT CONCAT(first_name, ' ', last_name) FROM employee WHERE id = [manager_id])
        )
        RETURNING *;`
    ]
    U.queryOptions['Update an employee role'] = [`
        WITH role_info AS ( SELECT id, salary, department_id, department FROM role WHERE title = '[new_role]' )
        UPDATE employee SET 
            role = '[new_role]', 
            role_id = (SELECT id FROM role_info), 
            salary = (SELECT salary FROM role_info), 
            department_id = (SELECT department_id FROM role_info),
            department = (SELECT department FROM role_info)
        WHERE id = [employee_id] 
        RETURNING *;`
    ]
    U.queryOptions['Update an employee salary'] = ['UPDATE employee SET salary = [new_salary] WHERE id = [employee_id] RETURNING *;']
    U.queryOptions['Update employee manager'] = [`
        UPDATE employee
        SET
            manager_id = [new_value],
            manager = (SELECT CONCAT(first_name, ' ', last_name) FROM employee WHERE id = [new_value])
        WHERE id = [employee_id]
        RETURNING *;
    `]
    U.queryOptions['Remove a department'] = [`
        BEGIN;
            UPDATE employee SET department_id = NULL WHERE department_id = [department_id];
            DELETE FROM role WHERE department_id = [department_id];
            DELETE FROM department WHERE id = [department_id];
        COMMIT;
    `]
    U.queryOptions['Remove a role'] = [`DELETE FROM role WHERE id = '[role_id]';`, U.queryOptions['View all roles']]
    U.queryOptions['Remove an employee'] = `DELETE FROM employee WHERE id = [employee_id];`
}

U.validateDB = async function(pool, dbName) {
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
}

U.createTable = async function(pool, tables) {
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
                department_id INTEGER NOT NULL REFERENCES department(id) ON DELETE CASCADE,
                department VARCHAR(30) REFERENCES department(name) ON DELETE CASCADE
            );`
        },
        employee: {
            query: `CREATE TABLE IF NOT EXISTS employee (
                id SERIAL PRIMARY KEY, 
                first_name VARCHAR(30) NOT NULL, 
                last_name VARCHAR(30) NOT NULL, 
                role_id INTEGER NOT NULL REFERENCES role(id) ON DELETE SET NULL,
                role VARCHAR(30) REFERENCES role(title) ON DELETE SET NULL,
                department_id INTEGER REFERENCES department(id) ON DELETE SET NULL,
                department VARCHAR(30) REFERENCES department(name) ON DELETE SET NULL,
                salary DECIMAL,
                manager_id INTEGER,
                manager VARCHAR(30)
            );`
        },
    };

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
},

U.replacingPlaceHolders = function(obj, values) {
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

U.capAll = function(str) {
    return str.split(' ').map( word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
},
U.getChoices = async (obj) => {
    let {
        pool, query, 
        keysArray, // the first key is the name and the second key is the value of the choices array
        otherValsObj, // this is an object that will be added to the choices array
        placeHolderVal, // this is an object that will be used to replace placeholders in the query
    } = obj

    otherValsObj = otherValsObj || {} // otherValsObj = otherValsObj || { 'name': 'NULL', 'value': 'NULL' }
    if(placeHolderVal) { query = U.replacingPlaceHolders(query, placeHolderVal).replace('= null', 'IS null') }
    const res = await U.processQuery(pool,  query)
    // combining values into one if there are multiple keys in the same string key
    const vals = (row, keysStr)=> keysStr.split(',').map( key => row[key.trim()]).join(' ')
    // creating choices array and adding otherValsObj to it if it exists
    const data = [...res.rows.map( row => { return {...row, 'name': vals(row, keysArray[0]), 'value': vals(row, keysArray[1])  } } ), otherValsObj]
        .filter( row => Object.values(row).length)
    return data
},

U.validateEmployeeId = async (obj) => {
    const { pool, val, queryOptions } = obj;
    // checking if the employee ID is empty
    if (('' + val).length === 0) { return 'Please enter an employee id' }
    if (isNaN(+val)) { return U.c('Please enter a valid number','y') }
    // getting all employee ids
    let employees_ids = await U.getChoices({ pool, query: queryOptions['View all employee ids'], keysArray: ['id', 'id'] })
    employees_ids = employees_ids.map(row => row.id + '').filter(id => !isNaN(+id))
    // checking if employee id exists
    if (employees_ids.indexOf(val) < 0) { return U.c('Employee id does not exist. Check the id and try again.', 'y') }
    return true
}

U.getInquirerQuestions = (pool, queryOptions, exitText) => {
    let q = queryOptions

    return {
        'initialQuestion': [
            {   name: 'options', type:'list', message: `Options:`, choices: [...Object.keys(q), exitText] }
        ],
        'View employee by id': [
            { name: 'employee_id', type: 'input', message: 'Employee id:', 
                validate: (val) => U.validateEmployeeId({pool, val, 'queryOptions': U.subQueries}),
            }
        ],
        'View all employees by manager': [
            { name: 'manager_id', type: 'list', message: 'Select a manager:',
                choices: async  () => await U.getChoices({pool, 'query': q['View all managers'], 'keysArray': ['first_name, last_name', 'id'], otherValsObj: { 'name': 'NULL', 'value': 'NULL' } })
            }
        ],
        'View all employees by department': [
            { name: 'department_id', type: 'list', message: 'Select a department:',
                choices: async  () => await U.getChoices({pool, query: q['View all departments'], keysArray: ['name', 'id'] })
            }
        ],
        'View all employees by role': [
            { name: 'role_id', type: 'list', message: 'Select a role:',
                choices: async  () => await U.getChoices({pool, query: q['View all roles'], keysArray: ['title', 'id'] } )
            }
        ],
        'View total utilized budget of a department': [
            { name: 'department', type: 'list', message: 'Select a department:',
                choices: async  () => await U.getChoices({pool, query:q['View all departments'], keysArray:['name', 'name'] })
            }
        ],
        'Add a department': [
            { name: 'name', type: 'input', message: 'Enter department name:', 
                validate: async (val) => { // checking if department already exists
                    const department = await U.getChoices({pool, query: q['View all departments'], keysArray: ['name', 'id'] })
                    if(department.map( row => row.name).includes(val)) { return 'Department already exists'}
                    return val.length > 0 ? true : 'Please enter a department name'
                },
                filter: (val) => U.capAll(val.trim())
            }
        ],
        'Add an employee': [
            { name: 'first_name', type: 'input', message: `Enter ${U.c('First Name')}:`, 
                validate: (val) => val.length > 0 ? true : 'Please enter a first name',
                filter: (val) => U.capAll(val.trim())
            },
            { name: 'last_name', type: 'input', message: `Enter ${U.c('Last Name')}:`,
                validate: (val) => val.length > 0 ? true : 'Please enter a last name',
                filter: (val) => U.capAll(val.trim())
            },
            { name: 'role_id', type: 'list', message: 'Under What Role:', 
                choices: async  () => await U.getChoices({pool, query: q['View all roles'], keysArray: ['title', 'id'] })
            },
            { name: 'manager_id', type: 'list', message: 'Under what Manager:', 
                choices: async  () => await U.getChoices({pool, query: q['View all managers'], keysArray: ['first_name, last_name', 'id'] })
            },
        ],
        'Add a role': [
            { name: 'title', type: 'input', message: 'Enter role title:',
                filter: (val) => U.capAll(val.trim()),
                validate: async (val) => { // checking if role already exists
                    if(val.length == 0) { return 'Please enter a role title' }
                    const roles = await U.getChoices({pool, query: q['View all roles'], keysArray: ['title', 'id'] })
                    if(roles.map( row => row.name).includes(val)) { return 'Role already exists'}
                    return val.length > 0 ? true : 'Please enter a role title'
                }
            },
            { name: 'salary', type: 'input', message: 'Enter salary:', 
                validate: (val) => {
                    if(isNaN(+val)) { return 'Please enter a valid number'}
                    if(val.length == 0) { return 'Please enter a salary'}
                    return true
                },
            },
            { name: 'department_id', type: 'list', message: 'Under what department do you want to add it:', 
                choices: async  () => await U.getChoices({pool, query: q['View all departments'], keysArray: ['name', 'id']}) //
            },
        ],
        'Update an employee role': [
            { name: 'employee_id', type: 'input', message: 'Employee id:', 
                validate: (val) => U.validateEmployeeId({pool, val, 'queryOptions': U.subQueries}),
            },
            { name: 'new_role', type: 'list', message: 'Select a role:', 
                choices: async () => (await U.getChoices({ pool, query: U.queryOptions['View all roles'], keysArray: ['title', 'title']})) //
            },
        ],
        'Update an employee salary': [
            { name: 'employee_id', type: 'input', message: 'Employee id:',
                validate: (val) => U.validateEmployeeId({pool, val, 'queryOptions': U.subQueries}),
            },
            { name: 'new_salary', type: 'input', message: 'Enter new salary:',
                validate: (val) => {
                    if(isNaN(+val)) { return 'Please enter a valid number'}
                    if(val.length == 0) { return 'Please enter a salary'}
                    return true
                },
            }
        ],
        'Update employee manager': [
            { name: 'employee_id', type: 'input', message: 'Employee id:',
                validate: (val) => U.validateEmployeeId({pool, val, 'queryOptions': U.subQueries}),
            },
            { name: 'new_value', type: 'list', message: 'Select a manager:',
                choices: async  () => await U.getChoices({ pool, query: q['View all managers'], keysArray: ['first_name, last_name', 'id'], otherValsObj: { 'name': 'NULL', 'value': 'NULL' }  } )
            }
        ],
        'Remove a department': [
            { name: 'department_id', type: 'input', message: 'Deparment Id:',
                validate: async (val) => {
                    if(val.length == 0) { return 'Please enter a department id'}
                    if(isNaN(+val)) { return 'Please enter a valid number'}
                    const employees = await U.getChoices({pool, query: q['View all employees by department'], keysArray: ['first_name', 'id'], placeHolderVal: {department_id: val} }) //
                    if (employees.length > 0) {
                        return `Cannot remove department. Move the employees to another department first`;
                    }
                    return true
                }
            }
        ],
        'Remove a role': [
            { name: 'role_id', type: 'input', message: `What role do you want to ${U.c('remove','r')}:`, 
                validate: async (val) => {
                    if(val.length == 0) { return U.c('Please enter a role id', 'y')}
                    if(isNaN(+val)) { return 'Please enter a valid number'}
                    const employees = await U.getChoices({pool, query: q['View all employees by role'], keysArray: ['first_name', 'id'], placeHolderVal: {role_id: val} }) //
                    if (employees.length > 0) {
                        return `Cannot remove role. Move the employees to another role first`;
                    }
                    return true 
                }
            }
        ],
        'Remove an employee': [
            { name: 'employee_id', type: 'input', message: 'Employee Id:',
                validate: (val) => U.validateEmployeeId({pool, val, 'queryOptions': U.subQueries}),
            },
        ],
    }
}

module.exports = U