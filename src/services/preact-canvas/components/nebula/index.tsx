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

import { bind } from "../../../../utils/bind.js";

import ShaderBox from "../../../../utils/shaderbox.js";
import {
  dangerMode as dangerModeStyle,
  nebula as nebulaStyle,
  notDangerMode as notDangerModeStyle
} from "./style.css";

// @ts-ignore
import fragmentShader from "./fragment.glsl";

// @ts-ignore
import vertexShader from "./vertex.glsl";

export interface Props {
  dangerMode: boolean;
}

interface State {
  dangerModeBlend: number;
}

export default class Nebula extends Component<Props, State> {
  timePeriod = 60000;

  private _shaderBox?: ShaderBox;
  private _loopRunning = false;

  componentDidMount() {
    this._shaderBox = new ShaderBox(vertexShader, fragmentShader, {
      canvas: this.base as HTMLCanvasElement,
      scaling: 1 / 5,
      uniforms: [
        "danger_mode",
        "time",
        "nebula_movement_range",
        "nebula_zoom",
        "vortex_strength",
        "circle1_offset",
        "circle2_offset",
        "circle3_offset"
      ]
    });
    if (!this._shaderBox) {
      return;
    }
    this._shaderBox.setUniform1f("danger_mode", 0);
    this._shaderBox.setUniform1f("nebula_movement_range", 2);
    this._shaderBox.setUniform1f("nebula_zoom", 1);
    this._shaderBox.setUniform1f("vortex_strength", 0.1);
    this._shaderBox.setUniform1f("circle1_offset", 0.7);
    this._shaderBox.setUniform1f("circle2_offset", 2.7);
    this._shaderBox.setUniform1f("circle3_offset", 1.5);
    this._onResize();

    window.addEventListener("resize", this._onResize);
    this.start();

    if (self.debug) {
      self.debug.then(debug => debug.nebula(this, this._shaderBox!));
    }
  }

  start() {
    this._loopRunning = true;
    requestAnimationFrame(this._loop);
  }

  stop() {
    this._loopRunning = false;
  }

  componentWillUnmount() {
    if (!this._shaderBox) {
      return;
    }
    this.stop();
    window.removeEventListener("resize", this._onResize);
  }

  render({ dangerMode }: Props) {
    return (
      <canvas
        class={`${nebulaStyle} ${
          dangerMode ? dangerModeStyle : notDangerModeStyle
        }`}
      />
    );
  }

  @bind
  private _onResize() {
    if (!this._shaderBox) {
      return;
    }
    this._shaderBox.resize();
  }

  @bind
  private _loop(ts: number) {
    this._shaderBox!.setUniform1f(
      "time",
      (ts % this.timePeriod) / this.timePeriod
    );
    this._shaderBox!.draw();
    if (this._loopRunning) {
      requestAnimationFrame(this._loop);
    }
  }
}