const inquirer = require('inquirer')
const c = require('./lib/utils').c // this is to give colors to the console.log
const U = require('./lib/utils')
const { Pool } = require('pg')

let dbName = 'postgres'
const databaseConfig = {
    user: 'postgres',
    password: '0492',
    host: 'localhost',
    database: dbName,
    port: 5432,
}

const queryOptions = {
    'View all departments': `SELECT * FROM department;`,
    'View all roles': `SELECT * FROM role;`,
    'View all employees': `SELECT * FROM employee;`,
    'View all employees by manager': `SELECT * FROM employee WHERE manager_id = [manager_id];`,
    'View all employees by department': `SELECT * FROM employee WHERE department_id = [department_id];`,
    'View all employees by role': `SELECT * FROM employee WHERE role_id = [role_id];`,
    'View all managers': `SELECT * FROM employee WHERE manager_id IS null;`,
    'Add a department': `INSERT INTO department (name) VALUES ('[name]');`,
    'Add an employee': `
        INSERT INTO employee (first_name, last_name, role_id, position, department_id, department, manager_id, manager) 
        VALUES (
            '[first_name]', 
            '[last_name]', 
            [role_id], 
            (SELECT title FROM role WHERE id = [role_id]), 
            (SELECT department_id FROM role WHERE id = [role_id]), 
            (SELECT department FROM role WHERE id = [role_id]), 
            [manager_id],
            (SELECT CONCAT(first_name, ' ', last_name) FROM employee WHERE id = [manager_id])
        );
    `,
    'Add a role': `
        INSERT INTO role (title, salary, department_id, department) 
        VALUES ('[title]', [salary], [department_id], (SELECT name FROM department WHERE id = [department_id]));
    `,
    'Update an employee role': `SELECT * FROM employee;`,
    'Remove a department': `DELETE FROM department WHERE id = [id];`,
    'Remove a role': `DELETE FROM role WHERE title = '[title]';`,
    'Remove an employee': `DELETE FROM employee WHERE id = [employee_id];`,
}

