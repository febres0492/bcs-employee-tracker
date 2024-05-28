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

const options = {
    'Add a department': `INSERT INTO department (name) VALUES ('Engineering');`,
    'Add an employee': `INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ('John', 'Doe', 1, 1);`,
    'Add a role': `INSERT INTO role (title, salary, department_id) VALUES ('Software Engineer', 90000, 1);`,
    'Update an employee role': `SELECT * FROM employee;`,
    'View all departments': `SELECT * FROM department;`,
    'View all roles': `SELECT * FROM role;`,
    'View all employees': `SELECT * FROM employee;`,
}

// defining inquirer questions
const questions = [
    {   name: 'options', type:'list', message: `Options:\n`,
        choices: [ 'View all departments', 'View all roles', 'View all employees', 
            'Add a department', 'Add a role', 'Add an employee', 'Update an employee role'
        ],
    }
]

async function main(){
    let pool = new Pool(databaseConfig)

    // checking if database exists
    let newDbName = 'employee_db'
    U.validateDB(pool, newDbName)

    // connecting to the new database
    pool = new Pool({...databaseConfig, database: newDbName})
    
    // creating tables
    await U.createTable(pool)

    const answers = await inquirer.prompt(questions)
    const query = options[answers.options]
    const res = U.processQuery(pool, query)

    console.log(c(res.rows))
    console.time('Time taken')

    pool.end()
    console.timeEnd('Time taken')

}
main()