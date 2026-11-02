// npm run apk — builds the Android test APK (debug-signed, for installing on the booth tablet).
//   1. type check, 2. web build in "android" mode (no service worker), 3. copy it into the
//   Capacitor Android project, 4. Gradle assembleDebug, 5. dist-apk/KernelPanic-<version>-debug.apk
// Needs Android Studio's SDK and a JDK 17–21 (Android Studio ships one); both are found
// automatically, or set ANDROID_HOME / JAVA_HOME.
import { execSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const ANDROID = join(ROOT, 'android')
const isWin = process.platform === 'win32'

function javaMajor(home) {
  try {
    const release = readFileSync(join(home, 'release'), 'utf8')
    const m = release.match(/JAVA_VERSION="(\d+)/)
    return m ? Number(m[1]) : 0
  } catch {
    return 0
  }
}

function findJdk() {
  const ok = (home) => home && javaMajor(home) >= 17 && javaMajor(home) <= 21
  if (ok(process.env.JAVA_HOME)) return process.env.JAVA_HOME
  const parents = isWin
    ? [
        'C:/Program Files/Android/openjdk',
        'C:/Program Files/Eclipse Adoptium',
        'C:/Program Files/Microsoft',
        'C:/Program Files/Java',
      ]
    : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines']
  const found = []
  for (const parent of parents) {
    if (!existsSync(parent)) continue
    for (const name of readdirSync(parent)) {
      for (const home of [join(parent, name), join(parent, name, 'Contents/Home')])
        if (ok(home)) found.push(home)
    }
  }
  // Android Studio's own JDK as a last resort
  for (const home of [
    'C:/Program Files/Android/Android Studio/jbr',
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  ])
    if (ok(home)) found.push(home)
  found.sort((a, b) => javaMajor(b) - javaMajor(a))
  if (!found.length)
    throw new Error('JDK 17–21 bulunamadı. Android Studio kurun ya da JAVA_HOME ayarlayın.')
  return found[0]
}

function findSdk() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    isWin && process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android/Sdk'),
    process.env.HOME && join(process.env.HOME, 'Library/Android/sdk'),
    process.env.HOME && join(process.env.HOME, 'Android/Sdk'),
  ]
  const sdk = candidates.find((p) => p && existsSync(join(p, 'platforms')))
  if (!sdk)
    throw new Error('Android SDK bulunamadı. Android Studio kurun ya da ANDROID_HOME ayarlayın.')
  return sdk
}

const run = (cmd, opts = {}) => {
  console.log(`\n> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts })
}

const jdk = findJdk()
const sdk = findSdk()
console.log(`JDK ${javaMajor(jdk)}: ${jdk}\nAndroid SDK: ${sdk}`)
writeFileSync(join(ANDROID, 'local.properties'), `sdk.dir=${sdk.replace(/\\/g, '/')}\n`)

run('npx tsc -b')
run('npx vite build --mode android')
run('npx cap sync android')
const env = { ...process.env, JAVA_HOME: jdk, ANDROID_HOME: sdk }
const gradlew = join(ANDROID, isWin ? 'gradlew.bat' : 'gradlew')
run(`"${gradlew}" assembleDebug`, { cwd: ANDROID, env })

const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version
const out = join(ROOT, 'dist-apk')
mkdirSync(out, { recursive: true })
const apk = join(out, `KernelPanic-${version}-debug.apk`)
copyFileSync(join(ANDROID, 'app/build/outputs/apk/debug/app-debug.apk'), apk)
console.log(`\nAPK hazır: ${apk}`)
