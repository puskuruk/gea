import { Component } from '@geajs/core'
import pwa from './pwa-store'

export default class App extends Component {
  created() {
    pwa.register()
  }

  template() {
    return (
      <div id="pwa-app">
        <h1>Gea PWA Example</h1>

        <div id="status">
          <p id="online-status">Status: {pwa.isOnline ? 'Online' : 'Offline'}</p>
          {pwa.registrationError && (
            <p id="sw-error">SW Error: {pwa.registrationError}</p>
          )}
        </div>

        {pwa.hasUpdate && (
          <button id="update-btn" click={pwa.applyUpdate}>
            Update available — click to refresh
          </button>
        )}

        {pwa.isInstallable && (
          <button id="install-btn" click={pwa.promptInstall}>
            Install App
          </button>
        )}

        <p id="installed-status">Installed: {pwa.isInstalled ? 'Yes' : 'No'}</p>
      </div>
    )
  }
}

const app = new App()
app.render(document.getElementById('app'))
