const fetch = require('node-fetch')
const yaml = require('js-yaml')
const fs = require('fs')
const log = require('./interface/colorLog')
const CloudBase = require('@cloudbase/manager-node')
const { functions } = new CloudBase({})

// Make full use of functions `hot context`
// https://docs.cloudbase.net/cloud-function/deep-principle.html#shi-li-fu-yong
class Conf {
  get(key) {
    const conf = process.env.conf
    return this[key] || (conf ? JSON.parse(conf)[key] : null)
  }
  set(key, value) {
    this[key] = value
    let timeUpdater
      // Store conf as env, this shall not block function runtime
    ;(() => {
      timeUpdater ? clearTimeout(timeUpdater) : null
      timeUpdater = setTimeout(
        () =>
          functions.updateFunctionConfig({
            name: 'cea',
            envVariables: { conf: JSON.stringify(this) },
          }),
        10000
      )
    })()
  }
}

const conf = new Conf()
module.exports = conf
module.exports.load = async () => {
  const path = './conf.yml'
  if (fs.existsSync(path)) {
    const doc = yaml.load(fs.readFileSync(path, 'utf8'))
    if (!doc) return
    initUser(doc)
    if (!conf.get('school')) await initSchool(doc)
  } else {
    return
  }
}

function initUser(doc) {
  conf.set('users', doc.users)
}

async function initSchool(doc) {
  const schoolId = doc.school
  let res = await fetch(
    `https://mobile.campushoy.com/v6/config/guest/tenant/info?ids=${schoolId}`
  ).catch(err => err)

  res = await JSON.parse(await res.text())

  const origin = new URL(res.data[0].ampUrl).origin
  const isSignAtHome = doc.home
  const school = {
    origin,
    isSignAtHome,
    login: `${res.data[0].idsUrl}/login?service=${encodeURIComponent(
      origin
    )}/portal/login`,
    campusphere: `${origin}/portal/login`,
    checkCaptcha: `${res.data[0].idsUrl}/checkNeedCaptcha.htl`,
    getCaptcha: `${res.data[0].idsUrl}/getCaptcha.htl`,
  }

  const schoolName = res.data[0].name

  if (!isSignAtHome) {
    // get school address & coordinates(with baidu website's ak)
    res = await fetch(
      `https://api.map.baidu.com/?qt=s&wd=${encodeURIComponent(
        schoolName
      )}&ak=E4805d16520de693a3fe707cdc962045&rn=10&ie=utf-8&oue=1&fromproduct=jsapi&res=api`
    )
    res = await res.json()
    const { addr } = res.content[0]
    school.addr = addr
  }

  conf.set('school', school)
  log.success(
    `您的学校 ${schoolName} 已完成设定, 全局签到地址为：${
      school.addr ? school.addr : 'RANDOM'
    }`
  )
}
