import { installDom } from '../../../tests/helpers/jsdom-setup'

if (typeof globalThis.document === 'undefined') {
  installDom()
}
