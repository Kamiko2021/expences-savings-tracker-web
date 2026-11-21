const RELEASE_HOST = 'github.com'
const RELEASE_PATH = /^\/Kamiko2021\/expenses_debt_saving_tracker\/releases\/download\/[^/]+\/[^/]+\.apk$/

export const validateAndroidReleaseUrl = (value) => {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Remote Config update_url must be a valid HTTPS APK release URL.')
  }

  if (
    url.protocol !== 'https:'
    || url.hostname !== RELEASE_HOST
    || url.username
    || url.password
    || url.search
    || url.hash
    || !RELEASE_PATH.test(url.pathname)
  ) {
    throw new Error('Remote Config update_url must point to an APK in the configured GitHub releases.')
  }

  return url.href
}
