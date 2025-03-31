import { ComponentClass, Component } from "react";

function decorated(target: ComponentClass) {
  const original = target.prototype.render;

  target.prototype.render = () => {
    return <div>Hello {original()}</div>;
  };
}

@decorated
export class App extends Component {
  render() {
    return <span>World</span>;
  }
}
