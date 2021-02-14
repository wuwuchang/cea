const fetch = require('node-fetch')
const yaml = require('js-yaml')
const fs = require('fs')
const conf = require('@beetcb/tcb-conf')

module.exports = conf
module.exports.load = async () => {
  const path = './conf.yml'
  if (fs.existsSync(path)) {
    const doc = yaml.load(fs.readFileSync(path, 'utf8'))
    if (!conf.get('school')) await initSchool(doc)
    return doc.users
  } else {
    console.log('No config file found')
  }
}

async function initSchool(doc) {
  const schoolId = doc.school
  let res = await fetch(
    `https://mobile.campushoy.com/v6/config/guest/tenant/info?ids=${schoolId}`
  ).catch(err => err)

  res = await JSON.parse(await res.text())

  const origin = new URL(res.data[0].ampUrl).origin
  const casOrigin = res.data[0].idsUrl
  const isSignAtHome = doc.home

  const school = {
    casOrigin,
    origin,
    isSignAtHome,
    login: `${casOrigin}/login?service=${encodeURIComponent(
      origin
    )}/portal/login`,
    campusphere: `${origin}/portal/login`,
    checkCaptcha: `${casOrigin}/checkNeedCaptcha.htl`,
    getCaptcha: `${casOrigin}/getCaptcha.htl`,
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
  console.log(
    `您的学校 ${schoolName} 已完成设定, 全局签到地址为：${
      school.addr ? school.addr : 'RANDOM'
    }`
  )
}
