const inquirer = require('inquirer')
const c = require('./lib/utils').c
const U = require('./lib/utils')
const { Pool } = require('pg');
const PORT = process.env.PORT || 3001;

// Connect to the database
const pool = new Pool(
    {
      user: 'postgres',
      password: '0492',
      host: 'localhost',
      database: 'departments',
    },
    console.log(`Connected to the departments database.`)
)

// defining inquirer questions
const questions = [
    {   name: 'options', type:'list', message: `Options:\n`,
        choices: [ 'View all departments', 'View all roles', 'View all employees', 
            'Add a department', 'Add a role', 'Add an employee', 'Update an employee role'
        ],
    }
]

const options = {
    'View all departments': U.viewDepartments,
    'View all roles': U.viewRoles,
    'View all employees': U.viewEmployees,
    'Add a department': U.addDepartment,
    'Add a role': U.addRole,
    'Add an employee': U.addEmployee,
    'Update an employee role': U.updateEmployeeRole
}

inquirer.prompt(questions).then(answers => {
    console.log(c('test', 'r'), options[answers.options]() )
})