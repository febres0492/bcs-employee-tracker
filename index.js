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

async function main(){
    let pool = new Pool(databaseConfig)

    // checking if database exists
    let newDbName = 'employee_test3'
    await U.validateDB(pool, newDbName)

    // connecting to the new database
    pool = new Pool({...databaseConfig, database: newDbName})
    const query = `SELECT current_database()`

    U.processQuery(pool, query).then(async (res, client) => {
        console.log(res)
    })
}

main()
// console.log(24, pool)

// const query = `
//     INSERT INTO ${newDbName} (name, position, department, salary)
//     VALUES ($1, $2, $3, $4)
//     RETURNING *;
// `;

// const query = `
//     CREATE TABLE employees (
//         id SERIAL PRIMARY KEY,
//         name VARCHAR(100),
//         position VARCHAR(100),
//         department VARCHAR(100),
//         salary NUMERIC
//     );
// `





// defining inquirer questions
const questions = [
    {   name: 'options', type:'list', message: `Options:\n`,
        choices: [ 'View all departments', 'View all roles', 'View all employees', 
            'Add a department', 'Add a role', 'Add an employee', 'Update an employee role'
        ],
    }
]

const options = {
    'Add a department': U.addDepartment,
    'Add an employee': U.addEmployee,
    'Add a role': U.addRole,
    'Update an employee role': U.updateEmployeeRole,
    'View all departments': U.viewDepartments,
    'View all roles': U.viewRoles,
    'View all employees': U.viewEmployees,
}

// inquirer.prompt(questions).then(answers => {
//     answers.options = 'Add a department'
//     options[answers.options](pool)
// })