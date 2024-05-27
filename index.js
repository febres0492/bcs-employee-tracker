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

const pool = new Pool(databaseConfig)

U.listDatabases(pool);

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