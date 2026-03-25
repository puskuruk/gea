import { Component } from '@geajs/core'

export default class Home extends Component {
  template() {
    return (
      <div class="view">
        <h1>Home</h1>
        <p>Welcome to the Gea Router simple example. Use the navigation above to browse between pages.</p>
        <p>
          This example demonstrates flat routing with no layouts or guards — just paths mapped directly to components.
        </p>
      </div>
    )
  }
}
