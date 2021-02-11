const { handleCookie, conf } = require('./cea')
const { signApp } = require('./campusphere/app')

let users, school
async function handler() {
  await conf.load()
  // Grab users array
  users = conf.get('users')
  // Grab school info
  school = conf.get('school')
  // Log in and save cookie to conf, using conf.get('cookie') to get them
  await handleCookie(users, school)
  // wait * minute for signing
  await sleep(0)
  // Sign in
  await signIn()
}

async function sleep(timeout) {
  return new Promise(r => setTimeout(r, timeout * 1000 * 60))
}

async function signIn() {
  // sign in asynchronizedly with promise all and diff instance of signApp class
  await Promise.all(
    users.map(async i => {
      const cookie = i.cookie
        ? { campusphere: i.cookie }
        : conf.get(`cookie.${i.alias || i.username}`)

      const sign = new signApp(school, i)

      await sign.signInfo(cookie)
      await sign.signWithForm()
    })
  )
}

exports.main = handler
handler()