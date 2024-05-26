const colors = require('colors')

function c(str='null', color = 'g'){ 
    const opt = { r: 'red', g: 'green', y: 'yellow', b: 'blue'}
    return colors[opt[color]](str) 
}

function replacingPlaceHolders(obj, values) {
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
}

module.exports = { c, replacingPlaceHolders }