import { fetchAndActivate, getRemoteConfig, getString } from 'firebase/remote-config'
import { auth } from './firebase'
import { validateAndroidReleaseUrl } from './releaseUrl'

const remoteConfig = getRemoteConfig(auth.app)

remoteConfig.settings.minimumFetchIntervalMillis = 60 * 60 * 1000
remoteConfig.defaultConfig = {
  update_url: '',
  latest_version_code: '0',
}

export const loadAppReleaseInfo = async () => {
  await fetchAndActivate(remoteConfig)
  const configuredUpdateUrl = getString(remoteConfig, 'update_url').trim()
  const updateUrl = configuredUpdateUrl ? validateAndroidReleaseUrl(configuredUpdateUrl) : ''
  const versionCode = Number.parseInt(getString(remoteConfig, 'latest_version_code'), 10)

  return {
    updateUrl,
    versionCode: Number.isFinite(versionCode) && versionCode > 0 ? versionCode : null,
  }
}
