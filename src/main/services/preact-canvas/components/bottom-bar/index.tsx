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
import { Component, h } from "preact";
import { isFeaturePhone } from "src/main/utils/static-display";
import { bind } from "src/utils/bind";
import { Back, Fullscreen, Information } from "../icons/initial";
import {
  bottomBar,
  checkbox,
  fpToggle,
  fullscreen,
  hidden,
  leftIcon,
  leftKeyIcon,
  leftToggleLabel,
  noFullscreen,
  rightToggleLabel,
  shortcutKey,
  toggle,
  toggleContainer,
  toggleLabel
} from "./style.css";

// WARNING: This module is part of the main bundle. Avoid adding to it if possible.

function goFullscreen() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen();
  } else if (document.documentElement.webkitRequestFullscreen) {
    document.documentElement.webkitRequestFullscreen();
  }
}

const fullscreenSupported: boolean = !!(
  document.documentElement.requestFullscreen ||
  document.documentElement.webkitRequestFullscreen
);

export interface Props {
  onSettingsClick: () => void;
  onBackClick: () => void;
  onDangerModeChange: (newSetting: boolean) => void;
  buttonType: "back" | "info";
  display: boolean;
  dangerMode: boolean;
  showDangerModeToggle: boolean;
}

export interface State {
  flagModeAnnouncement: string;
}

export default class BottomBar extends Component<Props, State> {
  state: State = {
    flagModeAnnouncement: ""
  };

  private _flagCheckbox?: HTMLInputElement;

  render(
    {
      onSettingsClick,
      onBackClick,
      buttonType,
      display,
      showDangerModeToggle,
      dangerMode
    }: Props,
    { flagModeAnnouncement }: State
  ) {
    const backBtn = isFeaturePhone ? (
      <button
        class={leftKeyIcon}
        onClick={onBackClick}
        aria-label="Back to main menu"
      >
        <span class={shortcutKey}>*</span> back
      </button>
    ) : (
      <button
        class={leftIcon}
        onClick={onBackClick}
        aria-label="Back to main menu"
      >
        <Back />
      </button>
    );

    const infoBtn = isFeaturePhone ? (
      <button
        class={leftKeyIcon}
        onClick={onSettingsClick}
        aria-label="Open information and settings"
      >
        <span class={shortcutKey}>*</span> info
      </button>
    ) : (
      <button
        class={leftIcon}
        onClick={onSettingsClick}
        aria-label="Open information and settings"
      >
        <Information />
      </button>
    );

    const toggleBtn = isFeaturePhone ? (
      <div class={fpToggle}>
        <span class={shortcutKey}>#</span>{" "}
        <label>
          <input
            class={checkbox}
            type="checkbox"
            role="switch checkbox"
            onChange={this._onDangerModeSwitchToggle}
            checked={!dangerMode}
            aria-label="flag mode"
            ref={el => (this._flagCheckbox = el)}
          />
          <span aria-hidden="true">Flag:{dangerMode ? "OFF" : "ON"}</span>
        </label>
        <span
          role="status"
          aria-live="assertive"
          aria-label={flagModeAnnouncement}
        />
      </div>
    ) : (
      <div class={toggleContainer} onTouchStart={this._onDangerModeTouchStart}>
        <label class={toggleLabel}>
          <span aria-hidden="true" class={leftToggleLabel}>
            Clear
          </span>
          <input
            class={checkbox}
            type="checkbox"
            role="switch checkbox"
            onChange={this._onDangerModeSwitchToggle}
            checked={!dangerMode}
            aria-label="flag mode"
            ref={el => (this._flagCheckbox = el)}
          />
          <svg viewBox="0 0 32 16" class={toggle}>
            <defs>
              <mask id="flag-toggle-mask">
                <rect fill="#fff" x="0" y="0" width="32" height="16" />
                <circle cx={dangerMode ? 8 : 24} cy="8" fill="#000" r="4" />
              </mask>
            </defs>
            <rect
              fill="#fff"
              x="0"
              y="0"
              width="32"
              height="16"
              rx="8"
              ry="8"
              mask="url(#flag-toggle-mask)"
            />
          </svg>
          <span aria-hidden="true" class={rightToggleLabel}>
            Flag
          </span>
        </label>
        <span
          role="status"
          aria-live="assertive"
          aria-label={flagModeAnnouncement}
        />
      </div>
    );

    const fullscreenBtn = isFeaturePhone ? (
      ""
    ) : fullscreenSupported ? (
      <button
        class={fullscreen}
        onClick={goFullscreen}
        aria-label="fullscreen mode"
      >
        <Fullscreen />
      </button>
    ) : (
      <div class={noFullscreen} />
    );
    return (
      <div class={[bottomBar, display ? "" : hidden].join(" ")} role="menubar">
        {buttonType === "back" ? backBtn : infoBtn}
        {showDangerModeToggle && toggleBtn}
        {fullscreenSupported ? fullscreenBtn : <div class={noFullscreen} />}
      </div>
    );
  }

  componentDidMount() {
    window.addEventListener("keyup", this._onKeyUp);
  }

  componentWillUnmount() {
    window.removeEventListener("keyup", this._onKeyUp);
  }

  @bind
  private _onKeyUp(event: KeyboardEvent) {
    if (event.key === "*") {
      if (this.props.buttonType === "back") {
        this.props.onBackClick();
      } else {
        this.props.onSettingsClick();
      }
    } else if (
      this.props.showDangerModeToggle &&
      (event.key === "f" || event.key === "#" || event.key === "m")
    ) {
      this._dangerModeChange(!this.props.dangerMode, true);
    }
  }

  private _dangerModeChange(newVal: boolean, announce: boolean) {
    this.props.onDangerModeChange(newVal);

    // We need to clear the announcement when the input is interacted with, so if we need to
    // announce a change later, we aren't setting it to the same value it already has (which would
    // mean no announcement).
    let flagModeAnnouncement = "";

    if (announce) {
      flagModeAnnouncement = newVal ? "flag mode off" : "flag mode on";
    }

    this.setState({ flagModeAnnouncement });
  }

  @bind
  private _onDangerModeTouchStart(event: TouchEvent) {
    event.preventDefault();
    this._dangerModeChange(this._flagCheckbox!.checked, true);
  }

  @bind
  private _onDangerModeSwitchToggle() {
    this._dangerModeChange(!this._flagCheckbox!.checked, false);
  }
}
