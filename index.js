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

    // defining inquirer questions
    const inquirerQuestions = U.getInquirerQuestions({ pool })
    
    let continueExecution = true
    let curQuestion = inquirerQuestions['initialQuestion']
    let query = ['View all departments']

    while (continueExecution == true) {
        console.log('\n') // adding space between questions
        console.log(c(`If choices not responding tap ${c('"Enter"')} then arrow down.`,'gy'))

        // logging exit instructions
        if(curQuestion[0].type == 'input'){console.log(c(`Enter ${c('"exit"')} to quit`, 'gy'))}

        const answers = await inquirer.prompt(curQuestion)

        // restarting question if the user selects an invalid action or want to exit
        let exitValue = Object.values(answers).find( (val) => val.toLowerCase().indexOf('exit') > -1)
        exitValue = exitValue ? exitValue.toLowerCase() : null
        if(U.actitonMessages.hasOwnProperty(exitValue)) { 
            curQuestion = inquirerQuestions['initialQuestion']
            console.log(c(U.actitonMessages[exitValue], 'y'))
            continue 
        } 

        // checking if the user wants to exit the program
        if(answers.options ==  U.actitonMessages.exitText){ 
            continueExecution = false
            console.log('Exiting program...')
            process.exit(0)
        }

        // checking if answer is a key in inquirerQuestions
        if(Object.keys(inquirerQuestions).includes(answers.options)){
            curQuestion = inquirerQuestions[answers.options]
            query = U.queryOptions[answers.options]
            continue
        } 
        
        query = U.formatingQuery(query, curQuestion, inquirerQuestions,  answers)

        await U.sendQuery(pool, query, answers)
        
        // resetting the question to the initial question
        if(curQuestion != inquirerQuestions['initialQuestion'] ){
            curQuestion = inquirerQuestions['initialQuestion']
        }
    }
    await pool.end()
    process.exit(0) // this is just to stop the process. Sometimes it takes too long to stop
}
main()