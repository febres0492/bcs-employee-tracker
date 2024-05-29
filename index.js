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
    'Add a department': `INSERT INTO department (name) VALUES ('[name]');`,
    'Remove a department': `DELETE FROM department WHERE name = '[name]';`,
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

    // getting choices from database for inquirer questions
    const getChoices = async (query) => {
        const res = await U.processQuery(pool, query)
        return res.rows.map(row => row.name)
    }

    // defining inquirer questions
    const exitText = c('Exit program?\n', 'y')
    const inquirerQuestions = {
        'initialQuestion': [
            {   name: 'options', type:'list', message: `Options:`,
                choices: [ 
                    'View all departments', 'View all roles', 'View all employees', 
                    'Add a department', 'Add a role', 'Add an employee', 'Update an employee role', 
                    'Remove a department', 'Remove a role', 'Remove an employee', exitText
                ],
            }
        ],
        'Add a department': [
            { name: 'name', type: 'input', message: 'Enter department name:', validate: function(value) {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter a department name';
                }
            }}
        ],
        'Remove a department': [
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
            // { name: 'department_id', type: 'input', message: 'Enter department id:' },
            { 
                name: 'department_id', type: 'list', message: 'Under what department:', 
                choices: getChoices('View all departments')
            },
        ],
        'Update an employee role': [
            { name: 'employee_id', type: 'input', message: 'Enter employee id:' },
            { name: 'role_id', type: 'input', message: 'Enter role id:' },
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

        // if(answers.options.indexOf('Remove') > -1){ 
        //     query = U.replacingPlaceHolders(query, answers )
        //     debugger
        // }

        const res = await U.processQuery(pool, query)
        console.log(c(res.rows),'\n')

        // resetting the question to the initial question
        if(curQuestion != inquirerQuestions['initialQuestion']){
            curQuestion = inquirerQuestions['initialQuestion']
        }
    }

    // const answers = await inquirer.prompt(questions['initialQuestion'])
    // // const query = options[answers.options]
    
    // const res = await U.processQuery(pool, query)

    // console.log(c(res.rows))

    await pool.end()

    // this is just to stop the process. sometimes it takes over 5 seconds to stop
    process.exit(0)
}
main()