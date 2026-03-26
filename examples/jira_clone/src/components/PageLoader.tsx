import { Component } from '@geajs/core'
import Spinner from './Spinner'

export default class PageLoader extends Component {
  template() {
    return (
      <div class="page-loader">
        <Spinner size={50} />
      </div>
    )
  }
}
