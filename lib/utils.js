const colors = require('colors')


const utils = {
    replacingPlaceHolders: function(obj, values) {
        let objStr = typeof obj != 'string' ? JSON.stringify(obj, null, 2) : obj
        const regex = /\[([^\[\]]+)\]/g
    
        // replacing placeholders with value
        objStr = objStr.replace(regex, (match, key) => {
            if(key in values) {
                let newVal = (values[key]+'').replace(regex, (m, k)=> values[k])
                newVal = newVal == 'undefined' ? values[key] : newVal
                return newVal
            }
        })
        return objStr
    },
    c: function(str='null', color = 'g'){ 
        const opt = { r: 'red', g: 'green', y: 'yellow', b: 'blue'}
        return colors[opt[color]](str) 
    },
    viewDepartments: function (){
        console.log('viewDepartments')
    },
    viewRoles: function (){
        console.log('viewRoles')
    },
    viewEmployees: function (){
        console.log('viewEmployees')
    },
    addDepartment: function (){
        console.log('addDepartment')
    },
    addRole: function (){
        console.log('addRole')
    },
    addEmployee: function (){
        console.log('addEmployee')
    },
    updateEmployeeRole: function (){
        console.log('updateEmployeeRole')
    },
}
module.exports = utils