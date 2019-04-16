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
import { Timer } from "../icons";
import { squaresLeft, time, timeIcon, title, topBar } from "./style.css";

export interface Props {
  toRevealTotal: number;
  toReveal: number;
}

export interface State {}

export default class TopBar extends Component<Props, State> {
  render({ toReveal, toRevealTotal }: Props) {
    return (
      <div class={topBar}>
        <h1 class={title}>Graviton</h1>
        <div class={squaresLeft}>
          {toReveal}/{toRevealTotal}
        </div>
        <div class={time}>
          00:00 <Timer class={timeIcon} />
        </div>
      </div>
    );
  }
}
