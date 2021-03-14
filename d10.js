const axios = require('axios')
const fs = require('fs')
const { exec } = require('child_process')
const { JSDOM } = require('jsdom')

const url = 'https://acrnm.com/'
const EVENT_PREFIX = 'acrnm'
const DROP_EVENT = `${EVENT_PREFIX}_drop`
const ERROR_EVENT = `${EVENT_PREFIX}_error`
const IFTTT_KEY = JSON.parse(fs.readFileSync('./config.json'))['ifttt_key']
const STATE = {products: {}}

function hook_url(event) {
    return `https://maker.ifttt.com/trigger/${event}/with/key/${IFTTT_KEY}`
}

async function curl(url) {
  return new Promise((resolve, reject) => {
    exec(
      `curl -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.89 Safari/537.36" --max-time 10 ${url}`,
      (err, stdout) => {
        if (err) {
          reject(err)
        } else {
          resolve(stdout)
        }
      })
  })
}

async function dispatch(event, data=null) {
    await axios.post(hook_url(event), {value1: data}, {'timeout': 10000})
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function run(products) {
    const html = await curl(url)
    const document = new JSDOM(html).window.document
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
    while (true) {
        try {
            STATE.products = await run(STATE.products)
        } catch (err) {
            await dispatch(ERROR_EVENT, err.stack)
        }

        await sleep(60000)
    }
})()
