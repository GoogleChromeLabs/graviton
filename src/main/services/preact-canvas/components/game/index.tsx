/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Remote } from "comlink/src/comlink";
import { Component, h } from "preact";
import { Animator } from "src/main/rendering/animator";
import { Renderer } from "src/main/rendering/renderer";
import { GameChangeCallback } from "src/main/services/preact-canvas";
import { submitTime } from "src/main/services/state/best-times";
import { supportsVibration } from "src/main/services/state/vibration-preference";
import { vibrationLength } from "src/main/utils/constants";
import { isFeaturePhone } from "src/main/utils/static-display";
import { bind } from "src/utils/bind";
import { StateChange } from "src/worker/gamelogic";
import { Cell, PlayMode } from "src/worker/gamelogic/types";
import StateService from "src/worker/state-service";
import initFocusHandling from "../../../../utils/focus-visible";
import Board from "../board";
import TopBar from "../top-bar";
import Win from "../win";
import {
  againButton,
  againShortcutKey,
  exitRow,
  exitRowInner,
  game as gameClass,
  mainButton,
  shortcutKey
} from "./style.css";

export interface Props {
  stateService: Remote<StateService>;
  width: number;
  height: number;
  mines: number;
  gameChangeSubscribe: (f: GameChangeCallback) => void;
  gameChangeUnsubscribe: (f: GameChangeCallback) => void;
  onDangerModeChange: (v: boolean) => void;
  dangerMode: boolean;
  toRevealTotal: number;
  useMotion: boolean;
  bestTime?: number;
  useVibration: boolean;
}

interface State {
  playMode: PlayMode;
  toReveal: number;
  startTime: number;
  hiddenTime: number;
  // This should always be set as we prevent the game from starting until the
  // renderer is loaded.
  renderer?: Renderer;
  animator?: Animator;
  completeTime: number;
  bestTime: number;
}

// The second this file is loaded, activate focus handling
initFocusHandling();

export default class Game extends Component<Props, State> {
  state: State;
  private _tryAgainBtn?: HTMLButtonElement;
  private _intervalId?: number;

  constructor(props: Props) {
    super(props);
    this.state = {
      playMode: PlayMode.Pending,
      toReveal: props.toRevealTotal,
      startTime: 0,
      hiddenTime: 0,
      completeTime: 0,
      bestTime: 0
    };

    this._init();
  }

  render(
    {
      dangerMode,
      width,
      height,
      mines,
      gameChangeSubscribe,
      gameChangeUnsubscribe,
      toRevealTotal,
      useMotion,
      bestTime: previousBestTime
    }: Props,
    { playMode, toReveal, animator, renderer, completeTime, bestTime }: State
  ) {
    const timerRunning = playMode === PlayMode.Playing;

    return (
      <div class={gameClass}>
        <TopBar
          time={completeTime}
          timerRunning={timerRunning}
          toReveal={toReveal}
          toRevealTotal={toRevealTotal}
          playMode={playMode}
          useMotion={useMotion}
          bestTime={previousBestTime}
          showBestTime={playMode === PlayMode.Pending}
        />
        {playMode === PlayMode.Won ? (
          <Win
            onMainMenu={this.onReset}
            onRestart={this.onRestart}
            time={completeTime}
            bestTime={bestTime}
            width={width}
            height={height}
            mines={mines}
            useMotion={this.props.useMotion}
          />
        ) : renderer && animator ? (
          [
            <Board
              width={width}
              height={height}
              dangerMode={dangerMode}
              animator={animator}
              renderer={renderer}
              gameChangeSubscribe={gameChangeSubscribe}
              gameChangeUnsubscribe={gameChangeUnsubscribe}
              onCellClick={this.onCellClick}
              onDangerModeChange={this.props.onDangerModeChange}
            />,
            playMode === PlayMode.Lost ? (
              <div class={exitRow}>
                <div class={exitRowInner}>
                  <button
                    class={againButton}
                    onClick={this.onRestart}
                    ref={el => (this._tryAgainBtn = el)}
                  >
                    {isFeaturePhone && (
                      <span class={[shortcutKey, againShortcutKey].join(" ")}>
                        #
                      </span>
                    )}{" "}
                    Try again
                  </button>
                  <button class={mainButton} onClick={this.onReset}>
                    {isFeaturePhone ? <span class={shortcutKey}>*</span> : ""}{" "}
                    Main menu
                  </button>
                </div>
              </div>
            ) : (
              undefined
            )
          ]
        ) : (
          <div />
        )}
      </div>
    );
  }

