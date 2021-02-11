const conf = require('./init')
const login = require('./crawler/casLogIn')
const { signApp } = require('./campusphere/app')

/**
 * Keys of this cookie Object:
 * YOU CAN USE THIS COOKIE FOR EVERYTHING
 * @compusphere something about cp daliy's app
 * @swms continuing log into your school's swms [stu work magagement system]
 */
let cookie

// purely for handleCookie func
let storeCookiePath, sign

// get|store|update cookie synchronizedly
async function handleCookie(users, school) {
  for (let i of users) {
    storeCookiePath = `cookie.${i.alias || i.username}`
    await handleLogin(i, conf.get(storeCookiePath), school)
  }
}

async function handleLogin(i, storedCookie, school) {
  const name = i.alias || i.username

  // Check if the cookie is user-provided
  if (!i.cookie) {
    // Check if the cookie is stored
    if (!storedCookie) {
      cookie = await login(school, i)
      storeCookie(storeCookiePath, i, cookie)
    } else {
      storeCookie(storeCookiePath, i)
    }

    // Check if the cookie is eligible, if not, reLogin 1 more time
    sign = new signApp(school, i)
    const isNeedLogIn = await sign.signInfo(cookie)
    if (isNeedLogIn) {
      console.log(`${name}: cookie is not eligible, reLogin`)
      cookie = await login(school, i)
      storeCookie(storeCookiePath, i, cookie)
    }
  } else {
    console.log(`${name}: Using user provided cookie`)
  }
}

function storeCookie(path, i, set) {
  const name = i.alias || i.username
  if (set) {
    conf.set(storeCookiePath, set)
    console.log(`${name}: Cookie stored to local storage`)
  } else {
    cookie = conf.get(path)
    console.log(`${name}: Using stored cookie`)
  }
}

module.exports = { handleCookie, conf }