async function main(){
    let pool = new Pool(databaseConfig)

    // checking if database exists
    let newDbName = 'employee_db'
    await U.validateDB(pool, newDbName)

    // connecting to the new database
    pool = new Pool({...databaseConfig, database: newDbName})
    
    // creating tables
    await U.createTable(pool)

    // const test = await U.processQuery(pool, `ALTER TABLE role ADD COLUMN department VARCHAR(30) REFERENCES department(name);`)
    // const test = await U.processQuery(pool, `ALTER TABLE employee ADD COLUMN manager VARCHAR(30);`)
    // console.log(test)

    const getChoices = async (pool, queryString, keysArray, otherValsObj = { 'name': 'None', 'value': null }) => {
        const res = await U.processQuery(pool,  queryOptions[queryString])
        const vals = (row, keysStr)=> keysStr.split(',').map( key => row[key.trim()]).join(' ')
        return [...res.rows.map( row => { return { 'name': vals(row, keysArray[0]), 'value': vals(row, keysArray[1]) } } ), otherValsObj]
    }

    // defining inquirer questions
    const exitText = c('-- Exit program --', 'y')
    const inquirerQuestions = {
        'initialQuestion': [
            {   name: 'options', type:'list', message: `Options:`,
                choices: [ 
                    'View all departments', 'View all roles', 'View all employees', 'View all employees by manager', 
                    'View all employees by department', 'View all employees by role', 'View all managers', 
                    'Add a department', 'Add a role', 'Add an employee', 'Update an employee role', 
                    'Remove a department', 'Remove a role', 'Remove an employee', exitText
                ],
            }
        ],
        'View all employees by manager': [
            { name: 'manager_id', type: 'list', message: 'Select a manager:',
                choices: async  () => await getChoices(pool, 'View all managers', ['first_name, last_name', 'id'] )
            }
        ],
        'View all employees by department': [
            { name: 'department_id', type: 'list', message: 'Select a department:',
                choices: async  () => await getChoices(pool, 'View all departments', ['name', 'id'] )
            }
        ],
        'View all employees by role': [
            { name: 'role_id', type: 'list', message: 'Select a role:',
                choices: async  () => await getChoices(pool, 'View all roles', ['title', 'id'] )
            }
        ],
        'Add a department': [
            { name: 'name', type: 'input', message: 'Enter department name:', 
                validate: (val) => val.length ? true : 'Please enter a department name',
                filter: (val) => U.capFirst(val.trim())
            }
        ],
        'Add an employee': [
            { name: 'first_name', type: 'input', message: `Enter ${c('First Name')}:`, 
                validate: (val) => val.length > 0 ? true : 'Please enter a first name',
                filter: (val) => U.capFirst(val.trim())
            },
            { name: 'last_name', type: 'input', message: `Enter ${c('Last Name')}:`,
                validate: (val) => val.length > 0 ? true : 'Please enter a last name',
                filter: (val) => U.capFirst(val.trim())
            },
            { name: 'role_id', type: 'list', message: 'Under What Role:', 
                choices: async  () => await getChoices(pool, 'View all roles', ['title', 'id'] )
            },
            { name: 'manager_id', type: 'list', message: 'Under what Manager:', 
                choices: async  () => await getChoices(pool, 'View all managers', ['first_name, last_name', 'id'] )
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
                choices: async  () => await getChoices(pool, 'View all departments', ['name', 'id'] )
            },
        ],
        'Update an employee role': [
            { name: 'employee_id', type: 'input', message: 'Enter employee id:' },
            { name: 'role_id', type: 'input', message: 'Enter role id:' },
        ],
        'Remove a department': [
            { name: 'name', type: 'input', message: 'What department would you like to remove:',
                choices: async  () => await getChoices(pool, 'View all departments', ['name', 'id'] )
            }
        ],
        'Remove a role': [
            { name: 'title', type: 'list', message: `What role do you want to ${c('remove','r')}:`, 
                choices: async  () => await getChoices(pool, 'View all roles', ['title', 'title'] )
            }
        ],
        'Remove an employee': [
            { name: 'employee_id', type: 'list', message: 'What Employee would you like to remove:',
                choices: async  () => await getChoices(pool, 'View all employees', ['first_name, last_name', 'id'] )
            },
        ],
    }

    let continueExecution = true
    let curQuestion = inquirerQuestions['initialQuestion']
    let query = 'View all departments'

    const exiting = () => {
        continueExecution = false
        console.log('Exiting program...')
        process.exit(0)
    }

    while (continueExecution == true) {

        const answers = await inquirer.prompt(curQuestion)

        // checking if the user wants to exit the program
        if(answers.options ==  exitText){ exiting() }

        // checking if answer is a key in inquirerQuestions
        if(Object.keys(inquirerQuestions).includes(answers.options)){
            curQuestion = inquirerQuestions[answers.options]
            query = queryOptions[answers.options]
            continue
        } 

        if(curQuestion == inquirerQuestions['initialQuestion']){ 
            query = queryOptions[answers.options]
        }else{
            query = U.replacingPlaceHolders(query, answers )
        }

        // console.log('answers', answers)
        console.log('query', query)
        if(curQuestion == inquirerQuestions['Add an employee']) console.log('answers', answers)
        // debugger

        const res = await U.processQuery(pool, query)
        
        // if(answers.options?.indexOf('View all em') != -1){ 
        //     let filteredColumns = Object.keys(res.rows[0]).filter( key => key.indexOf('_id') == -1)
        //     console.table(res.rows, filteredColumns)
        // } else {
        // }
        console.table(res.rows)
        
        console.log('\n') // just to make the console look better

        // resetting the question to the initial question
        if(curQuestion != inquirerQuestions['initialQuestion']){
            curQuestion = inquirerQuestions['initialQuestion']
        }
    }
    await pool.end()
    process.exit(0) // this is just to stop the process. Sometimes it takes too long to stop
}
main()