  componentDidMount() {
    this.props.gameChangeSubscribe(this.onGameChange);
    if (!this.props.dangerMode) {
      this.props.onDangerModeChange(true);
    }
    window.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  componentWillUnmount() {
    this.props.gameChangeUnsubscribe(this.onGameChange);
    this.stopTimer();
    window.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
  }

  componentDidUpdate(_: Props, previousState: State) {
    if (
      this.state.playMode === PlayMode.Lost &&
      previousState.playMode !== PlayMode.Lost &&
      this._tryAgainBtn
    ) {
      this._tryAgainBtn.focus();
      if (this.props.useVibration && supportsVibration) {
        navigator.vibrate(vibrationLength);
      }
    }
  }

  @bind
  private onVisibilityChange() {
    if (this.state.playMode !== PlayMode.Playing) {
      return;
    }

    const newState: Partial<State> = {};
    if (document.visibilityState === "hidden") {
      newState.hiddenTime = Date.now();
      this.stopTimer();
    } else {
      const { startTime, hiddenTime } = this.state;
      newState.startTime = startTime + Date.now() - hiddenTime;
      newState.completeTime = Date.now() - newState.startTime;
      this.startTimer();
    }

    this.setState(newState as State);
  }

  private async _init() {
    let renderer: Renderer;
    let animator: Animator;

    if (this.props.useMotion) {
      // tslint:disable-next-line:variable-name
      const [RendererClass, AnimatorClass] = await Promise.all([
        import("src/main/rendering/webgl-renderer").then(m => m.default),
        import("src/main/rendering/motion-animator").then(m => m.default)
      ]);
      renderer = new RendererClass();
      animator = new AnimatorClass(
        this.props.width,
        this.props.height,
        renderer
      );
    } else {
      // tslint:disable-next-line:variable-name
      const [RendererClass, AnimatorClass] = await Promise.all([
        import("src/main/rendering/canvas-2d-renderer").then(m => m.default),
        import("src/main/rendering/no-motion-animator").then(m => m.default)
      ]);
      renderer = new RendererClass();
      animator = new AnimatorClass(
        this.props.width,
        this.props.height,
        renderer
      );
    }

    this.setState({ renderer, animator });
  }

  @bind
  private onKeyUp(event: KeyboardEvent) {
    if (event.key === "#") {
      if (this.state.playMode === PlayMode.Lost) {
        this.onRestart();
      }
    } else if (event.key === "*") {
      this.onReset();
    }
  }

  @bind
  private onReset() {
    this.props.stateService.reset();
  }

  @bind
  private onRestart() {
    this.props.stateService.restart();
  }

  @bind
  private async onGameChange(gameChange: StateChange) {
    const newState: Partial<State> = {};

    if (
      "playMode" in gameChange &&
      this.state.playMode !== gameChange.playMode
    ) {
      newState.playMode = gameChange.playMode;

      switch (gameChange.playMode!) {
        case PlayMode.Playing:
          newState.startTime = Date.now();
          this.startTimer();
          break;

        case PlayMode.Won:
          newState.completeTime = Date.now() - this.state.startTime;
          newState.bestTime = await submitTime(
            this.props.width,
            this.props.height,
            this.props.mines,
            newState.completeTime
          );
          this.props.onDangerModeChange(false);

        /* fall through */
        case PlayMode.Lost:
          this.stopTimer();
          break;
      }
    }

    if (
      "toReveal" in gameChange &&
      this.state.toReveal !== gameChange.toReveal
    ) {
      newState.toReveal = gameChange.toReveal;
    }

    if (Object.keys(newState).length) {
      this.setState(newState as State);
    }
  }

  @bind
  private onCellClick(cellData: [number, number, Cell], alt: boolean) {
    if (
      this.state.playMode !== PlayMode.Pending &&
      this.state.playMode !== PlayMode.Playing
    ) {
      return;
    }
    const [x, y, cell] = cellData;
    let { dangerMode } = this.props;

    if (alt) {
      dangerMode = !dangerMode;
    }

    if (!cell.revealed) {
      if (!dangerMode) {
        if (cell.flagged) {
          this.props.stateService.unflag(x, y);
        } else {
          this.props.stateService.flag(x, y);
        }
      } else if (!cell.flagged) {
        this.props.stateService.reveal(x, y);
      }
    } else if (cell.touchingFlags >= cell.touchingMines) {
      this.props.stateService.revealSurrounding(x, y);
    }
  }

  private startTimer() {
    this._intervalId = setInterval(() => this.updateCompleteTime(), 1000);
  }

  private stopTimer() {
    clearInterval(this._intervalId);
  }

  private updateCompleteTime() {
    const newState: Partial<State> = {
      completeTime: Date.now() - this.state.startTime
    };
    this.setState(newState as State);
  }
}
