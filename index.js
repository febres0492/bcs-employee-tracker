const inquirer = require('inquirer')
const c = require('./lib/utils').c
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
        choices: ['View all departments', 'View all roles', 'View all employees', 'Add a department', 'Add a role', 'Add an employee', 'Update an employee role'],
    }
]

// defining inquirer questions for adding a department
const addDepartmentQuestions = [
    {   name: 'department', type:'input', message: `Enter the department name: ` }
]

