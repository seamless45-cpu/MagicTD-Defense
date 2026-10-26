import { Component, createRef, type ReactNode } from "react";

/**
 * Slide transition between top-level screens.
 *
 * The incoming screen slides in from outside the right edge (`screenSlideIn`).
 * The outgoing screen is kept as a visual-only copy that slides out past the
 * left edge (`screenSlideOut`) and is removed when the animation ends. The copy
 * is made in getSnapshotBeforeUpdate, while the old DOM is still mounted, so
 * React state and handlers are not involved: the ghost is inert and
 * pointer-events are off.
 */
export class ScreenStage extends Component<{ screenKey: string; children: ReactNode }> {
  private host = createRef<HTMLDivElement>();
  private ghost: HTMLElement | null = null;
  private timer = 0;

  getSnapshotBeforeUpdate(prev: { screenKey: string }): HTMLElement | null {
    if (prev.screenKey === this.props.screenKey) return null;
    const first = this.host.current?.firstElementChild as HTMLElement | null;
    if (!first) return null;
    return first.cloneNode(true) as HTMLElement;
  }

  componentDidUpdate(prev: { screenKey: string }, _state: unknown, snapshot: HTMLElement | null) {
    if (!snapshot || prev.screenKey === this.props.screenKey) return;
    const host = this.host.current;
    if (!host) return;
    this.clearGhost();
    // drop the entrance class so the copy does not replay the enter animation
    snapshot.classList.remove("screen-enter");
    snapshot.classList.add("screen-exit");
    snapshot.setAttribute("aria-hidden", "true");
    snapshot.removeAttribute("data-testid");
    host.appendChild(snapshot);
    this.ghost = snapshot;
    this.timer = window.setTimeout(this.clearGhost, 420);
  }

  componentWillUnmount() {
    this.clearGhost();
  }

  private clearGhost = () => {
    window.clearTimeout(this.timer);
    this.ghost?.remove();
    this.ghost = null;
  };

  render() {
    return (
      <div ref={this.host} className="screen-stage h-full">
        {this.props.children}
      </div>
    );
  }
}
