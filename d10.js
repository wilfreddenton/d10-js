const axios = require('axios')
const fs = require('fs')
const { JSDOM } = require('jsdom')

const url = 'https://acrnm.com/'
const EVENT_PREFIX = 'acrnm'
const DROP_EVENT = `${EVENT_PREFIX}_drop`
const ERROR_EVENT = `${EVENT_PREFIX}_error`
const IFTTT_KEY = JSON.parse(fs.readFileSync('./config.json'))['ifttt_key']

function hook_url(event) {
    return `https://maker.ifttt.com/trigger/${event}/with/key/${IFTTT_KEY}`
}

async function fetch(url) {
    const res = await axios.get(url, {
        'maxRedirects': 0,
        'timeout': 10000
    })
    return new JSDOM(res.data).window.document
}

async function dispatch(event, data=null) {
    await axios.post(hook_url(event), {value1: data}, {'timeout': 10000})
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run(products) {
    document = await fetch(url)
    if (!document.querySelector('.tile-list-wrapper')) {
        throw new Error("The downloaded HTML is not acrnm.com.")
    }

    const _products = {}
    document.querySelectorAll('.tile .name').forEach((element) => {
        _products[element.innerHTML] = null
    })

    for (p in _products) {
        if (!(p in products)) {
            await dispatch(DROP_EVENT, p)
            break
        }
    }

    return _products
}

(async () => {
    let products = {}
    while (true) {
        try {
            products = await run(products)
        } catch (error) {
            await dispatch(ERROR_EVENT, error.stack)
        }

        await sleep(60000)
    }
})()
