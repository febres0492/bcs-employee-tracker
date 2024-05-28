const inquirer = require('inquirer')
const c = require('./lib/utils').c
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

// defining inquirer questions
const questions = {
    'initialQuestion': [
        {   name: 'options', type:'list', message: `Options:`,
            choices: [ 'View all departments', 'View all roles', 'View all employees', 
                'Add a department', 'Add a role', 'Add an employee', 'Update an employee role', c('Exit program\n','y')
            ],
        }
    ],
    'Add a department': [
        { name: 'name', type: 'input', message: 'Enter department name:' }
    ],
    'Add an employee': [
        { name: 'first_name', type: 'input', message: 'Enter first name:' },
        { name: 'last_name', type: 'input', message: 'Enter last name:' },
        { name: 'role_id', type: 'input', message: 'Enter role id:' },
        { name: 'manager_id', type: 'input', message: 'Enter manager id:' },
    ],
    'Add a role': [
        { name: 'title', type: 'input', message: 'Enter role title:' },
        { name: 'salary', type: 'input', message: 'Enter salary:' },
        { name: 'department_id', type: 'input', message: 'Enter department id:' },
    ],
    'Update an employee role': [
        { name: 'employee_id', type: 'input', message: 'Enter employee id:' },
        { name: 'role_id', type: 'input', message: 'Enter role id:' },
    ],
    'Exit program': [
        { name: 'exit', type: 'list', message: `${c('End execution?\n','y')}`, choices: ['yes', 'no'] }
    ]
}

const options = {
    'Add a department': `INSERT INTO department (name) VALUES ('Engineering');`,
    'Add an employee': `INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ('John', 'Doe', 1, 1);`,
    'Add a role': `INSERT INTO role (title, salary, department_id) VALUES ('Software Engineer', 90000, 1);`,
    'Update an employee role': `SELECT * FROM employee;`,
    'View all departments': `SELECT * FROM department;`,
    'View all roles': `SELECT * FROM role;`,
    'View all employees': `SELECT * FROM employee;`,
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

    let curQuestion = questions['initialQuestion']
    let done = false
    while (done == false) {
        const answers = await inquirer.prompt(curQuestion)



        // const query = options[answers.options]
        // const res = await U.processQuery(pool, query)
        console.log(c(res.rows))

        // end the loop if the user selects the initial question
        if(curQuestion != questions['initialQuestion']){
            done = true
        }
    }

    const answers = await inquirer.prompt(questions['initialQuestion'])
    // const query = options[answers.options]
    
    const res = await U.processQuery(pool, query)

    console.log(c(res.rows))

    await pool.end()

    // this is just to stop the process. sometimes it takes over 5 seconds to stop
    process.exit(0)
}
main()