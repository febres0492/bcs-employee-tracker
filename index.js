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

async function main(){
    let pool = new Pool(databaseConfig)

    // checking if database exists
    let newDbName = 'employee_db'
    await U.validateDB(pool, newDbName)

    // connecting to the new database
    pool = new Pool({...databaseConfig, database: newDbName})
    
    // creating tables
    await U.createTable(pool)

    // const test = await U.processQuery(pool, `ALTER TABLE employee RENAME COLUMN position TO role; `)
    // const test = await U.processQuery(pool, `ALTER TABLE role DROP COLUMN manager_id; `)

    // defining inquirer questions
    const exitText = c('-- Exit program --', 'y')
    const inquirerQuestions = U.getInquirerQuestions(pool, U.queryOptions, exitText)

    let continueExecution = true
    let curQuestion = inquirerQuestions['initialQuestion']
    let query = ['View all departments']

    const exiting = () => {
        continueExecution = false
        console.log('Exiting program...')
        process.exit(0)
    }

    while (continueExecution == true) {
        console.log('\n') // adding space between questions
        console.log(c(`If choices not responding tap ${c('Enter')} then arrow down.`,'gy'))

        const answers = await inquirer.prompt(curQuestion)

        // checking if the user wants to exit the program
        if(answers.options ==  exitText){ exiting() }

        // checking if answer is a key in inquirerQuestions
        if(Object.keys(inquirerQuestions).includes(answers.options)){
            curQuestion = inquirerQuestions[answers.options]
            query = U.queryOptions[answers.options]
            continue
        } 
        
        // checking if the user selected the manager column
        if(answers.hasOwnProperty('selected_column') && answers.selected_column == 'manager'){
            const columns = ['manager_id', 'manager']
            query = columns.map( col => {
                const obj = {'selected_column': col, 'new_value': answers.new_value?.value, 'employee_id': answers.employee_id}
                if(col == 'manager') {obj.new_value = answers.new_value.name}
                return U.formatingQuery(query, curQuestion, obj, answers)
            })

        }else{
            query = U.formatingQuery(query, curQuestion, inquirerQuestions,  answers)
        }

        await U.sendQuery(pool, query, answers)
        
        // resetting the question to the initial question
        if(curQuestion != inquirerQuestions['initialQuestion']){
            curQuestion = inquirerQuestions['initialQuestion']
        }
    }
    await pool.end()
    process.exit(0) // this is just to stop the process. Sometimes it takes too long to stop
}
main()